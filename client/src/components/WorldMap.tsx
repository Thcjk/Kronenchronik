import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Province, Army } from '../api/client';
import {
  buildWorldMesh,
  buildOrganicRoads,
  buildRivers,
  hitTest,
  zoomLod,
  REALM_WASH,
} from '../map/worldMesh';
import {
  drawParchment,
  drawProvinceFill,
  drawMountains,
  drawForest,
  drawRivers,
  drawRoads,
  drawBridges,
  drawSettlement,
  settleKindOf,
  drawBanner,
  drawLifeActors,
  drawCompass,
  drawLakes,
} from '../map/drawWorld';

interface WorldMapProps {
  provinces: Province[];
  armies: Army[];
  selectedId: string | null;
  onSelect: (province: Province) => void;
  mapMode?: 'terrain' | 'political';
  season?: string;
  weather?: string;
}

/**
 * Komplett neuer Canvas-Weltkarten-Renderer.
 * Kein Hex, kein Raster, keine Kacheln – organische Pergamentkarte.
 */
export default function WorldMap({
  provinces,
  armies,
  selectedId,
  onSelect,
  mapMode = 'political',
  season,
  weather,
}: WorldMapProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 0.85 });
  const dragging = useRef(false);
  const moved = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const animRef = useRef(0);
  const timeRef = useRef(0);

  const meshData = useMemo(() => {
    return buildWorldMesh(
      provinces.map((p) => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        terrain: p.terrain,
        neighbors: p.neighbors,
      })),
    );
  }, [provinces]);

  const roads = useMemo(
    () => buildOrganicRoads(provinces, meshData.sites),
    [provinces, meshData.sites],
  );

  const rivers = useMemo(
    () => buildRivers(provinces, meshData.sites, meshData.width, meshData.height),
    [provinces, meshData],
  );

  const ownerIds = useMemo(
    () => [...new Set(provinces.map((p) => p.ownerId).filter(Boolean))] as string[],
    [provinces],
  );

  const provinceById = useMemo(() => {
    const m = new Map<string, Province>();
    for (const p of provinces) m.set(p.id, p);
    return m;
  }, [provinces]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = wrap.clientWidth;
    const cssH = wrap.clientHeight;
    if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const t = timeRef.current;
    const lod = zoomLod(view.scale);
    const detail = lod === 'near' || lod === 'ultra';
    const ultra = lod === 'ultra';
    const mid = lod !== 'far';

    // Kamera
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

    drawParchment(ctx, meshData.width, meshData.height);
    drawLakes(ctx, meshData.width, meshData.height);

    // Provinzen – Landschaft zuerst
    for (const mesh of meshData.meshes) {
      const p = provinceById.get(mesh.id);
      const ownerIdx = p?.ownerId ? ownerIds.indexOf(p.ownerId) : -1;
      drawProvinceFill(ctx, mesh, {
        selected: selectedId === mesh.id,
        political: mapMode === 'political',
        realmWash: ownerIdx >= 0 ? REALM_WASH[ownerIdx % REALM_WASH.length] : undefined,
      });
    }

    // Terrain-Details
    if (mid) {
      for (const mesh of meshData.meshes) {
        drawMountains(ctx, mesh, detail);
        drawForest(ctx, mesh, t * 0.002);
      }
    }

    drawRivers(ctx, rivers, t, detail);
    if (mid) {
      drawRoads(ctx, roads, detail);
      if (detail) drawBridges(ctx, roads, rivers);
    }

    // Siedlungen
    for (const mesh of meshData.meshes) {
      const p = provinceById.get(mesh.id);
      if (!p) continue;
      const kind = settleKindOf(p);
      const showFar = p.isCapital || kind === 'haupt' || kind === 'metropole' || kind === 'stadt';
      if (lod === 'far' && !showFar) continue;

      const scale =
        kind === 'haupt' || kind === 'metropole'
          ? detail
            ? 1.15
            : 0.95
          : kind === 'stadt'
            ? detail
              ? 0.95
              : 0.8
            : kind === 'burg'
              ? 0.85
              : 0.7;

      drawSettlement(ctx, mesh.cx, mesh.cy, kind, {
        scale,
        flagPhase: t * 0.004,
        smokePhase: t * 0.003,
        label: p.name,
        showLabel: lod !== 'far' || Boolean(p.isCapital) || kind === 'metropole' || kind === 'haupt',
      });

      if (mid && p.ownerId) {
        const oi = ownerIds.indexOf(p.ownerId);
        const wash = REALM_WASH[oi % REALM_WASH.length] ?? 'rgba(139,105,20,0.4)';
        // Banner-Farbe aus Wash ableiten
        drawBanner(ctx, mesh.cx + 18, mesh.cy - 22, wash.replace('0.16', '0.7'));
      }

      const fieldTroops = (p.armies ?? [])
        .filter((a) => !a.isGarrison)
        .reduce((s, a) => s + (a.units?.reduce((u, unit) => u + unit.count, 0) ?? 0), 0);
      if (fieldTroops > 0 && mid) {
        ctx.fillStyle = '#6b1515';
        ctx.strokeStyle = '#c9a227';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mesh.cx + 36, mesh.cy - 20, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff8e0';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(fieldTroops), mesh.cx + 36, mesh.cy - 16);
      }
    }

    drawLifeActors(ctx, meshData.meshes, provinces, t, ultra);

    // Marschierende Armeen
    for (const army of armies.filter((a) => a.status === 'MARCHING')) {
      if (!army.provinceId) continue;
      const from = meshData.byId.get(army.provinceId);
      const to = army.targetProvinceId ? meshData.byId.get(army.targetProvinceId) : null;
      if (!from || !to) continue;
      ctx.strokeStyle = '#8b1a1a';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 5]);
      ctx.lineDashOffset = -t * 0.05;
      ctx.beginPath();
      ctx.moveTo(from.cx, from.cy);
      ctx.lineTo(to.cx, to.cy);
      ctx.stroke();
      ctx.setLineDash([]);
      const mx = (from.cx + to.cx) / 2;
      const my = (from.cy + to.cy) / 2;
      ctx.fillStyle = '#8b1a1a';
      ctx.strokeStyle = '#c9a227';
      ctx.beginPath();
      ctx.arc(mx, my, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff8e0';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('→', mx, my + 4);
    }

    drawCompass(ctx, meshData.width - 50, 50);
    ctx.restore();

    // Jahreszeit / Wetter Overlay
    if (season || weather) {
      ctx.fillStyle =
        weather === 'rain'
          ? 'rgba(60,80,110,0.08)'
          : weather === 'snow'
            ? 'rgba(255,255,255,0.1)'
            : season === 'autumn'
              ? 'rgba(180,90,30,0.06)'
              : 'transparent';
      if (ctx.fillStyle !== 'transparent') ctx.fillRect(0, 0, cssW, cssH);
    }
  }, [
    view,
    meshData,
    roads,
    rivers,
    provinces,
    armies,
    selectedId,
    mapMode,
    ownerIds,
    provinceById,
    season,
    weather,
  ]);

  useEffect(() => {
    let alive = true;
    const loop = (ts: number) => {
      if (!alive) return;
      timeRef.current = ts;
      paint();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [paint]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [paint]);

  const screenToWorld = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return { x: 0, y: 0 };
    const rect = wrap.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale,
    };
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setView((v) => {
      const next = Math.min(2.8, Math.max(0.4, v.scale * factor));
      const wx = (mx - v.x) / v.scale;
      const wy = (my - v.y) / v.scale;
      return {
        scale: next,
        x: mx - wx * next,
        y: my - wy * next,
      };
    });
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
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    if (moved.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = screenToWorld(e.clientX, e.clientY);
    // Hit-test in Weltkoordinaten: Path2D ist in Weltkoordinaten –
    // isPointInPath braucht transformierten Kontext ODER untransformierte Punkte.
    // Paths sind in Welt-Koordinaten → Punkt muss Welt sein, Kontext Identity.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const id = hitTest(meshData.meshes, w.x, w.y, ctx);
    ctx.restore();
    if (id) {
      const p = provinceById.get(id);
      if (p) onSelect(p);
    }
  };

  const lod = zoomLod(view.scale);

  return (
    <div className="world-map-shell parchment-map-v2 relative w-full h-full overflow-hidden" ref={wrapRef}>
      <div className="absolute top-2 left-2 z-20 panel px-2 py-1 text-[10px] text-parchment/70 pointer-events-none">
        {lod === 'far' && 'Kontinente & Reiche'}
        {lod === 'mid' && 'Provinzen · Straßen · Flüsse'}
        {lod === 'near' && 'Siedlungen · Wälder · Berge'}
        {lod === 'ultra' && 'Leben auf der Karte'}
        {season ? ` · ${season}` : ''}
        {weather ? ` · ${weather}` : ''}
      </div>

      <div className="absolute top-2 right-2 z-20 flex gap-1">
        <button
          type="button"
          className="map-ctrl"
          title="Heranzoomen"
          onClick={() => setView((v) => ({ ...v, scale: Math.min(2.8, v.scale * 1.2) }))}
        >
          +
        </button>
        <button
          type="button"
          className="map-ctrl"
          title="Wegzoomen"
          onClick={() => setView((v) => ({ ...v, scale: Math.max(0.4, v.scale * 0.8) }))}
        >
          −
        </button>
        <button
          type="button"
          className="map-ctrl"
          title="Gesamte Karte"
          onClick={() => setView({ x: 20, y: 10, scale: 0.85 })}
        >
          ⌂
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none cursor-grab active:cursor-grabbing block"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          dragging.current = false;
        }}
        role="img"
        aria-label="Handgezeichnete Weltkarte von Kronenchronik"
      />

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
                style={{ background: REALM_WASH[i % REALM_WASH.length].replace('0.16', '0.85') }}
              />
              {name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
