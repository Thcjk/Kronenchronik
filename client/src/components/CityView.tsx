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

function tileTerrainClass(kind: CityTileKind, x: number, y: number): string {
  if (kind === CityTileKind.ROAD) return 'city-tile is-road';
  if (kind === CityTileKind.EMPTY) {
    const n = (x * 7 + y * 13) % 5;
    if (n === 0) return 'city-tile is-meadow is-hill';
    if (n === 1) return 'city-tile is-meadow is-trees';
    return 'city-tile is-meadow';
  }
  if (kind === CityTileKind.FARM || kind === CityTileKind.VINEYARD || kind === CityTileKind.SHEEP_FARM) {
    return 'city-tile is-field';
  }
  if (kind === CityTileKind.WALL || kind === CityTileKind.TOWER || kind === CityTileKind.GATE) {
    return 'city-tile is-wall';
  }
  return 'city-tile is-building';
}

export default function CityView({ province, gameState, onUpdate, onBack }: CityViewProps) {
  const [selectedKind, setSelectedKind] = useState<CityTileKind>(CityTileKind.HOUSE);
  const [mode, setMode] = useState<Mode>('build');
  const [category, setCategory] = useState(BUILD_CATEGORIES[0]?.id ?? 'wohn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'map' | 'stats' | 'trade'>('map');
  const [taxDraft, setTaxDraft] = useState(province.devStats?.taxRate ?? 30);
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number; kind: string; level: number } | null>(
    null,
  );

  const tiles = useMemo(() => province.cityGrid ?? [], [province.cityGrid]);
  const isCapital = Boolean(province.isCapital);
  const cityLevel = province.city?.level ?? 0;
  const villageLevel = province.village?.level ?? 0;
  const visual = computeSettlementVisualLevel(
    tiles.map((t) => ({
      ...t,
      kind: t.kind as CityTileKind,
      buildRemaining: t.buildRemaining,
    })),
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
    () =>
      tiles.map((t) => ({
        ...t,
        kind: t.kind as CityTileKind,
      })),
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

  const grid: Array<{
    x: number;
    y: number;
    kind: string;
    level: number;
    buildRemaining?: number;
  }> = [];
  for (let y = 0; y < CITY_GRID_H; y++) {
    for (let x = 0; x < CITY_GRID_W; x++) {
      grid.push(
        tiles.find((t) => t.x === x && t.y === y) ?? {
          x,
          y,
          kind: 'EMPTY',
          level: 1,
        },
      );
    }
  }

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
    if (msg.includes('Bevölkerung')) return '❌ Zu wenig Bevölkerung';
    if (msg.includes('Arbeiter')) return '❌ Kein freier Arbeiter';
    if (msg.includes('Forschung')) return '❌ Forschung fehlt';
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
      const state = await api.setProvinceTax({ provinceId: province.id, taxRate: taxDraft });
      onUpdate(state);
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
      const state = await api.setCapital({ provinceId: province.id });
      onUpdate(state);
    } catch (e) {
      setError(mapError(e instanceof Error ? e.message : 'Fehler'));
    } finally {
      setLoading(false);
    }
  };

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
              {title} · Stufe {visual}/7 · {province.population} Einwohner
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {(
            [
              ['map', 'Stadtplan'],
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
              <button
                type="button"
                className="btn-primary text-xs mt-2"
                disabled={loading}
                onClick={makeCapital}
              >
                Zur Hauptstadt machen
              </button>
            )}
            {isCapital && (
              <p className="text-[11px] text-gold mt-2">Herz des Reiches – wächst sichtbar mit jeder Stufe.</p>
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
                  ['🐟 Fisch', stock?.fish],
                  ['🥩 Fleisch', stock?.meat],
                  ['🪵 Bretter', stock?.planks],
                  ['🔧 Werkzeuge', stock?.tools],
                  ['🐑 Wolle', stock?.wool],
                  ['🧵 Stoff', stock?.cloth],
                  ['👔 Kleidung', stock?.clothes],
                  ['🔥 Holzkohle', stock?.charcoal],
                  ['⚙️ Stahl', stock?.steel],
                  ['⚔️ Waffen', stock?.weapons],
                  ['🛡️ Rüstung', stock?.armor],
                  ['🍺 Bier', stock?.beer],
                  ['🍇 Wein', stock?.wine],
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
            <div className="panel-header">Steuern des Herrschers</div>
            <p className="text-[11px] text-parchment/60 mb-2">
              Hohe Steuern = mehr Gold, weniger Zufriedenheit. Ideal um 30.
            </p>
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
                    ['Priester', professions.priests],
                    ['Lehrer', professions.teachers],
                    ['Soldaten', professions.soldiers],
                    ['Adelige', professions.nobles],
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
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="panel p-3">
            <div className="panel-header">Automatischer Handel</div>
            <p className="text-xs text-parchment/70 mb-2">
              Benachbarte eigene Provinzen tauschen Überschüsse und erzeugen Gold.
            </p>
            <div className="text-[11px] text-parchment/60">
              Nachbarn: {province.neighbors.map((n) => n.name).join(', ') || 'keine'}
            </div>
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
                    const costLine = formatBuildCost(kind);
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
                          <span>💰 {costLine || 'kostenlos'}</span>
                          <span>⏱ {buildTimeLabel(kind)}</span>
                          <span>👷 {buildingJobsHint(kind)}</span>
                          <span>📦 {buildingProducesHint(kind)}</span>
                          {d.minCityLevel > 0 && <span>🏛 Stadt {d.minCityLevel}+</span>}
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
                      <div>Arbeit / Wirkung: {buildingJobsHint(selectedKind)}</div>
                      <div>Produziert: {buildingProducesHint(selectedKind)}</div>
                      <div>
                        Voraussetzung:{' '}
                        {def.minCityLevel > 0 ? `Stadtstufe ${def.minCityLevel}` : 'keine Stadtstufe'}
                        {def.category === 'building' && selectedKind !== CityTileKind.CASTLE_KEEP
                          ? ' · Straßenanschluss'
                          : ''}
                      </div>
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
            {mode === 'upgrade' && (
              <p className="text-[11px] text-parchment/60">
                Klicke ein fertiges Gebäude an, um die Stufe zu erhöhen (Produktion & Aussehen).
                Max. Stufe 4 (Burgfried 5).
              </p>
            )}
          </div>

          <div
            className="flex-1 min-h-0 overflow-auto p-2 flex flex-col items-center"
            style={{
              background: `
                linear-gradient(180deg, ${look.sky} 0%, transparent 45%),
                radial-gradient(ellipse at 50% 80%, ${look.ground} 0%, #1a2a18 100%)
              `,
            }}
          >
            <div className="city-landscape-frame">
              <div
                className="city-landscape-grid"
                style={{
                  gridTemplateColumns: `repeat(${CITY_GRID_W}, minmax(32px, 40px))`,
                }}
              >
                {grid.map((tile) => {
                  const kind = tile.kind as CityTileKind;
                  const d = CITY_TILE_DEFS[kind] ?? CITY_TILE_DEFS[CityTileKind.EMPTY];
                  const building = Boolean(tile.buildRemaining && tile.buildRemaining > 0);
                  const cls = tileTerrainClass(kind, tile.x, tile.y);
                  return (
                    <button
                      key={`${tile.x}-${tile.y}`}
                      type="button"
                      disabled={loading}
                      onClick={() => handleTileClick(tile.x, tile.y)}
                      onMouseEnter={() => setHoverTile(tile)}
                      onMouseLeave={() => setHoverTile(null)}
                      className={`${cls}${building ? ' is-building-site' : ''}${tile.level > 1 ? ` lv-${tile.level}` : ''}`}
                      title={`${d.name} Lv${tile.level}${building ? ` (Bau: ${tile.buildRemaining})` : ''}`}
                    >
                      <span className="city-tile-art">
                        {kind === CityTileKind.EMPTY ? (
                          <span className="city-tile-empty-mark" />
                        ) : (
                          <span className={`city-building-glyph lv-${tile.level}`}>{d.icon}</span>
                        )}
                      </span>
                      {!building && tile.level > 1 && kind !== CityTileKind.EMPTY && kind !== CityTileKind.ROAD && (
                        <span className="city-tile-level">{tile.level}</span>
                      )}
                      {building && <span className="city-tile-build">{tile.buildRemaining}</span>}
                      {tile.level >= 2 && kind !== CityTileKind.EMPTY && kind !== CityTileKind.ROAD && !building && (
                        <span className="city-tile-smoke" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {hoverTile && (
              <div className="city-tooltip mt-2">
                <div className="font-display text-gold text-xs">
                  {(CITY_TILE_DEFS[hoverTile.kind as CityTileKind] ?? CITY_TILE_DEFS[CityTileKind.EMPTY]).name}
                  {hoverTile.level > 1 ? ` · Stufe ${hoverTile.level}` : ''}
                </div>
                <div className="text-[10px] text-parchment/70">
                  {buildingProducesHint(hoverTile.kind as CityTileKind)}
                  {' · '}
                  {buildingJobsHint(hoverTile.kind as CityTileKind)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
