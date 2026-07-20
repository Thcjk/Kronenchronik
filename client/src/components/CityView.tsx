import { useState } from 'react';
import type { Province, GameState } from '../api/client';
import { api } from '../api/client';
import {
  CITY_GRID_W,
  CITY_GRID_H,
  CITY_TILE_DEFS,
  BUILD_PALETTE,
  CityTileKind,
  SETTLEMENT_VISUAL,
  computeSettlementVisualLevel,
} from '@kronenchronik/shared';

interface CityViewProps {
  province: Province;
  gameState: GameState;
  onUpdate: (state: GameState) => void;
  onBack: () => void;
}

export default function CityView({ province, gameState, onUpdate, onBack }: CityViewProps) {
  const [selectedKind, setSelectedKind] = useState<CityTileKind>(CityTileKind.HOUSE);
  const [mode, setMode] = useState<'build' | 'demolish'>('build');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'map' | 'stats'>('map');

  const tiles = province.cityGrid ?? [];
  const visual = computeSettlementVisualLevel(
    tiles.map((t) => ({ ...t, kind: t.kind as CityTileKind })),
    province.city?.level ?? 0,
    province.village?.level ?? 0,
  );
  const look = SETTLEMENT_VISUAL[visual] ?? SETTLEMENT_VISUAL[1];
  const stats = province.devStats;
  const stock = stats?.stock;

  const grid: Array<{ x: number; y: number; kind: string; level: number }> = [];
  for (let y = 0; y < CITY_GRID_H; y++) {
    for (let x = 0; x < CITY_GRID_W; x++) {
      grid.push(tiles.find((t) => t.x === x && t.y === y) ?? { x, y, kind: 'EMPTY', level: 1 });
    }
  }

  const handleTileClick = async (x: number, y: number) => {
    setLoading(true);
    setError('');
    try {
      let state: GameState;
      if (mode === 'demolish') {
        state = await api.demolishCityTile({ provinceId: province.id, x, y });
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

  const def = CITY_TILE_DEFS[selectedKind];

  return (
    <div className="h-full flex flex-col bg-ink">
      {/* Header */}
      <div className="shrink-0 hud-bar px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" className="btn-secondary text-xs" onClick={onBack}>
            ← Weltkarte
          </button>
          <div className="min-w-0">
            <div className="font-display text-gold text-sm truncate">{province.name}</div>
            <div className="text-[10px] text-parchment/60">
              {look.title} · Stufe {visual}/5 · {province.population} Einwohner
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className={`btn-secondary text-[10px] py-1 ${tab === 'map' ? 'text-gold border-gold' : ''}`}
            onClick={() => setTab('map')}
          >
            Stadtplan
          </button>
          <button
            type="button"
            className={`btn-secondary text-[10px] py-1 ${tab === 'stats' ? 'text-gold border-gold' : ''}`}
            onClick={() => setTab('stats')}
          >
            Verwaltung
          </button>
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
            <div className="panel-header">Lager & Produktionskette</div>
            <div className="text-[11px] text-parchment/70 mb-2">
              Getreide → Mühle → Mehl → Bäckerei → Brot → Wachstum
              <br />
              Holz → Sägewerk → Bretter → Werkstatt → Werkzeuge → Schmiede → Waffen
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                ['🌾 Getreide', stock?.grain],
                ['⚙️ Mehl', stock?.flour],
                ['🍞 Brot', stock?.bread],
                ['🪵 Bretter', stock?.planks],
                ['🔧 Werkzeuge', stock?.tools],
                ['⚔️ Waffen', stock?.weapons],
                ['🐴 Pferde', stock?.horses],
                ['🪙 Reich-Gold', gameState.kingdom.resources.gold],
              ].map(([label, val]) => (
                <div key={String(label)} className="bg-black/40 rounded p-2 border border-gold/15">
                  <div className="text-parchment/50 text-[10px]">{label}</div>
                  <div className="text-gold font-display">{val ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-3 text-xs text-parchment/70">
            <div className="panel-header">Entwicklung</div>
            <p>{look.description}</p>
            <p className="mt-2">
              Straßen neben Gebäuden erhöhen die Produktion. Ohne Straßen arbeitet alles langsamer.
              Wald und Minen können erschöpft werden und regenerieren langsam.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Palette */}
          <div className="shrink-0 lg:w-56 border-b lg:border-b-0 lg:border-r border-gold/20 bg-black/40 overflow-x-auto lg:overflow-y-auto p-2">
            <div className="flex gap-1 mb-2">
              <button
                type="button"
                className={`btn-secondary text-[10px] flex-1 ${mode === 'build' ? 'text-gold' : ''}`}
                onClick={() => setMode('build')}
              >
                Bauen
              </button>
              <button
                type="button"
                className={`btn-secondary text-[10px] flex-1 ${mode === 'demolish' ? 'text-gold' : ''}`}
                onClick={() => setMode('demolish')}
              >
                Abreißen
              </button>
            </div>
            {mode === 'build' && (
              <div className="flex lg:flex-col gap-1 flex-wrap lg:flex-nowrap">
                {BUILD_PALETTE.map((kind) => {
                  const d = CITY_TILE_DEFS[kind];
                  const locked = (province.city?.level ?? 0) < d.minCityLevel;
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
            )}
            {mode === 'build' && def && (
              <div className="mt-2 text-[10px] text-parchment/50 hidden lg:block">
                Kosten: {def.cost.gold} Gold, {def.cost.wood} Holz, {def.cost.stone} Stein
                {def.minCityLevel > 0 ? ` · ab Stadt ${def.minCityLevel}` : ''}
              </div>
            )}
          </div>

          {/* Stadtgitter */}
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
                return (
                  <button
                    key={`${tile.x}-${tile.y}`}
                    type="button"
                    disabled={loading}
                    onClick={() => handleTileClick(tile.x, tile.y)}
                    className={`aspect-square flex items-center justify-center text-sm rounded-sm border transition-transform hover:scale-110 hover:z-10 ${
                      isEmpty
                        ? 'bg-black/25 border-white/5'
                        : isRoad
                          ? 'bg-amber-900/50 border-amber-700/40'
                          : 'bg-black/50 border-gold/25'
                    }`}
                    title={`${d.name} (${tile.x},${tile.y})`}
                  >
                    {isEmpty ? '' : d.icon}
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
