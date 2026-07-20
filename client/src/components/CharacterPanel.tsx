import type { DynastyInfo, GameState } from '../api/client';
import { coatFromName } from '../lore/intro';

const TRAIT_LABELS: Record<string, string> = {
  mutig: 'Mutig',
  gerecht: 'Gerecht',
  grausam: 'Grausam',
  ehrlich: 'Ehrlich',
  gierig: 'Gierig',
  intelligent: 'Intelligent',
  charismatisch: 'Charismatisch',
  ehrgeizig: 'Ehrgeizig',
  loyal: 'Loyal',
  listig: 'Listig',
  tapfer: 'Tapfer',
  fromm: 'Fromm',
  feige: 'Feige',
  grosszuegig: 'Großzügig',
  luegner: 'Lügner',
  schuechtern: 'Schüchtern',
  unglaeubig: 'Ungläubig',
  faul: 'Faul',
  temperamentvoll: 'Temperamentvoll',
  geduldig: 'Geduldig',
  naiv: 'Naiv',
};

const STAGE: Record<string, string> = {
  baby: 'Säugling',
  child: 'Kind',
  youth: 'Jugendlicher',
  adult: 'Erwachsener',
  elder: 'Greis',
};

interface Props {
  dynasty: DynastyInfo;
  compact?: boolean;
  onClose?: () => void;
  kingdomName?: string;
  title?: GameState['title'];
  titleHint?: string | null;
}

export default function CharacterPanel({
  dynasty,
  compact,
  onClose,
  kingdomName,
  title,
  titleHint,
}: Props) {
  const ruler = dynasty.ruler;
  if (!ruler) return null;

  const dynName = dynasty.dynasty?.name ?? `Haus ${ruler.name}`;
  const coat = coatFromName(dynName);
  const formal = title?.formalTitle ?? ruler.title ?? `Graf von ${kingdomName ?? 'der Grenze'}`;
  const portrait = ruler.appearance?.portrait ?? '👑';

  return (
    <div className="panel parchment-frame p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="panel-header !mb-0 !pb-0 !border-0 flex-1">{dynName}</div>
        {onClose && (
          <button type="button" onClick={onClose} className="btn-secondary text-[10px] py-0.5 px-1.5">
            ✕
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1.5">
          <div className="portrait-frame portrait-frame-lg" title={ruler.name}>
            {portrait}
          </div>
          <div
            className="coat-of-arms coat-sm"
            style={{ background: `linear-gradient(145deg, ${coat.primary}, ${coat.secondary})` }}
            title="Wappen"
          >
            <span>{coat.emblem}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-gold text-base leading-tight">{ruler.name}</div>
          {ruler.nickname && (
            <div className="text-[10px] text-parchment/50">„{ruler.nickname}"</div>
          )}
          <div className="text-[11px] text-parchment/70 mt-0.5">
            {formal} · {ruler.age} Jahre
            {ruler.lifeStage ? ` · ${STAGE[ruler.lifeStage] ?? ruler.lifeStage}` : ''}
          </div>
          {dynasty.dynasty?.motto && (
            <div className="text-[10px] italic text-gold/70 mt-1">„{dynasty.dynasty.motto}"</div>
          )}
          <div className="text-[10px] text-parchment/50 mt-1">
            Prestige {ruler.prestige ?? 0} · Ruhm {ruler.renown ?? 0} · Stress {ruler.stress ?? 0}
          </div>
          {(ruler.culture || ruler.religion || ruler.birthPlace) && (
            <div className="text-[10px] text-parchment/40 mt-0.5">
              {[ruler.culture, ruler.religion, ruler.birthPlace ? `* ${ruler.birthPlace}` : null]
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
          {titleHint && <div className="text-[10px] text-amber-200/80 mt-1">{titleHint}</div>}
          {ruler.traits && ruler.traits.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {ruler.traits.map((t) => (
                <span key={t} className="trait-chip">
                  {TRAIT_LABELS[t] ?? t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-0.5">
        <div className="stat-row">
          <span>⚔️ Kriegskunst</span>
          <span className="text-gold">{ruler.martial}</span>
        </div>
        <div className="stat-row">
          <span>🤝 Diplomatie</span>
          <span className="text-gold">{ruler.diplomacy}</span>
        </div>
        <div className="stat-row">
          <span>📜 Verwaltung</span>
          <span className="text-gold">{ruler.stewardship}</span>
        </div>
        <div className="stat-row">
          <span>🕵️ Intrige</span>
          <span className="text-gold">{ruler.intrigue ?? 5}</span>
        </div>
        <div className="stat-row">
          <span>📚 Bildung</span>
          <span className="text-gold">{ruler.learning ?? 5}</span>
        </div>
        <div className="stat-row">
          <span>❤️ Gesundheit</span>
          <span className="text-gold">{ruler.health ?? 100}</span>
        </div>
        <div className="stat-row">
          <span>⚡ Energie</span>
          <span className="text-gold">{ruler.energy ?? 80}</span>
        </div>
      </div>

      {ruler.appearance && !compact && (
        <div className="mt-2 text-[10px] text-parchment/45">
          {ruler.appearance.hair} · {ruler.appearance.beard} · {ruler.appearance.clothing}
          {ruler.appearance.crown ? ` · ${ruler.appearance.crown}` : ''}
        </div>
      )}

      {dynasty.heir && (
        <div className="mt-3 pt-2 border-t border-gold/20">
          <div className="text-[10px] text-parchment/50 font-display mb-1">Familie · Erbe</div>
          <div className="text-[11px] text-parchment/70">
            {dynasty.heir.name} ({dynasty.heir.age}
            {dynasty.heir.education ? ` · Ausbildung: ${dynasty.heir.education}` : ''})
          </div>
          {(dynasty.characters?.length ?? 0) > 2 && (
            <div className="text-[10px] text-parchment/40 mt-1">
              {dynasty.characters.filter((c) => c.isAlive).length} lebende Familienmitglieder
            </div>
          )}
        </div>
      )}
    </div>
  );
}
