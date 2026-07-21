import { useMemo, useState } from 'react';
import type { Province, GameState } from '../api/client';
import { api } from '../api/client';
import {
  CITY_GRID_W,
  CITY_GRID_H,
  CITY_TILE_DEFS,
  BUILD_CATEGORIES,
  CityTileKind,
  SETTLEMENT_VISUAL,
  computeSettlementVisualLevel,
  capitalVisualTitle,
  computeCityTier,
  countKind,
} from '@kronenchronik/shared';
import {
  explainBuildBlockers,
  formatBuildCost,
  buildTimeLabel,
  buildingJobsHint,
  buildingProducesHint,
} from '../ui/buildHints';
import { toneClass, toneHighGood, toneHousing, toneJobs } from '../ui/statusTone';

interface CityViewProps {
  province: Province;
  gameState: GameState;
  onUpdate: (state: GameState) => void;
  onBack: () => void;
}

type Mode = 'build' | 'upgrade' | 'demolish';

const CHAINS: Array<{ title: string; steps: string[] }> = [
  { title: 'Brot', steps: ['🌾 Getreide', 'Mühle', 'Mehl', 'Bäckerei', '🍞 Brot', 'Bevölkerung'] },
  { title: 'Kleidung', steps: ['🐑 Wolle', 'Weberei', 'Stoff', 'Schneiderei', '👔 Kleidung'] },
  { title: 'Werkzeuge', steps: ['🪓 Holz', 'Sägewerk', 'Bretter', 'Werkstatt', '🔧 Werkzeuge'] },
  { title: 'Waffen', steps: ['⛏️ Eisen', 'Holzkohle', 'Schmelze', 'Stahl', 'Schmiede', '⚔️ Waffen'] },
];

/** Visuelle Größe/Klasse je Gebäude – kein Kästchen-Icon */
function buildingVisual(kind: CityTileKind, level: number): { cls: string; w: number; h: number } {
  const lv = Math.min(5, Math.max(1, level));
  switch (kind) {
    case CityTileKind.CASTLE_KEEP:
    case CityTileKind.PALACE:
      return { cls: 'sb-keep', w: 72 + lv * 6, h: 78 + lv * 6 };
    case CityTileKind.CATHEDRAL:
    case CityTileKind.CHURCH:
      return { cls: 'sb-church', w: 56 + lv * 4, h: 70 + lv * 4 };
    case CityTileKind.MARKET:
    case CityTileKind.TOWN_HALL:
      return { cls: 'sb-market', w: 58 + lv * 3, h: 48 + lv * 3 };
    case CityTileKind.HOUSE:
    case CityTileKind.NOBLE_HOUSE:
      return { cls: 'sb-house', w: 40 + lv * 3, h: 44 + lv * 3 };
    case CityTileKind.FARM:
    case CityTileKind.VINEYARD:
    case CityTileKind.SHEEP_FARM:
      return { cls: 'sb-farm', w: 52 + lv * 2, h: 40 + lv * 2 };
    case CityTileKind.WALL:
    case CityTileKind.TOWER:
    case CityTileKind.GATE:
      return { cls: 'sb-wall', w: 36 + lv * 2, h: 44 + lv * 3 };
    case CityTileKind.HARBOR:
      return { cls: 'sb-harbor', w: 64, h: 48 };
    case CityTileKind.WINDMILL:
    case CityTileKind.MILL:
      return { cls: 'sb-mill', w: 44 + lv * 2, h: 56 + lv * 2 };
    case CityTileKind.ROAD:
      return { cls: 'sb-road', w: 36, h: 36 };
    default:
      return { cls: 'sb-workshop', w: 48 + lv * 2, h: 46 + lv * 2 };
  }
}

/**
 * Stadtansicht: organische Siedlung.
 * Intern bleibt das Stadtgitter für Spielmechanik – sichtbar ist kein Raster.
 */
export default function CityView({ province, gameState, onUpdate, onBack }: CityViewProps) {
  const [selectedKind, setSelectedKind] = useState<CityTileKind>(CityTileKind.HOUSE);
  const [mode, setMode] = useState<Mode>('build');
  const [category, setCategory] = useState(BUILD_CATEGORIES[0]?.id ?? 'wohn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'map' | 'stats' | 'trade'>('map');
  const [taxDraft, setTaxDraft] = useState(province.devStats?.taxRate ?? 30);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    kind: string;
    level: number;
  } | null>(null);

  const tiles = useMemo(() => province.cityGrid ?? [], [province.cityGrid]);
  const isCapital = Boolean(province.isCapital);
  const cityLevel = province.city?.level ?? 0;
  const villageLevel = province.village?.level ?? 0;
  const visual = computeSettlementVisualLevel(
    tiles.map((t) => ({ ...t, kind: t.kind as CityTileKind, buildRemaining: t.buildRemaining })),
    cityLevel,
    villageLevel,
    isCapital,
  );
  const look = SETTLEMENT_VISUAL[visual] ?? SETTLEMENT_VISUAL[1];
  const tier = computeCityTier(
    tiles.map((t) => ({ ...t, kind: t.kind as CityTileKind })),
    cityLevel,
    isCapital,
  );
  const title = capitalVisualTitle(tier, isCapital);
  const stats = province.devStats;
  const stock = stats?.stock;
  const professions = province.professions;
  const resources = gameState.kingdom.resources;

  const palette = useMemo(() => {
    const cat = BUILD_CATEGORIES.find((c) => c.id === category);
    return cat?.kinds ?? [];
  }, [category]);

  const typedTiles = useMemo(
    () => tiles.map((t) => ({ ...t, kind: t.kind as CityTileKind })),
    [tiles],
  );

  const houses =
    countKind(typedTiles, CityTileKind.HOUSE) + countKind(typedTiles, CityTileKind.NOBLE_HOUSE) * 2;
  const housing = 40 + houses * 18;
  const jobs =
    countKind(typedTiles, CityTileKind.FARM) * 3 +
    countKind(typedTiles, CityTileKind.LUMBER_CAMP) * 2 +
    countKind(typedTiles, CityTileKind.MINE) * 2 +
    countKind(typedTiles, CityTileKind.SMITHY) * 2 +
    countKind(typedTiles, CityTileKind.MARKET) * 2 +
    countKind(typedTiles, CityTileKind.BAKERY) * 2 +
    countKind(typedTiles, CityTileKind.WEAVER) * 2 +
    countKind(typedTiles, CityTileKind.BARRACKS) * 4 +
    countKind(typedTiles, CityTileKind.CHURCH) +
    countKind(typedTiles, CityTileKind.SCHOOL) * 2;

  const cell = 48;
  const mapW = CITY_GRID_W * cell;
  const mapH = CITY_GRID_H * cell;

  const def = CITY_TILE_DEFS[selectedKind];
  const softBlockers = useMemo(
    () => explainBuildBlockers(selectedKind, province, resources).filter((b) => b.startsWith('❌')),
    [selectedKind, province, resources],
  );

  const mapError = (msg: string) => {
    if (msg.includes('Holz')) return '❌ Nicht genug Holz';
    if (msg.includes('Gold')) return '❌ Nicht genug Gold';
    if (msg.includes('Stein')) return '❌ Nicht genug Stein';
    if (msg.includes('Eisen')) return '❌ Nicht genug Eisen';
    if (msg.includes('Nahrung') || msg.includes('food')) return '❌ Zu wenig Nahrung';
    if (msg.includes('Straßen')) return '❌ Straße fehlt';
    if (msg.includes('Stadtstufe')) return `❌ ${msg}`;
    if (msg.includes('Ressourcen')) return '❌ Nicht genügend Ressourcen';
    return msg.startsWith('❌') ? msg : `❌ ${msg}`;
  };

  const handleTileClick = async (x: number, y: number) => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'build') {
        const blockers = explainBuildBlockers(selectedKind, province, resources, x, y).filter((b) =>
          b.startsWith('❌'),
        );
        if (blockers.length) {
          setError(blockers[0]);
          setLoading(false);
          return;
        }
      }
      let state: GameState;
      if (mode === 'demolish') {
        state = await api.demolishCityTile({ provinceId: province.id, x, y });
      } else if (mode === 'upgrade') {
        state = await api.upgradeCityTile({ provinceId: province.id, x, y });
      } else {
        state = await api.placeCityTile({
          provinceId: province.id,
          x,
          y,
          kind: selectedKind,
        });
      }
      onUpdate(state);
    } catch (e) {
      setError(mapError(e instanceof Error ? e.message : 'Fehler'));
    } finally {
      setLoading(false);
    }
  };

  const saveTax = async () => {
    setLoading(true);
    setError('');
    try {
      onUpdate(await api.setProvinceTax({ provinceId: province.id, taxRate: taxDraft }));
    } catch (e) {
      setError(mapError(e instanceof Error ? e.message : 'Fehler'));
    } finally {
      setLoading(false);
    }
  };

  const makeCapital = async () => {
    setLoading(true);
    setError('');
    try {
      onUpdate(await api.setCapital({ provinceId: province.id }));
    } catch (e) {
      setError(mapError(e instanceof Error ? e.message : 'Fehler'));
    } finally {
      setLoading(false);
    }
  };

  // Straßen als durchgehende Pfade
  const roadTiles = typedTiles.filter((t) => t.kind === CityTileKind.ROAD);

  return (
    <div className="h-full flex flex-col bg-ink">
      <div className="shrink-0 hud-bar px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" className="btn-secondary text-xs" onClick={onBack}>
            ← Weltkarte
          </button>
          <div className="min-w-0">
            <div className="font-display text-gold text-sm truncate">
              {isCapital ? '👑 ' : ''}
              {province.name}
            </div>
            <div className="text-[10px] text-parchment/60">
              {title} · {province.population} Einwohner · Wohnraum {housing} · Arbeit {jobs}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {(
            [
              ['map', 'Siedlung'],
              ['stats', 'Verwaltung'],
              ['trade', 'Handel'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn-secondary text-[10px] py-1 ${tab === id ? 'text-gold border-gold' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-3 mt-2 text-xs bg-red-900/40 border border-red-700 text-red-200 px-2 py-1 rounded">
          {error}
        </div>
      )}

      {tab === 'stats' ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="info-card-grid">
            {[
              {
                label: 'Bevölkerung',
                value: `${province.population} / ${housing}`,
                tone: toneHousing(province.population, housing),
              },
              {
                label: 'Wohnraum',
                value: `${Math.round((province.population / Math.max(1, housing)) * 100)} %`,
                tone: toneHousing(province.population, housing),
              },
              {
                label: 'Arbeitsplätze',
                value: `${Math.round((jobs / Math.max(1, province.population)) * 100)} %`,
                tone: toneJobs(province.population, jobs),
              },
              {
                label: 'Zufriedenheit',
                value: `${stats?.satisfaction ?? '–'} %`,
                tone: toneHighGood(stats?.satisfaction),
              },
              {
                label: 'Loyalität',
                value: `${stats?.loyalty ?? '–'} %`,
                tone: toneHighGood(stats?.loyalty),
              },
              {
                label: 'Verteidigung',
                value: `${province.defense}`,
                tone: toneHighGood(province.defense, 50, 25),
              },
            ].map((c) => (
              <div key={c.label} className={toneClass(c.tone)}>
                <div className="info-card-label">{c.label}</div>
                <div className="info-card-value">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="panel p-3">
            <div className="panel-header">Entwicklungsstufe</div>
            <p className="text-xs text-parchment/80 mb-2">
              {tier.name}: {tier.description}
            </p>
            <p className="text-[11px] text-parchment/60">{look.description}</p>
            {!isCapital && (
              <button type="button" className="btn-primary text-xs mt-2" disabled={loading} onClick={makeCapital}>
                Zur Hauptstadt machen
              </button>
            )}
          </div>

          <div className="panel p-3">
            <div className="panel-header">Produktionsketten</div>
            <div className="space-y-3">
              {CHAINS.map((chain) => (
                <div key={chain.title} className="production-chain">
                  <div className="text-[10px] text-gold font-display mb-1">{chain.title}</div>
                  <div className="production-chain-steps">
                    {chain.steps.map((step, i) => (
                      <span key={step} className="production-step">
                        {i > 0 && <span className="production-arrow">↓</span>}
                        <span>{step}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-3">
              {(
                [
                  ['🌾 Getreide', stock?.grain],
                  ['⚙️ Mehl', stock?.flour],
                  ['🍞 Brot', stock?.bread],
                  ['🔧 Werkzeuge', stock?.tools],
                  ['⚔️ Waffen', stock?.weapons],
                  ['🧵 Stoff', stock?.cloth],
                  ['👔 Kleidung', stock?.clothes],
                  ['🍺 Bier', stock?.beer],
                ] as const
              ).map(([label, val]) => (
                <div key={label} className="bg-black/40 rounded p-2 border border-gold/15">
                  <div className="text-parchment/50 text-[10px]">{label}</div>
                  <div className="text-gold font-display">{val ?? 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-3">
            <div className="panel-header">Steuern</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={80}
                value={taxDraft}
                onChange={(e) => setTaxDraft(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-gold text-sm w-10">{taxDraft}%</span>
              <button type="button" className="btn-secondary text-xs" disabled={loading} onClick={saveTax}>
                Setzen
              </button>
            </div>
          </div>

          {professions && (
            <div className="panel p-3">
              <div className="panel-header">Berufe</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {(
                  [
                    ['Bauern', professions.farmers],
                    ['Holzfäller', professions.lumberjacks],
                    ['Bergleute', professions.miners],
                    ['Schmiede', professions.smiths],
                    ['Händler', professions.merchants],
                    ['Handwerker', professions.workers],
                  ] as const
                ).map(([label, n]) => (
                  <div key={label} className="bg-black/40 rounded p-2 border border-gold/15">
                    <div className="text-parchment/50 text-[10px]">{label}</div>
                    <div className="text-gold font-display">{n}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : tab === 'trade' ? (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="panel p-3">
            <div className="panel-header">Handel</div>
            <p className="text-xs text-parchment/70">
              Nachbarn: {province.neighbors.map((n) => n.name).join(', ') || 'keine'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          <div className="shrink-0 lg:w-72 border-b lg:border-b-0 lg:border-r border-gold/20 bg-black/40 overflow-x-auto lg:overflow-y-auto p-2">
            <div className="flex gap-1 mb-2">
              {(
                [
                  ['build', 'Bauen'],
                  ['upgrade', 'Ausbau'],
                  ['demolish', 'Abreißen'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`btn-secondary text-[10px] flex-1 ${mode === id ? 'text-gold' : ''}`}
                  onClick={() => setMode(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === 'build' && (
              <>
                <div className="flex flex-wrap gap-1 mb-2">
                  {BUILD_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        category === c.id
                          ? 'border-gold text-gold bg-gold/10'
                          : 'border-gold/20 text-parchment/60'
                      }`}
                      onClick={() => setCategory(c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <div className="flex lg:flex-col gap-1.5 flex-wrap lg:flex-nowrap">
                  {palette.map((kind) => {
                    const d = CITY_TILE_DEFS[kind];
                    const locked = cityLevel < d.minCityLevel;
                    return (
                      <button
                        key={kind}
                        type="button"
                        disabled={locked || loading}
                        onClick={() => setSelectedKind(kind)}
                        className={`build-palette-item text-left ${
                          selectedKind === kind ? 'is-selected' : ''
                        } ${locked ? 'is-locked' : ''}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-base leading-none">{d.icon}</span>
                          <span className="font-display text-[11px] text-gold">{d.name}</span>
                        </div>
                        <div className="build-meta">
                          <span>💰 {formatBuildCost(kind) || '–'}</span>
                          <span>⏱ {buildTimeLabel(kind)}</span>
                          <span>👷 {buildingJobsHint(kind)}</span>
                          <span>📦 {buildingProducesHint(kind)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {def && (
                  <div className="mt-2 build-detail-panel">
                    <div className="font-display text-gold text-xs mb-1">{def.name}</div>
                    <div className="text-[10px] text-parchment/70 space-y-0.5">
                      <div>Kosten: {formatBuildCost(selectedKind) || '–'}</div>
                      <div>Bauzeit: {buildTimeLabel(selectedKind)}</div>
                      <div>Arbeit: {buildingJobsHint(selectedKind)}</div>
                      <div>Produziert: {buildingProducesHint(selectedKind)}</div>
                    </div>
                    {softBlockers.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-[10px] text-red-200">
                        {softBlockers.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div
            className="flex-1 min-h-0 overflow-auto p-3 flex flex-col items-center"
            style={{
              background: `
                radial-gradient(ellipse at 30% 20%, ${look.sky}88 0%, transparent 50%),
                linear-gradient(180deg, #3a5a40 0%, #2a4a30 40%, #1e3a24 100%)
              `,
            }}
          >
            <div className="settlement-stage" style={{ width: mapW + 48, height: mapH + 48 }}>
              {/* Landschaftsgrund – kein Raster */}
              <svg className="settlement-ground" width={mapW + 48} height={mapH + 48}>
                <defs>
                  <pattern id="meadowGrain" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="4" cy="8" r="1.2" fill="rgba(40,80,30,0.15)" />
                    <circle cx="16" cy="14" r="0.9" fill="rgba(60,100,40,0.12)" />
                  </pattern>
                </defs>
                <ellipse
                  cx={(mapW + 48) / 2}
                  cy={(mapH + 48) / 2}
                  rx={mapW * 0.52}
                  ry={mapH * 0.52}
                  fill="#5a8a4a"
                />
                <ellipse
                  cx={(mapW + 48) / 2}
                  cy={(mapH + 48) / 2}
                  rx={mapW * 0.52}
                  ry={mapH * 0.52}
                  fill="url(#meadowGrain)"
                />
                {/* Bach */}
                <path
                  d={`M 20 ${mapH * 0.7} Q ${mapW * 0.4} ${mapH * 0.55}, ${mapW * 0.7} ${mapH * 0.75} T ${mapW + 20} ${mapH * 0.6}`}
                  fill="none"
                  stroke="#6a9aaa"
                  strokeWidth="10"
                  opacity="0.55"
                  strokeLinecap="round"
                />
                {/* Hügel */}
                <path
                  d={`M ${mapW * 0.1} ${mapH * 0.25} Q ${mapW * 0.2} ${mapH * 0.05}, ${mapW * 0.35} ${mapH * 0.28}`}
                  fill="none"
                  stroke="#4a7040"
                  strokeWidth="14"
                  opacity="0.4"
                  strokeLinecap="round"
                />
                {/* Straßennetz als organische Linien */}
                {roadTiles.map((r) => {
                  const px = 24 + r.x * cell + cell / 2;
                  const py = 24 + r.y * cell + cell / 2;
                  return (
                    <circle key={`rd-${r.x}-${r.y}`} cx={px} cy={py} r={cell * 0.42} fill="#a89060" opacity="0.85" />
                  );
                })}
                {roadTiles.map((r) => {
                  const dirs = [
                    [1, 0],
                    [0, 1],
                  ];
                  return dirs.map(([dx, dy]) => {
                    const n = roadTiles.find((t) => t.x === r.x + dx && t.y === r.y + dy);
                    if (!n) return null;
                    const x1 = 24 + r.x * cell + cell / 2;
                    const y1 = 24 + r.y * cell + cell / 2;
                    const x2 = 24 + n.x * cell + cell / 2;
                    const y2 = 24 + n.y * cell + cell / 2;
                    return (
                      <line
                        key={`rl-${r.x}-${r.y}-${dx}-${dy}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#8a7348"
                        strokeWidth={cell * 0.55}
                        strokeLinecap="round"
                        opacity="0.9"
                      />
                    );
                  });
                })}
              </svg>

              {/* Klickbare Bauflächen – unsichtbar außer Hover */}
              <div className="settlement-hitgrid" style={{ width: mapW, height: mapH }}>
                {Array.from({ length: CITY_GRID_H }, (_, y) =>
                  Array.from({ length: CITY_GRID_W }, (_, x) => {
                    const tile =
                      tiles.find((t) => t.x === x && t.y === y) ?? {
                        x,
                        y,
                        kind: 'EMPTY',
                        level: 1,
                      };
                    const kind = tile.kind as CityTileKind;
                    const d = CITY_TILE_DEFS[kind] ?? CITY_TILE_DEFS[CityTileKind.EMPTY];
                    const building = Boolean(tile.buildRemaining && tile.buildRemaining > 0);
                    const vis = buildingVisual(kind, tile.level);
                    const isEmpty = kind === CityTileKind.EMPTY;
                    const isRoad = kind === CityTileKind.ROAD;

                    return (
                      <button
                        key={`${x}-${y}`}
                        type="button"
                        disabled={loading}
                        className={`settlement-plot${isEmpty ? ' is-empty' : ''}${isRoad ? ' is-road' : ''}${
                          !isEmpty && !isRoad ? ' has-building' : ''
                        }${building ? ' is-building' : ''}`}
                        style={{
                          left: x * cell,
                          top: y * cell,
                          width: cell,
                          height: cell,
                        }}
                        onClick={() => handleTileClick(x, y)}
                        onMouseEnter={() => setHover(tile)}
                        onMouseLeave={() => setHover(null)}
                        title={`${d.name}${tile.level > 1 ? ` Lv${tile.level}` : ''}`}
                      >
                        {!isEmpty && !isRoad && (
                          <span
                            className={`settlement-building ${vis.cls} lv-${tile.level}`}
                            style={{ width: vis.w * 0.72, height: vis.h * 0.72 }}
                          >
                            <span className="sb-roof" />
                            <span className="sb-body">{d.icon}</span>
                            <span className="sb-shadow" />
                            {tile.level > 1 && <span className="sb-level">{tile.level}</span>}
                            {building && <span className="sb-build">{tile.buildRemaining}</span>}
                            {tile.level >= 2 && !building && <span className="sb-smoke" />}
                          </span>
                        )}
                      </button>
                    );
                  }),
                )}
              </div>
            </div>

            {hover && (
              <div className="city-tooltip mt-2">
                <div className="font-display text-gold text-xs">
                  {(CITY_TILE_DEFS[hover.kind as CityTileKind] ?? CITY_TILE_DEFS[CityTileKind.EMPTY]).name}
                  {hover.level > 1 ? ` · Stufe ${hover.level}` : ''}
                </div>
                <div className="text-[10px] text-parchment/70">
                  {buildingProducesHint(hover.kind as CityTileKind)} · {buildingJobsHint(hover.kind as CityTileKind)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
