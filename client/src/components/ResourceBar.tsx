import type { Resources } from '../api/client';
import type { FlowRates } from '../ui/resourceFlow';

const RESOURCE_LABELS: Array<{ key: keyof Resources; label: string; icon: string }> = [
  { key: 'gold', label: 'Gold', icon: '🪙' },
  { key: 'food', label: 'Nahrung', icon: '🌾' },
  { key: 'wood', label: 'Holz', icon: '🪵' },
  { key: 'stone', label: 'Stein', icon: '🪨' },
  { key: 'iron', label: 'Eisen', icon: '⚒️' },
  { key: 'influence', label: 'Einfluss', icon: '👑' },
  { key: 'fame', label: 'Ruhm', icon: '⭐' },
];

export default function ResourceBar({
  resources,
  flow,
}: {
  resources: Resources;
  flow?: FlowRates;
}) {
  return (
    <div className="resource-bar-grid">
      {RESOURCE_LABELS.map(({ key, label, icon }) => {
        const f = flow?.[key];
        const income = f?.income ?? 0;
        const expense = f?.expense ?? 0;
        const net = f?.net ?? 0;
        const low = (resources[key] ?? 0) < 20 && (key === 'gold' || key === 'food' || key === 'wood');
        return (
          <div
            key={key}
            className={`resource-card${low ? ' is-low' : ''}${net < 0 ? ' is-drain' : ''}`}
            title={`${label}: Bestand ${resources[key] ?? 0} · +${income}/min · −${expense}/min`}
          >
            <span className="resource-card-icon" aria-hidden>
              {icon}
            </span>
            <div className="resource-card-body">
              <span className="resource-card-label">{label}</span>
              <span className="resource-card-amount tabular-nums">{resources[key] ?? 0}</span>
              {flow && (
                <span className="resource-card-flow">
                  <span className="flow-in">(+{income})</span>
                  <span className="flow-out">(−{expense})</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
