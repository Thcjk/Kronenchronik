/** Dynastie-Lebenszyklus: Alter, Heirat, Erziehung, Tod */

import { TRAITS, randomTraits } from './characters';
import { EXTRA_TRAITS, defaultAppearance, lifeStageFromAge, type CharacterProfile, type EducationFocus, type MarriageRecord } from './dynastyTypes';
import { cryptoRandomId, makeChronicle, type ChronicleEntry } from './worldState';
import { shouldRulerDieFromAge } from './dynasty';

const FIRST_M = ['Heinrich', 'Otto', 'Friedrich', 'Wilhelm', 'Konrad', 'Ludwig', 'Albrecht', 'Dietrich', 'Rupert', 'Siegfried'];
const FIRST_F = ['Mathilde', 'Adelheid', 'Hildegard', 'Kunigunde', 'Emma', 'Sophie', 'Agnes', 'Beatrix', 'Irmgard', 'Luitgard'];

export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: 'von Kronen' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function enrichCharacter(
  raw: Partial<CharacterProfile> & {
    id: string;
    name: string;
    age: number;
    isAlive: boolean;
    isRuler: boolean;
    isHeir: boolean;
    martial: number;
    diplomacy: number;
    stewardship: number;
  },
  opts: { dynastyName: string; birthPlace: string; year: number; culture?: string; religion?: string },
): CharacterProfile {
  const { firstName, lastName } = splitName(raw.name);
  const gender = (raw.gender as 'MALE' | 'FEMALE') ?? 'MALE';
  const age = raw.age;
  return {
    id: raw.id,
    firstName: raw.firstName ?? firstName,
    lastName: raw.lastName ?? lastName,
    name: raw.name,
    dynastyName: raw.dynastyName ?? opts.dynastyName,
    title: raw.title,
    nickname: raw.nickname,
    age,
    birthYear: raw.birthYear ?? opts.year - age,
    birthPlace: raw.birthPlace ?? opts.birthPlace,
    culture: raw.culture ?? opts.culture ?? 'germanisch',
    religion: raw.religion ?? opts.religion ?? 'lichtglaube',
    language: raw.language ?? 'Mittelhochdeutsch',
    gender,
    appearance: raw.appearance ?? defaultAppearance(gender, raw.isRuler),
    traits: raw.traits?.length ? [...raw.traits] : randomTraits(2),
    personality: raw.personality,
    experience: raw.experience ?? 0,
    prestige: raw.prestige ?? 0,
    renown: raw.renown ?? 0,
    influence: raw.influence ?? 0,
    health: raw.health ?? 90,
    energy: raw.energy ?? 80,
    stress: raw.stress ?? 10,
    martial: raw.martial,
    diplomacy: raw.diplomacy,
    stewardship: raw.stewardship,
    intrigue: raw.intrigue ?? 5,
    learning: raw.learning ?? 5,
    isAlive: raw.isAlive,
    isRuler: raw.isRuler,
    isHeir: raw.isHeir,
    lifeStage: raw.lifeStage ?? lifeStageFromAge(age),
    education: raw.education ?? (age < 16 ? 'war' : null),
    educationProgress: raw.educationProgress ?? 0,
    spouseId: raw.spouseId ?? null,
    fatherId: raw.fatherId ?? null,
    motherId: raw.motherId ?? null,
    childrenIds: raw.childrenIds ?? [],
    councilRole: raw.councilRole ?? null,
    loyalty: raw.loyalty ?? 70,
    opinionOfRuler: raw.opinionOfRuler ?? 50,
  };
}

export function createChild(opts: {
  dynastyName: string;
  lastName: string;
  fatherId: string;
  motherId?: string;
  birthPlace: string;
  year: number;
  culture: string;
  religion: string;
}): CharacterProfile {
  const gender: 'MALE' | 'FEMALE' = Math.random() < 0.5 ? 'MALE' : 'FEMALE';
  const firstName =
    gender === 'MALE'
      ? FIRST_M[Math.floor(Math.random() * FIRST_M.length)]
      : FIRST_F[Math.floor(Math.random() * FIRST_F.length)];
  const name = `${firstName} ${opts.lastName}`;
  return enrichCharacter(
    {
      id: cryptoRandomId(),
      name,
      firstName,
      lastName: opts.lastName,
      age: 0,
      gender,
      isAlive: true,
      isRuler: false,
      isHeir: false,
      martial: 2 + Math.floor(Math.random() * 3),
      diplomacy: 2 + Math.floor(Math.random() * 3),
      stewardship: 2 + Math.floor(Math.random() * 3),
      intrigue: 2,
      learning: 2,
      traits: randomTraits(1),
      fatherId: opts.fatherId,
      motherId: opts.motherId,
    },
    {
      dynastyName: opts.dynastyName,
      birthPlace: opts.birthPlace,
      year: opts.year,
      culture: opts.culture,
      religion: opts.religion,
    },
  );
}

export function applyEducationTick(c: CharacterProfile): CharacterProfile {
  if (!c.isAlive || c.age >= 16 || !c.education) return c;
  const next = { ...c, educationProgress: (c.educationProgress ?? 0) + 1 };
  if ((next.educationProgress ?? 0) >= 3) {
    next.educationProgress = 0;
    const focus = c.education as EducationFocus;
    if (focus === 'war') next.martial += 1;
    if (focus === 'diplomacy') next.diplomacy += 1;
    if (focus === 'stewardship') next.stewardship += 1;
    if (focus === 'intrigue') next.intrigue += 1;
    if (focus === 'learning') next.learning = (next.learning ?? 5) + 1;
    if (focus === 'faith') {
      next.diplomacy += 1;
      if (!next.traits.includes('fromm')) next.traits = [...next.traits, 'fromm'];
    }
    // Gelegentlich neue Eigenschaft
    if (Math.random() < 0.25) {
      const pool = [...TRAITS, ...EXTRA_TRAITS] as string[];
      const t = pool[Math.floor(Math.random() * pool.length)];
      if (!next.traits.includes(t)) next.traits = [...next.traits.slice(0, 4), t];
    }
  }
  return next;
}

export function ageCharacter(c: CharacterProfile): CharacterProfile {
  if (!c.isAlive) return c;
  const age = c.age + 1;
  let health = c.health;
  let energy = c.energy;
  const stress = c.stress;
  if (age >= 60) {
    health = Math.max(20, health - 2);
    energy = Math.max(20, energy - 2);
  }
  if (age >= 70) health = Math.max(10, health - 3);
  return {
    ...c,
    age,
    lifeStage: lifeStageFromAge(age),
    health,
    energy,
    stress: Math.min(100, Math.max(0, stress + (age > 50 ? 1 : 0) - 1)),
  };
}

export function tryRulerDeath(c: CharacterProfile): boolean {
  if (!c.isAlive) return false;
  if (c.health < 25 && Math.random() < 0.2) return true;
  return shouldRulerDieFromAge(c.age);
}

export function marry(
  a: CharacterProfile,
  b: CharacterProfile,
  year: number,
): { a: CharacterProfile; b: CharacterProfile; record: MarriageRecord; entry: ChronicleEntry } {
  const record: MarriageRecord = {
    id: cryptoRandomId(),
    spouseAId: a.id,
    spouseBId: b.id,
    year,
    prestigeGain: 15,
  };
  const na = {
    ...a,
    spouseId: b.id,
    prestige: a.prestige + 15,
    stress: Math.max(0, a.stress - 5),
  };
  const nb = {
    ...b,
    spouseId: a.id,
    prestige: b.prestige + 10,
    dynastyName: a.isRuler ? a.dynastyName : b.dynastyName,
  };
  const entry = makeChronicle(
    0,
    'birth',
    'Hochzeit',
    `${a.name} heiratet ${b.name}. Die Dynastie ${a.dynastyName} wächst.`,
  );
  entry.category = 'alliance';
  entry.year = year;
  return { a: na, b: nb, record, entry };
}

export function generateSpouseCandidate(dynastyName: string, year: number, birthPlace: string): CharacterProfile {
  const gender: 'MALE' | 'FEMALE' = 'FEMALE';
  const firstName = FIRST_F[Math.floor(Math.random() * FIRST_F.length)];
  const houses = ['von Nordheim', 'von Steinbruck', 'von Goldtal', 'von Westhain', 'di Mare'];
  const lastName = houses[Math.floor(Math.random() * houses.length)];
  return enrichCharacter(
    {
      id: cryptoRandomId(),
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      age: 18 + Math.floor(Math.random() * 10),
      gender,
      isAlive: true,
      isRuler: false,
      isHeir: false,
      martial: 4 + Math.floor(Math.random() * 5),
      diplomacy: 6 + Math.floor(Math.random() * 6),
      stewardship: 5 + Math.floor(Math.random() * 5),
      intrigue: 4 + Math.floor(Math.random() * 5),
      traits: randomTraits(2),
      loyalty: 65,
    },
    { dynastyName, birthPlace, year, culture: 'frankisch', religion: 'lichtglaube' },
  );
}

export function syncRulerHeir(characters: CharacterProfile[]): {
  characters: CharacterProfile[];
  ruler: CharacterProfile | null;
  heir: CharacterProfile | null;
} {
  const alive = characters.filter((c) => c.isAlive);
  let ruler = alive.find((c) => c.isRuler) ?? null;
  if (!ruler && alive.length) {
    ruler = { ...alive[0], isRuler: true, isHeir: false };
  }
  const others = alive.filter((c) => c.id !== ruler?.id);
  // Erbe: ältestes Kind des Herrschers, sonst ältester Nicht-Herrscher
  let heir: CharacterProfile | null = null;
  if (ruler) {
    const kids = others
      .filter((c) => c.fatherId === ruler!.id || c.motherId === ruler!.id)
      .sort((a, b) => b.age - a.age);
    heir = kids[0] ?? others.sort((a, b) => b.age - a.age)[0] ?? null;
  }
  const mapped = characters.map((c) => {
    if (!c.isAlive) return { ...c, isRuler: false, isHeir: false };
    if (ruler && c.id === ruler.id) return { ...ruler, ...c, isRuler: true, isHeir: false };
    if (heir && c.id === heir.id) return { ...c, isRuler: false, isHeir: true };
    return { ...c, isRuler: false, isHeir: false };
  });
  ruler = mapped.find((c) => c.isRuler) ?? null;
  heir = mapped.find((c) => c.isHeir) ?? null;
  return { characters: mapped, ruler, heir };
}
