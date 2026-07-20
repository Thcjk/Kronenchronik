/**
 * Dynastie-Simulation Phase 4 – Alter, Heirat, Kinder, Hof, Titel
 */
import {
  ageCharacter,
  applyEducationTick,
  computeTitle,
  councilAdvice,
  createChild,
  crownForRank,
  emptyCouncil,
  enrichCharacter,
  generateSpouseCandidate,
  lifeStageFromAge,
  makeChronicle,
  marry,
  nextTitleHint,
  rollCourtVisitor,
  rollImmersionEvent,
  syncRulerHeir,
  tryRulerDeath,
  visitorKindLabel,
  yearFromTick,
  type CharacterProfile,
  type ChronicleEntry,
  type CouncilSlot,
  type CourtVisitor,
  type DynastyMeta,
  type EducationFocus,
  type MarriageRecord,
  type PendingWorldEvent,
  type TitleState,
} from '@kronenchronik/shared';

export interface DynastySimState {
  meta: DynastyMeta;
  characters: CharacterProfile[];
  marriages: MarriageRecord[];
  council: CouncilSlot[];
  visitors: CourtVisitor[];
  title: TitleState;
  spouseCandidates: CharacterProfile[];
}

export function migrateDynastyState(input: {
  dynastyId: string;
  dynastyName: string;
  motto: string | null;
  characters: Array<Record<string, unknown>>;
  tickCount: number;
  birthPlace: string;
  existing?: Partial<DynastySimState>;
}): DynastySimState {
  const year = yearFromTick(input.tickCount);
  let characters: CharacterProfile[];
  if (input.existing?.characters && input.existing.characters.length > 0) {
    characters = input.existing.characters.map((c) =>
      enrichCharacter(c, {
        dynastyName: input.dynastyName,
        birthPlace: input.birthPlace,
        year,
      }),
    );
  } else {
    characters = input.characters.map((c) =>
      enrichCharacter(c as Parameters<typeof enrichCharacter>[0], {
        dynastyName: input.dynastyName,
        birthPlace: input.birthPlace,
        year,
      }),
    );
  }
  const synced = syncRulerHeir(characters);
  const title = input.existing?.title ?? {
    rank: 'graf',
    formalTitle: `Graf von ${input.dynastyName.replace(/^Haus\s+/i, '')}`,
    provinceThreshold: 1,
  };
  return {
    meta: input.existing?.meta ?? {
      id: input.dynastyId,
      name: input.dynastyName,
      motto: input.motto,
      coatSeed: input.dynastyName,
      prestige: synced.ruler?.prestige ?? 0,
      renown: 0,
      foundedYear: year - (synced.ruler?.age ?? 28),
      famousMembers: synced.ruler ? [synced.ruler.name] : [],
    },
    characters: synced.characters,
    marriages: input.existing?.marriages ?? [],
    council: input.existing?.council?.length ? input.existing.council : emptyCouncil(),
    visitors: input.existing?.visitors ?? [],
    title,
    spouseCandidates: input.existing?.spouseCandidates ?? [],
  };
}

export function runDynastyTick(opts: {
  state: DynastySimState;
  tickCount: number;
  provinceCount: number;
  fame: number;
  kingdomName: string;
  capitalName: string;
  pendingEvents: PendingWorldEvent[];
}): {
  state: DynastySimState;
  chronicle: ChronicleEntry[];
  successionMsg?: string;
  newEvents: PendingWorldEvent[];
} {
  const chronicle: ChronicleEntry[] = [];
  const year = yearFromTick(opts.tickCount);
  const state = { ...opts.state, characters: [...opts.state.characters] };
  const newEvents: PendingWorldEvent[] = [];

  // Titel aktualisieren
  const prevRank = state.title.rank;
  state.title = computeTitle(opts.provinceCount, opts.fame, opts.kingdomName);
  if (state.title.rank !== prevRank) {
    const ruler = state.characters.find((c) => c.isRuler);
    if (ruler) {
      ruler.title = state.title.formalTitle;
      ruler.appearance = {
        ...ruler.appearance,
        crown: crownForRank(state.title.rank),
        portrait: state.title.rank === 'kaiser' || state.title.rank === 'koenig' ? '👑' : ruler.appearance.portrait,
      };
      ruler.prestige += 20;
      chronicle.push(
        makeChronicle(
          opts.tickCount,
          'coronation',
          `Erhebung zum ${state.title.formalTitle.split(' ')[0]}`,
          `${ruler.name} wird ${state.title.formalTitle}.`,
        ),
      );
    }
  }

  // Alle 10 Ticks: Altern
  if (opts.tickCount % 10 === 0) {
    state.characters = state.characters.map((c) => {
      if (!c.isAlive) return c;
      let next = ageCharacter(c);
      next = applyEducationTick(next);
      // Coming of age
      if (c.age === 15 && next.age === 16) {
        next.experience += 10;
        next.prestige += 5;
        chronicle.push(
          makeChronicle(
            opts.tickCount,
            'birth',
            'Volljährigkeit',
            `${next.name} ist erwachsen geworden (${next.lifeStage}).`,
          ),
        );
      }
      return next;
    });

    // Herrscher-Tod?
    const ruler = state.characters.find((c) => c.isRuler && c.isAlive);
    if (ruler && tryRulerDeath(ruler)) {
      ruler.isAlive = false;
      ruler.isRuler = false;
      const synced = syncRulerHeir(state.characters);
      state.characters = synced.characters;
      if (synced.ruler) {
        synced.ruler.prestige += 10;
        synced.ruler.stress += 15;
        synced.ruler.title = state.title.formalTitle;
        chronicle.push(
          makeChronicle(
            opts.tickCount,
            'succession',
            'Thronfolge',
            `${ruler.name} starb im Alter von ${ruler.age}. ${synced.ruler.name} übernimmt den Thron – mit Freude und Trauer.`,
          ),
        );
        // Neues Kind als potenzieller Erbe wenn keiner
        if (!synced.heir) {
          const child = createChild({
            dynastyName: state.meta.name,
            lastName: synced.ruler.lastName,
            fatherId: synced.ruler.id,
            birthPlace: opts.capitalName,
            year,
            culture: synced.ruler.culture,
            religion: synced.ruler.religion,
          });
          child.age = 5;
          child.lifeStage = lifeStageFromAge(5);
          child.isHeir = true;
          state.characters.push(child);
          synced.ruler.childrenIds = [...(synced.ruler.childrenIds ?? []), child.id];
          chronicle.push(
            makeChronicle(opts.tickCount, 'birth', 'Junges Erbe', `${child.name} wird als Erbe bestimmt.`),
          );
        }
        state.meta.famousMembers = [...new Set([...state.meta.famousMembers, ruler.name, synced.ruler.name])].slice(-12);
        const again = syncRulerHeir(state.characters);
        state.characters = again.characters;
        return {
          state,
          chronicle,
          successionMsg: `${ruler.name} ist tot. ${again.ruler?.name ?? 'Ein Erbe'} besteigt den Thron.`,
          newEvents,
        };
      }
    }

    // Chance auf Geburt wenn verheiratet
    const r = state.characters.find((c) => c.isRuler && c.isAlive);
    if (r?.spouseId && Math.random() < 0.28) {
      const spouse = state.characters.find((c) => c.id === r.spouseId);
      const child = createChild({
        dynastyName: state.meta.name,
        lastName: r.lastName,
        fatherId: r.id,
        motherId: spouse?.id,
        birthPlace: opts.capitalName,
        year,
        culture: r.culture,
        religion: r.religion,
      });
      r.childrenIds = [...(r.childrenIds ?? []), child.id];
      if (spouse) spouse.childrenIds = [...(spouse.childrenIds ?? []), child.id];
      state.characters.push(child);
      // Erster Sohn oft Erbe
      const synced = syncRulerHeir(state.characters);
      state.characters = synced.characters;
      chronicle.push(
        makeChronicle(
          opts.tickCount,
          'birth',
          'Geburt',
          `${child.firstName} wird in ${opts.capitalName} geboren. Die Dynastie ${state.meta.name} jubelt.`,
        ),
      );
    }
  }

  // Hofbesucher
  state.visitors = state.visitors.filter((v) => v.expiresTick > opts.tickCount);
  if (state.visitors.length < 3) {
    const v = rollCourtVisitor(opts.tickCount);
    if (v) {
      state.visitors = [...state.visitors, v];
      chronicle.push(
        makeChronicle(
          opts.tickCount,
          'event',
          `${visitorKindLabel(v.kind)} am Hof`,
          `${v.name}: ${v.description}`,
        ),
      );
    }
  }

  // Immersion-Events wenn kein pending
  if (opts.pendingEvents.length === 0) {
    const ev = rollImmersionEvent(opts.tickCount);
    if (ev) newEvents.push(ev);
  }

  // Meta prestige
  const rulerNow = state.characters.find((c) => c.isRuler);
  if (rulerNow) {
    state.meta.prestige = Math.max(state.meta.prestige, rulerNow.prestige);
    state.meta.renown = Math.floor(state.meta.prestige / 2 + opts.fame / 3);
  }

  return { state, chronicle, newEvents };
}

export function setEducation(
  state: DynastySimState,
  characterId: string,
  focus: EducationFocus,
): DynastySimState {
  return {
    ...state,
    characters: state.characters.map((c) =>
      c.id === characterId && c.age < 16 ? { ...c, education: focus, educationProgress: 0 } : c,
    ),
  };
}

export function arrangeMarriage(
  state: DynastySimState,
  rulerId: string,
  candidateId: string,
  tick: number,
): { state: DynastySimState; entry: ChronicleEntry } | { error: string } {
  const ruler = state.characters.find((c) => c.id === rulerId);
  const candidate =
    state.characters.find((c) => c.id === candidateId) ??
    state.spouseCandidates.find((c) => c.id === candidateId);
  if (!ruler || !ruler.isAlive) return { error: 'Herrscher nicht gefunden' };
  if (ruler.spouseId) return { error: 'Bereits verheiratet' };
  if (!candidate) return { error: 'Partner nicht gefunden' };
  const year = yearFromTick(tick);
  const result = marry(ruler, candidate, year);
  result.entry.tick = tick;
  let characters = state.characters.map((c) => (c.id === ruler.id ? result.a : c));
  if (state.characters.some((c) => c.id === candidate.id)) {
    characters = characters.map((c) => (c.id === candidate.id ? result.b : c));
  } else {
    characters = [...characters, result.b];
  }
  return {
    state: {
      ...state,
      characters,
      marriages: [...state.marriages, result.record],
      spouseCandidates: state.spouseCandidates.filter((c) => c.id !== candidate.id),
      meta: {
        ...state.meta,
        prestige: state.meta.prestige + result.record.prestigeGain,
      },
    },
    entry: result.entry,
  };
}

export function refreshSpouseCandidates(state: DynastySimState, tick: number, capital: string): DynastySimState {
  if (state.spouseCandidates.length >= 2) return state;
  const year = yearFromTick(tick);
  const c = generateSpouseCandidate(state.meta.name, year, capital);
  return { ...state, spouseCandidates: [...state.spouseCandidates, c].slice(-3) };
}

export function assignCouncil(
  state: DynastySimState,
  role: CouncilSlot['role'],
  characterId: string | null,
): DynastySimState {
  return {
    ...state,
    council: state.council.map((s) => (s.role === role ? { ...s, characterId } : s)),
    characters: state.characters.map((c) => {
      if (characterId && c.id === characterId) return { ...c, councilRole: role };
      if (c.councilRole === role) return { ...c, councilRole: null };
      return c;
    }),
  };
}

export function getCouncilSuggestions(state: DynastySimState): Array<{ role: string; label: string; advice: string }> {
  return state.council
    .filter((s) => s.characterId)
    .map((s) => {
      const c = state.characters.find((x) => x.id === s.characterId);
      return {
        role: s.role,
        label: s.label,
        advice: councilAdvice(s.role, c?.loyalty ?? 50),
      };
    });
}

export function titleProgressHint(_state: DynastySimState, provinces: number, fame: number): string | null {
  return nextTitleHint(provinces, fame);
}
