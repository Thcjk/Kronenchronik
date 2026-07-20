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
} from '@kronenchronik/shared';

interface CityViewProps {
  province: Province;
  gameState: GameState;
  onUpdate: (state: GameState) => void;
  onBack: () => void;
}

type Mode = 'build' | 'upgrade' | 'demolish';

export default function CityView({ province, gameState, onUpdate, onBack }: CityViewProps) {
  const [selectedKind, setSelectedKind] = useState<CityTileKind>(CityTileKind.HOUSE);
  const [mode, setMode] = useState<Mode>('build');
  const [category, setCategory] = useState(BUILD_CATEGORIES[0]?.id ?? 'wohn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'map' | 'stats' | 'trade'>('map');
  const [taxDraft, setTaxDraft] = useState(province.devStats?.taxRate ?? 30);

  const tiles = province.cityGrid ?? [];
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

  const palette = useMemo(() => {
    const cat = BUILD_CATEGORIES.find((c) => c.id === category);
    return cat?.kinds ?? [];
  }, [category]);

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

  const handleTileClick = async (x: number, y: number) => {
    setLoading(true);
    setError('');
    try {
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
      setError(e instanceof Error ? e.message : 'Fehler');
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
      setError(e instanceof Error ? e.message : 'Fehler');
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
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setLoading(false);
    }
  };

  const def = CITY_TILE_DEFS[selectedKind];

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
            <div className="panel-header">Provinzwerte</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                ['Zufriedenheit', stats?.satisfaction],
                ['Loyalität', stats?.loyalty],
                ['Sicherheit', stats?.security],
                ['Kriminalität', stats?.crime],
                ['Gesundheit', stats?.health],
                ['Bildung', stats?.education],
                ['Wohlstand', province.prosperity],
                ['Verteidigung', province.defense],
                ['Wald', province.forestStock],
                ['Erz', province.mineStock],
              ].map(([label, val]) => (
                <div key={String(label)} className="bg-black/40 rounded p-2 border border-gold/15">
                  <div className="text-parchment/50 text-[10px]">{label}</div>
                  <div className="text-gold font-display text-sm">{val ?? '–'}</div>
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

          <div className="panel p-3">
            <div className="panel-header">Lager & Produktionsketten</div>
            <div className="text-[11px] text-parchment/70 mb-2 space-y-1">
              <div>🌾→⚙️→🍞 Getreide → Mühle → Mehl → Bäckerei → Brot</div>
              <div>🐑→🧵→👔 Wolle → Weberei → Stoff → Schneiderei → Kleidung</div>
              <div>🪓→🪵→🔧 Holz → Bretter → Werkzeuge</div>
              <div>⛏️→🔥→⚔️ Eisen → Holzkohle/Stahl → Waffen & Rüstung</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
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
                  ['🐴 Pferde', stock?.horses],
                  ['💎 Luxus', stock?.luxury],
                  ['🪙 Reich-Gold', gameState.kingdom.resources.gold],
                ] as const
              ).map(([label, val]) => (
                <div key={label} className="bg-black/40 rounded p-2 border border-gold/15">
                  <div className="text-parchment/50 text-[10px]">{label}</div>
                  <div className="text-gold font-display">{val ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : tab === 'trade' ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="panel p-3">
            <div className="panel-header">Automatischer Handel</div>
            <p className="text-xs text-parchment/70 mb-2">
              Benachbarte eigene Provinzen tauschen Überschüsse (Getreide, Werkzeuge, Stoff, Stahl)
              und erzeugen Gold. Nicht jede Stadt produziert alles – plane Spezialisierung.
            </p>
            <div className="text-[11px] text-parchment/60">
              Nachbarn:{' '}
              {province.neighbors.map((n) => n.name).join(', ') || 'keine'}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/40 rounded p-2 border border-gold/15">
                <div className="text-parchment/50 text-[10px]">Export-Hinweis</div>
                <div className="text-parchment/80">
                  {(stock?.grain ?? 0) > 40
                    ? 'Getreideüberschuss'
                    : (stock?.tools ?? 0) > 20
                      ? 'Werkzeugüberschuss'
                      : (stock?.cloth ?? 0) > 15
                        ? 'Stoffüberschuss'
                        : 'Ausgewogen / Bedarf'}
                </div>
              </div>
              <div className="bg-black/40 rounded p-2 border border-gold/15">
                <div className="text-parchment/50 text-[10px]">Nachfrage</div>
                <div className="text-parchment/80">
                  {(stock?.bread ?? 0) < 15
                    ? 'Nahrung knapp'
                    : (stock?.weapons ?? 0) < 8
                      ? 'Waffen knapp'
                      : 'Versorgt'}
                </div>
              </div>
            </div>
          </div>
          <div className="panel p-3 text-xs text-parchment/70">
            <div className="panel-header">Reichsentwicklung</div>
            <p>
              Baue Straßen und Märkte in jeder Stadt. Burgen (Burgfried, Mauern) produzieren keine
              Güter – sie verteidigen, lagern und verwalten. Die Hauptstadt sollte als Handels- und
              Kulturzentrum ausgebaut werden.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          <div className="shrink-0 lg:w-60 border-b lg:border-b-0 lg:border-r border-gold/20 bg-black/40 overflow-x-auto lg:overflow-y-auto p-2">
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
                <div className="flex lg:flex-col gap-1 flex-wrap lg:flex-nowrap">
                  {palette.map((kind) => {
                    const d = CITY_TILE_DEFS[kind];
                    const locked = cityLevel < d.minCityLevel;
                    return (
                      <button
                        key={kind}
                        type="button"
                        disabled={locked || loading}
                        onClick={() => setSelectedKind(kind)}
                        className={`text-left text-[11px] px-2 py-1.5 rounded border transition-colors ${
                          selectedKind === kind
                            ? 'border-gold bg-gold/15 text-gold'
                            : 'border-gold/20 bg-black/30 text-parchment/80'
                        } ${locked ? 'opacity-40' : ''}`}
                        title={
                          locked
                            ? `Stadtstufe ${d.minCityLevel} nötig`
                            : `${d.cost.gold}g ${d.cost.wood}h ${d.cost.stone}s`
                        }
                      >
                        <span className="mr-1">{d.icon}</span>
                        {d.name}
                      </button>
                    );
                  })}
                </div>
                {def && (
                  <div className="mt-2 text-[10px] text-parchment/50 hidden lg:block">
                    Kosten: {def.cost.gold} Gold, {def.cost.wood} Holz, {def.cost.stone} Stein
                    {def.minCityLevel > 0 ? ` · ab Stadt ${def.minCityLevel}` : ''}
                    <br />
                    Gebäude brauchen oft Straßenanschluss und Bauzeit.
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
            className="flex-1 min-h-0 overflow-auto p-2 flex items-start justify-center"
            style={{
              background: `linear-gradient(180deg, ${look.sky} 0%, ${look.ground} 100%)`,
            }}
          >
            <div
              className="inline-grid gap-0.5 p-2 rounded border border-gold/30 shadow-2xl"
              style={{
                gridTemplateColumns: `repeat(${CITY_GRID_W}, minmax(28px, 36px))`,
                background: 'rgba(0,0,0,0.35)',
              }}
            >
              {grid.map((tile) => {
                const kind = tile.kind as CityTileKind;
                const d = CITY_TILE_DEFS[kind] ?? CITY_TILE_DEFS[CityTileKind.EMPTY];
                const isRoad = kind === CityTileKind.ROAD;
                const isEmpty = kind === CityTileKind.EMPTY;
                const building = Boolean(tile.buildRemaining && tile.buildRemaining > 0);
                return (
                  <button
                    key={`${tile.x}-${tile.y}`}
                    type="button"
                    disabled={loading}
                    onClick={() => handleTileClick(tile.x, tile.y)}
                    className={`aspect-square relative flex items-center justify-center text-sm rounded-sm border transition-transform hover:scale-110 hover:z-10 ${
                      isEmpty
                        ? 'bg-black/25 border-white/5'
                        : isRoad
                          ? 'bg-amber-900/50 border-amber-700/40'
                          : building
                            ? 'bg-amber-950/60 border-amber-500/50'
                            : 'bg-black/50 border-gold/25'
                    }`}
                    title={`${d.name} Lv${tile.level}${building ? ` (Bau: ${tile.buildRemaining})` : ''} (${tile.x},${tile.y})`}
                  >
                    {isEmpty ? '' : d.icon}
                    {!isEmpty && tile.level > 1 && !building && (
                      <span className="absolute bottom-0 right-0 text-[8px] text-gold leading-none px-0.5 bg-black/60">
                        {tile.level}
                      </span>
                    )}
                    {building && (
                      <span className="absolute inset-0 flex items-end justify-center text-[8px] text-amber-200 bg-black/40">
                        {tile.buildRemaining}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
