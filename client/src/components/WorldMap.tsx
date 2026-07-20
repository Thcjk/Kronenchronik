import { useRef, useState, useMemo, useCallback } from 'react';
import type { Province, Army } from '../api/client';
import {
  provincePolygon,
  provinceCenter,
  mapBounds,
  TERRAIN_FILL,
  TERRAIN_FILL_ALT,
  REALM_COLORS,
  RIVER_PATHS,
  LAKE_ELLIPSES,
  zoomLod,
  castleVisual,
  settlementVisual,
  buildAmbientActors,
  buildRoadSegments,
  nearDecor,
  mountainMarks,
  treeMarks,
  hash,
  nameSeed,
} from '../map/geometry';

interface WorldMapProps {
  provinces: Province[];
  armies: Army[];
  selectedId: string | null;
  onSelect: (province: Province) => void;
  mapMode?: 'terrain' | 'political';
  season?: string;
  weather?: string;
}

const SEASON_TINT: Record<string, string> = {
  spring: 'rgba(80, 140, 60, 0.06)',
  summer: 'rgba(220, 180, 40, 0.05)',
  autumn: 'rgba(180, 90, 30, 0.08)',
  winter: 'rgba(200, 220, 240, 0.12)',
};

const WEATHER_TINT: Record<string, string> = {
  rain: 'rgba(60, 80, 110, 0.1)',
  snow: 'rgba(255, 255, 255, 0.12)',
  storm: 'rgba(40, 40, 60, 0.16)',
  fog: 'rgba(180, 180, 190, 0.12)',
  thunder: 'rgba(50, 40, 80, 0.12)',
  sunny: 'transparent',
};

function SettlementArt({
  kind,
  size,
  isCapital,
}: {
  kind: 'weiler' | 'dorf' | 'stadt' | 'gross' | 'haupt' | 'burg';
  size: number;
  isCapital?: boolean;
}) {
  const s = size / 18;
  if (kind === 'burg') {
    return (
      <g transform={`scale(${s})`} className="map-settlement-art">
        <ellipse cx="0" cy="4" rx="7" ry="1.6" fill="rgba(60,40,20,0.25)" />
        <path
          d="M-6 3 L-6 -2 L-3.5 -2 L-3.5 -4.5 L-1.5 -4.5 L-1.5 -2 L1.5 -2 L1.5 -4.5 L3.5 -4.5 L3.5 -2 L6 -2 L6 3 Z"
          fill="#8b7355"
          stroke="#3d2914"
          strokeWidth="0.5"
        />
        <path d="M-6 -2 L0 -7 L6 -2" fill="#6b5344" stroke="#2a1a0c" strokeWidth="0.4" />
        <line x1="0" y1="-7" x2="0" y2="-10" stroke="#3d2914" strokeWidth="0.55" />
        <path d="M0 -10 L3.2 -8.6 L0 -7.4 Z" fill="#8b1a1a" className="ambient-flag" />
      </g>
    );
  }
  if (kind === 'weiler' || kind === 'dorf') {
    return (
      <g transform={`scale(${s})`} className="map-settlement-art">
        <ellipse cx="0" cy="3.2" rx="5" ry="1.1" fill="rgba(60,40,20,0.2)" />
        <path d="M-4 2.5 L-4 0 L0 -3.2 L4 0 L4 2.5 Z" fill="#c4a574" stroke="#3d2914" strokeWidth="0.4" />
        <path d="M-4.3 0.2 L0 -3.5 L4.3 0.2" fill="#6b5344" stroke="#2a1a0c" strokeWidth="0.35" />
        <rect x="-0.55" y="0.3" width="1.1" height="1.8" fill="#3d2914" />
        {kind === 'dorf' && (
          <path d="M3.5 -0.5 L3.5 -2.8 L5 -1.2 Z" fill="#8b7355" stroke="#3d2914" strokeWidth="0.3" />
        )}
      </g>
    );
  }
  if (kind === 'stadt') {
    return (
      <g transform={`scale(${s})`} className="map-settlement-art">
        <ellipse cx="0" cy="4.5" rx="8" ry="1.6" fill="rgba(60,40,20,0.22)" />
        <path
          d="M-6.5 4 Q-6.5 -1.5 -2.5 -3 L0 -4 L2.5 -3 Q6.5 -1.5 6.5 4 Z"
          fill="#b8956c"
          stroke="#3d2914"
          strokeWidth="0.45"
        />
        <path d="M-2.2 -2.8 L0 -6 L2.2 -2.8" fill="#6b5344" stroke="#2a1a0c" strokeWidth="0.35" />
        <rect x="-0.7" y="1.2" width="1.4" height="2.4" fill="#3d2914" />
        <circle cx="-3" cy="0.4" r="0.6" fill="#5c7a9e" opacity="0.75" />
        <circle cx="3" cy="0.4" r="0.6" fill="#5c7a9e" opacity="0.75" />
      </g>
    );
  }
  // gross / hauptstadt
  return (
    <g transform={`scale(${s})`} className="map-settlement-art map-settlement-capital">
      <ellipse cx="0" cy="6" rx="12" ry="2.2" fill="rgba(60,40,20,0.28)" />
      <ellipse cx="0" cy="2" rx="10" ry="5.5" fill="rgba(196,165,116,0.4)" stroke="#6b5344" strokeWidth="1.1" />
      <path d="M-2 2.5 L-2 -2.5 L0 -7 L2 -2.5 L2 2.5 Z" fill="#8b7355" stroke="#2a1a0c" strokeWidth="0.45" />
      <path d="M0 -7 L0 -10" stroke="#3d2914" strokeWidth="0.55" />
      <path d="M0 -10 L2.6 -8.6 L0 -7.4 Z" fill="#c9a227" />
      <path
        d="M-8 2 L-8 -1.5 L-6 -1.5 L-6 -3.5 L-4 -3.5 L-4 -1.5 L-2 -1.5 L-2 2 Z"
        fill="#7a6550"
        stroke="#2a1a0c"
        strokeWidth="0.35"
      />
      <circle cx="4.5" cy="1.8" r="2.2" fill="rgba(201,162,39,0.4)" stroke="#c9a227" strokeWidth="0.35" />
      {(isCapital || kind === 'haupt') && (
        <g>
          <line x1="7" y1="-1" x2="7" y2="-6" stroke="#3d2914" strokeWidth="0.5" />
          <path d="M7 -6 L10.5 -4.6 L7 -3.4 Z" fill="#8b1a1a" className="ambient-flag" />
        </g>
      )}
    </g>
  );
}

function settleKind(
  cityLv: number,
  villLv: number,
  castLv: number,
  scoreLabel: string,
  isCapital: boolean,
): 'weiler' | 'dorf' | 'stadt' | 'gross' | 'haupt' | 'burg' {
  if (isCapital || scoreLabel === 'Hauptstadt') return 'haupt';
  if (castLv > 0 && cityLv === 0 && villLv < 2) return 'burg';
  if (scoreLabel === 'Große Stadt') return 'gross';
  if (cityLv > 0 || scoreLabel === 'Kleinstadt') return 'stadt';
  if (villLv >= 2 || scoreLabel === 'Dorf') return 'dorf';
  return 'weiler';
}

export default function WorldMap({
  provinces,
  armies,
  selectedId,
  onSelect,
  mapMode = 'political',
  season,
  weather,
}: WorldMapProps) {
  const [transform, setTransform] = useState({ x: 24, y: 16, scale: 0.9 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const maxX = Math.max(...provinces.map((p) => p.x), 0);
  const maxY = Math.max(...provinces.map((p) => p.y), 0);
  const { width, height } = mapBounds(maxX, maxY);
  const lod = zoomLod(transform.scale);
  const detail = lod === 'near' || lod === 'ultra';
  const ultra = lod === 'ultra';

  const ownerIds = useMemo(
    () => [...new Set(provinces.map((p) => p.ownerId).filter(Boolean))] as string[],
    [provinces],
  );

  const ownerColor = useCallback(
    (ownerId: string | null) => {
      if (!ownerId) return '#6a5a48';
      return REALM_COLORS[ownerIds.indexOf(ownerId) % REALM_COLORS.length];
    },
    [ownerIds],
  );

  const roads = useMemo(() => buildRoadSegments(provinces), [provinces]);
  const ambient = useMemo(
    () =>
      buildAmbientActors(
        provinces.map((p) => ({
          id: p.id,
          name: p.name,
          x: p.x,
          y: p.y,
          terrain: p.terrain,
          isOwned: p.isOwned,
          hasCity: !!(p.city && p.city.level > 0),
        })),
        season,
      ),
    [provinces, season],
  );

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((t) => ({
      ...t,
      scale: Math.min(4.2, Math.max(0.35, t.scale * delta)),
    }));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  const marchingArmies = armies.filter((a) => a.status === 'MARCHING');

  return (
    <div className="world-map-shell parchment-map relative w-full h-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `linear-gradient(180deg, ${SEASON_TINT[season ?? ''] ?? 'transparent'}, ${WEATHER_TINT[weather ?? 'sunny'] ?? 'transparent'})`,
        }}
      />
      <div className="absolute top-2 left-2 z-20 panel px-2 py-1 text-[10px] text-parchment/70 pointer-events-none">
        {lod === 'far' && 'Länder & Grenzen'}
        {lod === 'mid' && 'Straßen, Burgen & Flüsse'}
        {lod === 'near' && 'Felder, Mühlen & Siedlungen'}
        {lod === 'ultra' && 'Leben auf der Karte'}
        {season ? ` · ${season}` : ''}
        {weather ? ` · ${weather}` : ''}
      </div>

      <div className="absolute top-2 right-2 z-20 flex gap-1">
        <button
          type="button"
          className="map-ctrl"
          title="Heranzoomen"
          onClick={() => setTransform((t) => ({ ...t, scale: Math.min(4.2, t.scale * 1.2) }))}
        >
          +
        </button>
        <button
          type="button"
          className="map-ctrl"
          title="Wegzoomen"
          onClick={() => setTransform((t) => ({ ...t, scale: Math.max(0.35, t.scale * 0.8) }))}
        >
          −
        </button>
        <button
          type="button"
          className="map-ctrl"
          title="Gesamte Karte"
          onClick={() => setTransform({ x: 24, y: 16, scale: 0.9 })}
        >
          ⌂
        </button>
      </div>

      <div
        className="w-full h-full touch-none cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <svg
          className="w-full h-full parchment-svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Weltkarte von Kronenchronik"
        >
          <defs>
            <radialGradient id="mapParchment" cx="42%" cy="32%" r="78%">
              <stop offset="0%" stopColor="#f2e6c4" />
              <stop offset="45%" stopColor="#e4d0a4" />
              <stop offset="100%" stopColor="#c9b07a" />
            </radialGradient>
            <pattern id="paperGrain" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="3" r="0.55" fill="rgba(74,52,28,0.045)" />
              <circle cx="8" cy="8" r="0.4" fill="rgba(74,52,28,0.035)" />
              <circle cx="10" cy="2" r="0.3" fill="rgba(61,41,20,0.04)" />
            </pattern>
            <filter id="softShadow">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#3d2914" floodOpacity="0.35" />
            </filter>
            <filter id="inkSoft">
              <feDropShadow dx="0.3" dy="0.6" stdDeviation="0.6" floodColor="#3d2914" floodOpacity="0.3" />
            </filter>
            <linearGradient id="roadInk" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6b5344" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#5c4033" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#6b5344" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          <rect width={width} height={height} fill="url(#mapParchment)" />
          <rect width={width} height={height} fill="url(#paperGrain)" />

          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
            {/* Seen */}
            {lod !== 'far' &&
              LAKE_ELLIPSES.map((l, i) => (
                <g key={`lake-${i}`}>
                  <ellipse cx={l.cx} cy={l.cy} rx={l.rx + 3} ry={l.ry + 2} fill="#7a9aaa" opacity={0.35} />
                  <ellipse
                    cx={l.cx}
                    cy={l.cy}
                    rx={l.rx}
                    ry={l.ry}
                    fill="#8fb0b8"
                    opacity={0.75}
                    stroke="#5a7a88"
                    strokeWidth={1.2}
                  />
                </g>
              ))}

            {/* Flüsse – geschwungen, Richtung Meer */}
            {RIVER_PATHS.map((d, i) => (
              <g key={`river-${i}`} className="map-river">
                <path d={d} fill="none" stroke="#6a8a9a" strokeWidth={lod === 'far' ? 6 : 9} strokeLinecap="round" opacity={0.25} />
                <path
                  d={d}
                  fill="none"
                  stroke="#5a8aa0"
                  strokeWidth={lod === 'far' ? 2.8 : detail ? 4.2 : 3.4}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              </g>
            ))}

            {/* Straßen (geschwungen) */}
            {lod !== 'far' &&
              roads.map((r) => (
                <path
                  key={r.key}
                  d={`M ${r.x1} ${r.y1} Q ${r.mx} ${r.my} ${r.x2} ${r.y2}`}
                  fill="none"
                  stroke="url(#roadInk)"
                  strokeWidth={detail ? (ultra ? 3.8 : 3.1) : 2}
                  strokeLinecap="round"
                  strokeDasharray={detail ? undefined : '7 4'}
                  opacity={0.85}
                  className="map-road"
                />
              ))}

            {/* Brücken */}
            {detail &&
              [
                [160, 210],
                [350, 220],
                [280, 370],
                [480, 300],
              ].map(([bx, by], i) => (
                <g key={`bridge-${i}`} className="map-bridge">
                  <rect x={bx - 8} y={by - 3.5} width={16} height={7} rx={1} fill="#8a7348" stroke="#4a3420" strokeWidth={0.7} />
                  <line x1={bx - 6} y1={by} x2={bx + 6} y2={by} stroke="#c4a882" strokeWidth={0.8} />
                </g>
              ))}

            {/* Provinzen */}
            {provinces.map((p) => {
              const poly = provincePolygon(p.x, p.y, p.name);
              const { cx, cy } = provinceCenter(p.x, p.y);
              const isSelected = selectedId === p.id;
              const seed = nameSeed(p.name);
              const terrainFill = hash(seed) > 0.5 ? TERRAIN_FILL[p.terrain] : TERRAIN_FILL_ALT[p.terrain];
              const border =
                p.isOwned || p.isCapital
                  ? '#8b6914'
                  : p.ownerId
                    ? ownerColor(p.ownerId)
                    : '#6b5a48';

              const cityLv = p.city?.level ?? 0;
              const villLv = p.village?.level ?? 0;
              const castLv = p.castle?.level ?? 0;
              const bCount =
                p.cityGrid?.filter((t) => t.kind !== 'EMPTY' && t.kind !== 'ROAD').length ??
                p.buildings?.length ??
                0;
              const settle = settlementVisual(cityLv, villLv, bCount);
              const castle = castLv > 0 ? castleVisual(castLv) : null;
              const kind = settleKind(cityLv, villLv, castLv, settle.label, Boolean(p.isCapital));

              const fieldTroops = (p.armies ?? [])
                .filter((a) => !a.isGarrison)
                .reduce((s, a) => s + (a.units?.reduce((u, unit) => u + unit.count, 0) ?? 0), 0);

              const showSettlement =
                lod !== 'far' || p.isCapital || cityLv >= 2 || kind === 'haupt' || kind === 'gross';

              return (
                <g
                  key={p.id}
                  className="province-poly"
                  onClick={() => {
                    if (!moved.current) onSelect(p);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Landschaft */}
                  <polygon points={poly} fill={terrainFill} fillOpacity={0.92} stroke="none" />

                  {/* Dezente Reichsfarbe – Landschaft bleibt sichtbar */}
                  {mapMode === 'political' && p.ownerId && (
                    <polygon
                      points={poly}
                      fill={ownerColor(p.ownerId)}
                      fillOpacity={0.18}
                      stroke="none"
                      className="map-realm-wash"
                    />
                  )}

                  {/* Organische Grenzlinie */}
                  <polygon
                    points={poly}
                    fill={isSelected ? 'rgba(139,26,26,0.1)' : 'transparent'}
                    stroke={isSelected ? '#8b1a1a' : p.isCapital ? '#c9a227' : border}
                    strokeWidth={isSelected ? 3.2 : p.isOwned || p.isCapital ? 2.1 : 1}
                    filter={isSelected ? 'url(#softShadow)' : undefined}
                    className={`map-province-border${isSelected ? ' selected' : ''}`}
                  />

                  {/* Bergketten (gezeichnet) */}
                  {(p.terrain === 'MOUNTAINS' || p.terrain === 'HILLS') && lod !== 'far' &&
                    mountainMarks(p.name, p.x, p.y).map((m, i) => (
                      <path
                        key={`mtn-${p.id}-${i}`}
                        d={m.d}
                        fill={p.terrain === 'MOUNTAINS' ? '#8a8680' : '#a89878'}
                        stroke="#4a453f"
                        strokeWidth={0.8}
                        opacity={0.9}
                        pointerEvents="none"
                        className="map-mountain-mark"
                      />
                    ))}

                  {/* Baumgruppen */}
                  {p.terrain === 'FOREST' && lod !== 'far' &&
                    treeMarks(p.name, p.x, p.y).map((t, i) => (
                      <g key={`tree-${p.id}-${i}`} pointerEvents="none" className="map-tree-mark map-sway" opacity={0.88}>
                        <ellipse cx={t.cx} cy={t.cy + t.r * 0.6} rx={t.r * 0.55} ry={t.r * 0.2} fill="rgba(45,74,34,0.25)" />
                        <path
                          d={`M ${t.cx} ${t.cy - t.r} L ${t.cx - t.r * 0.7} ${t.cy + t.r * 0.35} L ${t.cx + t.r * 0.7} ${t.cy + t.r * 0.35} Z`}
                          fill="#4a6b35"
                          stroke="#2d4a22"
                          strokeWidth={0.5}
                        />
                        <path
                          d={`M ${t.cx} ${t.cy - t.r * 1.35} L ${t.cx - t.r * 0.5} ${t.cy - t.r * 0.15} L ${t.cx + t.r * 0.5} ${t.cy - t.r * 0.15} Z`}
                          fill="#5a7a42"
                          stroke="#2d4a22"
                          strokeWidth={0.4}
                        />
                      </g>
                    ))}

                  {/* Nah-Dekor */}
                  {detail &&
                    nearDecor(p.name, p.x, p.y, p.terrain).map((d, i) => (
                      <g key={`decor-${p.id}-${i}`} transform={`translate(${d.px},${d.py})`} pointerEvents="none" opacity={0.8}>
                        {d.kind === 'tree' && (
                          <path d="M0 -6 L-4 3 L4 3 Z" fill="#4a6b35" stroke="#2d4a22" strokeWidth={0.5} className="map-sway" />
                        )}
                        {d.kind === 'rock' && (
                          <path d="M-3 2 L0 -4 L3 2 Z" fill="#8a8680" stroke="#4a453f" strokeWidth={0.5} />
                        )}
                        {d.kind === 'hill' && (
                          <path d="M-5 2 Q0 -4 5 2" fill="none" stroke="#8a7348" strokeWidth={1.2} />
                        )}
                        {d.kind === 'reed' && (
                          <path d="M-1 3 L-1 -4 M1 3 L1 -3 M3 3 L2 -2" stroke="#5a7a4a" strokeWidth={0.7} />
                        )}
                      </g>
                    ))}

                  {/* Ultra-Leben: Felder, Mühlen, Wagen */}
                  {ultra && (cityLv > 0 || villLv > 0) && (
                    <g pointerEvents="none" opacity={0.85} className="map-life-decor">
                      <rect x={cx - 28} y={cy + 14} width={14} height={8} rx={1} fill="#c4a86a" stroke="#6b5344" strokeWidth={0.5} />
                      <g transform={`translate(${cx + 22},${cy + 10})`}>
                        <rect x="-2" y="-2" width="4" height="8" fill="#a89070" stroke="#4a3420" strokeWidth={0.4} />
                        <path d="M0 -2 L-7 -8 M0 -2 L7 -8 M0 -2 L-7 4 M0 -2 L7 4" stroke="#6b5344" strokeWidth={0.9} />
                      </g>
                      <g transform={`translate(${cx - 10},${cy + 28})`} className="ambient-wander">
                        <rect x="-5" y="-2" width="10" height="4" rx={1} fill="#8b6914" />
                        <circle cx="-3" cy="3" r="2" fill="#4a3420" />
                        <circle cx="3" cy="3" r="2" fill="#4a3420" />
                      </g>
                    </g>
                  )}

                  {/* Siedlung / Burg */}
                  {showSettlement && (castle || cityLv > 0 || villLv > 0 || p.isCapital) && (
                    <g transform={`translate(${cx},${cy - 8})`} filter="url(#inkSoft)" className="map-settlement">
                      <SettlementArt
                        kind={kind}
                        size={castle && kind === 'burg' ? castle.size : settle.size}
                        isCapital={p.isCapital}
                      />
                    </g>
                  )}

                  {/* Banner / Wappen-Hinweis */}
                  {lod !== 'far' && p.ownerId && (cityLv > 0 || p.isOwned || p.isCapital) && (
                    <g transform={`translate(${cx + (kind === 'haupt' || kind === 'gross' ? 18 : 12)},${cy - 22})`} pointerEvents="none">
                      <rect
                        x="-5"
                        y="-7"
                        width="10"
                        height="8"
                        rx="1"
                        fill={ownerColor(p.ownerId)}
                        fillOpacity={0.75}
                        stroke="#3d2914"
                        strokeWidth={0.6}
                      />
                      <path
                        d="M-5 1 L0 7 L5 1"
                        fill={ownerColor(p.ownerId)}
                        fillOpacity={0.65}
                        stroke="#3d2914"
                        strokeWidth={0.5}
                      />
                    </g>
                  )}

                  {/* Name */}
                  {(lod === 'far' || lod === 'mid' || isSelected || p.isOwned || ultra || p.isCapital) && (
                    <text
                      x={cx}
                      y={cy + (lod === 'far' ? 6 : 22)}
                      textAnchor="middle"
                      className="map-label"
                      fontSize={lod === 'far' ? (p.isOwned || isSelected || p.isCapital ? 13 : 10) : p.isOwned || isSelected ? 12 : 10}
                      fontWeight={p.isOwned || p.isCapital ? 700 : 500}
                      fill={isSelected ? '#5c1a12' : '#3d2914'}
                      stroke="#f3e6c8"
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {p.isCapital ? `★ ${lod === 'far' && p.name.length > 9 ? p.name.slice(0, 8) + '…' : p.name}` : lod === 'far' && p.name.length > 10 ? p.name.slice(0, 9) + '…' : p.name}
                    </text>
                  )}

                  {lod === 'mid' && p.ownerName && (
                    <text
                      x={cx}
                      y={cy + 34}
                      textAnchor="middle"
                      fontSize={8}
                      fill="#5c4a38"
                      stroke="#f3e6c8"
                      strokeWidth={2}
                      paintOrder="stroke"
                    >
                      {p.ownerName.length > 14 ? p.ownerName.slice(0, 13) + '…' : p.ownerName}
                    </text>
                  )}

                  {fieldTroops > 0 && lod !== 'far' && (
                    <g>
                      <circle cx={cx + 38} cy={cy - 22} r={11} fill="#6b1515" stroke="#c9a227" strokeWidth={1.5} />
                      <text x={cx + 38} y={cy - 18} textAnchor="middle" fontSize={8} fill="#fff8e0" fontWeight="bold">
                        {fieldTroops}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Ambient (SVG-Silhouetten statt Emoji) */}
            {lod !== 'far' &&
              ambient.map((a) => (
                <g
                  key={a.id}
                  transform={`translate(${a.x},${a.y})`}
                  className={a.kind === 'flag' ? 'ambient-flag' : a.kind === 'smoke' ? 'map-smoke' : 'ambient-wander'}
                  style={{ animationDelay: `${a.delay}s`, animationDuration: `${a.duration}s` }}
                  opacity={detail ? (ultra ? 0.95 : 0.8) : 0.55}
                  pointerEvents="none"
                >
                  {a.kind === 'sheep' && <ellipse cx="0" cy="0" rx="5" ry="3.2" fill="#f0ebe0" stroke="#8a8680" strokeWidth={0.6} />}
                  {(a.kind === 'peasant' || a.kind === 'hunter' || a.kind === 'soldier' || a.kind === 'knight' || a.kind === 'merchant' || a.kind === 'child') && (
                    <>
                      <circle cx="0" cy="-4" r="2.2" fill="#e8dcc8" stroke="#4a3420" strokeWidth={0.4} />
                      <path d="M-2.5 5 L0 -1 L2.5 5 Z" fill={a.kind === 'soldier' || a.kind === 'knight' ? '#5a4a3a' : '#6b5344'} />
                    </>
                  )}
                  {(a.kind === 'cow' || a.kind === 'horse' || a.kind === 'deer' || a.kind === 'wolf' || a.kind === 'bear') && (
                    <ellipse cx="0" cy="0" rx="5.5" ry="3" fill={a.kind === 'wolf' || a.kind === 'bear' ? '#5a5048' : '#8a7348'} stroke="#3d2914" strokeWidth={0.5} />
                  )}
                  {a.kind === 'boat' && (
                    <path d="M-6 2 L6 2 L4 5 L-4 5 Z" fill="#6b5344" stroke="#3d2914" strokeWidth={0.5} />
                  )}
                  {a.kind === 'cart' && (
                    <>
                      <rect x="-6" y="-2" width="12" height="5" rx="1" fill="#8b6914" />
                      <circle cx="-3.5" cy="4" r="2.2" fill="#4a3420" />
                      <circle cx="3.5" cy="4" r="2.2" fill="#4a3420" />
                    </>
                  )}
                  {a.kind === 'mill' && (
                    <>
                      <rect x="-2" y="-2" width="4" height="9" fill="#a89070" stroke="#4a3420" strokeWidth={0.5} />
                      <path d="M0 -2 L-8 -8 M0 -2 L8 -8 M0 -2 L-8 4 M0 -2 L8 4" stroke="#6b5344" strokeWidth={1.1} />
                    </>
                  )}
                  {a.kind === 'farm' && (
                    <rect x="-7" y="-3" width="14" height="7" rx="1" fill="#c4a86a" stroke="#6b5344" strokeWidth={0.5} />
                  )}
                  {a.kind === 'smoke' && <circle cx="0" cy="0" r="3" fill="#9a9088" opacity={0.5} />}
                  {a.kind === 'flag' && (
                    <>
                      <line x1="0" y1="6" x2="0" y2="-8" stroke="#3d2914" strokeWidth={1} />
                      <path d="M0 -8 L8 -5 L0 -2 Z" fill="#8b1a1a" />
                    </>
                  )}
                  {a.kind === 'bell' && <circle cx="0" cy="0" r="3" fill="#c9a227" stroke="#4a3420" strokeWidth={0.5} />}
                </g>
              ))}

            {/* Marschierende Armeen */}
            {marchingArmies.map((army) => {
              const from = provinces.find((p) => p.id === army.provinceId);
              const to = provinces.find((p) => p.id === army.targetProvinceId);
              if (!from || !to) return null;
              const a = provinceCenter(from.x, from.y);
              const b = provinceCenter(to.x, to.y);
              const mx = (a.cx + b.cx) / 2;
              const my = (a.cy + b.cy) / 2;
              return (
                <g key={army.id}>
                  <line
                    x1={a.cx}
                    y1={a.cy}
                    x2={b.cx}
                    y2={b.cy}
                    stroke="#8b1a1a"
                    strokeWidth={2.5}
                    strokeDasharray="8 5"
                    className="march-line"
                  />
                  <circle cx={mx} cy={my} r={12} fill="#8b1a1a" stroke="#c9a227" strokeWidth={1.2} />
                  <text x={mx} y={my + 4} textAnchor="middle" fontSize={11} fill="#fff8e0" fontWeight="bold">
                    →
                  </text>
                </g>
              );
            })}

            {/* Kompass */}
            <g transform={`translate(${width - 70}, 40)`} opacity={0.55} pointerEvents="none">
              <circle r="16" fill="none" stroke="#4a3420" strokeWidth="1.2" />
              <path d="M0 -12 L3 0 L0 12 L-3 0 Z" fill="#8b1a1a" />
              <text y="24" textAnchor="middle" fontSize="9" fill="#4a3420" className="map-label">
                N
              </text>
            </g>
          </g>
        </svg>
      </div>

      <div className="absolute bottom-2 left-2 z-20 flex flex-wrap gap-2 max-w-[75%] pointer-events-none">
        {ownerIds.map((id, i) => {
          const name = provinces.find((p) => p.ownerId === id)?.ownerName ?? 'Reich';
          return (
            <span
              key={id}
              className="text-[10px] px-2 py-0.5 rounded bg-[#f3e6c8]/90 text-[#3d2914] border border-[#8b6914]/40 flex items-center gap-1"
            >
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block border border-[#3d2914]/40"
                style={{ background: REALM_COLORS[i % REALM_COLORS.length] }}
              />
              {name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
