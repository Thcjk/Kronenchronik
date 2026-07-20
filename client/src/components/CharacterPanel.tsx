import type { DynastyInfo } from '../api/client';
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
};

interface Props {
  dynasty: DynastyInfo;
  compact?: boolean;
  onClose?: () => void;
  kingdomName?: string;
}

export default function CharacterPanel({ dynasty, compact, onClose, kingdomName }: Props) {
  const ruler = dynasty.ruler;
  if (!ruler) return null;

  const dynName = dynasty.dynasty?.name ?? `Haus ${ruler.name}`;
  const coat = coatFromName(dynName);

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
            👑
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
          <div className="text-[11px] text-parchment/70 mt-0.5">
            Graf von {kingdomName ?? 'der Grenze'} · {ruler.age} Jahre
          </div>
          {dynasty.dynasty?.motto && (
            <div className="text-[10px] italic text-gold/70 mt-1">„{dynasty.dynasty.motto}"</div>
          )}
          <div className="text-[10px] text-parchment/50 mt-1">
            Prestige {ruler.prestige ?? 0} · Einfluss —
          </div>
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
          <span>❤️ Gesundheit</span>
          <span className="text-gold">{ruler.health ?? 100}</span>
        </div>
      </div>

      {dynasty.heir && (
        <div className="mt-3 pt-2 border-t border-gold/20">
          <div className="text-[10px] text-parchment/50 font-display mb-1">Familie · Erbe</div>
          {compact ? (
            <div className="text-[11px] text-parchment/70">
              {dynasty.heir.name} ({dynasty.heir.age})
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="portrait-frame !w-10 !h-12 !text-base">🎖️</div>
              <div>
                <div className="text-sm font-display">{dynasty.heir.name}</div>
                <div className="text-[10px] text-parchment/50">
                  {dynasty.heir.age} Jahre · Krieg {dynasty.heir.martial}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
