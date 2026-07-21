/**
 * Canvas-Zeichnungen: Terrain, Siedlungen, Leben.
 * Nur Darstellung – keine Spiellogik.
 */
import { hash, nameSeed, type MeshProvince, type RiverPath, type RoadSeg, TERRAIN_PAINT } from './worldMesh';

export function drawParchment(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w * 0.42, h * 0.32, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
  g.addColorStop(0, '#f4e8c8');
  g.addColorStop(0.45, '#e6d2a6');
  g.addColorStop(1, '#c9b07a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Papierkörnung
  ctx.fillStyle = 'rgba(74,52,28,0.035)';
  for (let i = 0; i < 180; i++) {
    const x = hash(i * 7.1) * w;
    const y = hash(i * 13.3) * h;
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + hash(i) * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ozean-Wash am Rand
  const sea = ctx.createRadialGradient(w * 0.5, h * 0.55, w * 0.15, w * 0.5, h * 0.5, w * 0.62);
  sea.addColorStop(0, 'transparent');
  sea.addColorStop(0.7, 'rgba(120,150,160,0.08)');
  sea.addColorStop(1, 'rgba(90,120,140,0.28)');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, w, h);
}

export function drawProvinceFill(
  ctx: CanvasRenderingContext2D,
  mesh: MeshProvince,
  opts: { selected: boolean; realmWash?: string; political: boolean },
) {
  const paint = TERRAIN_PAINT[mesh.terrain] ?? TERRAIN_PAINT.PLAINS;
  ctx.fillStyle = paint.fill;
  ctx.fill(mesh.path);

  if (opts.political && opts.realmWash) {
    ctx.fillStyle = opts.realmWash;
    ctx.fill(mesh.path);
  }

  if (opts.selected) {
    ctx.fillStyle = 'rgba(139,26,26,0.12)';
    ctx.fill(mesh.path);
  }

  ctx.strokeStyle = opts.selected ? '#8b1a1a' : paint.ink;
  ctx.lineWidth = opts.selected ? 2.4 : 1.05;
  ctx.lineJoin = 'round';
  ctx.stroke(mesh.path);
}

export function drawMountains(ctx: CanvasRenderingContext2D, mesh: MeshProvince, detail: boolean) {
  if (mesh.terrain !== 'MOUNTAINS' && mesh.terrain !== 'HILLS') return;
  const seed = nameSeed(mesh.name);
  const n = mesh.terrain === 'MOUNTAINS' ? 4 + Math.floor(hash(seed) * 3) : 2 + Math.floor(hash(seed) * 2);
  for (let i = 0; i < n; i++) {
    const ox = mesh.cx + (hash(seed + i * 2) - 0.5) * 70;
    const oy = mesh.cy + (hash(seed + i * 3) - 0.5) * 40;
    const h = (mesh.terrain === 'MOUNTAINS' ? 16 : 10) + hash(seed + i) * 14;
    const w = 10 + hash(seed + i + 1) * 12;
    ctx.beginPath();
    ctx.moveTo(ox - w, oy);
    ctx.lineTo(ox, oy - h);
    ctx.lineTo(ox + w, oy);
    ctx.closePath();
    ctx.fillStyle = mesh.terrain === 'MOUNTAINS' ? '#8a8680' : '#a89878';
    ctx.strokeStyle = '#4a453f';
    ctx.lineWidth = 0.9;
    ctx.fill();
    ctx.stroke();
    // Schnee/Licht
    if (detail && mesh.terrain === 'MOUNTAINS') {
      ctx.beginPath();
      ctx.moveTo(ox - w * 0.15, oy - h * 0.7);
      ctx.lineTo(ox, oy - h);
      ctx.lineTo(ox + w * 0.25, oy - h * 0.55);
      ctx.closePath();
      ctx.fillStyle = 'rgba(242,239,232,0.85)';
      ctx.fill();
    }
  }
}

export function drawForest(ctx: CanvasRenderingContext2D, mesh: MeshProvince, sway: number) {
  if (mesh.terrain !== 'FOREST') return;
  const seed = nameSeed(mesh.name);
  const n = 10 + Math.floor(hash(seed) * 10);
  for (let i = 0; i < n; i++) {
    const tx = mesh.cx + (hash(seed + i * 4) - 0.5) * 90;
    const ty = mesh.cy + (hash(seed + i * 5) - 0.5) * 70;
    const r = 4 + hash(seed + i) * 5;
    const lean = Math.sin(sway + i) * 0.8;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate((lean * Math.PI) / 180);
    // Schatten
    ctx.fillStyle = 'rgba(45,74,34,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.55, r * 0.5, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stamm
    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.4);
    ctx.lineTo(0, -r * 0.1);
    ctx.stroke();
    // Kronen
    ctx.fillStyle = '#4a6b35';
    ctx.strokeStyle = '#2d4a22';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(-r * 0.75, r * 0.25);
    ctx.lineTo(r * 0.75, r * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5a7a42';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.35);
    ctx.lineTo(-r * 0.55, -r * 0.15);
    ctx.lineTo(r * 0.55, -r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function drawRivers(ctx: CanvasRenderingContext2D, rivers: RiverPath[], t: number, near: boolean) {
  for (const river of rivers) {
    if (river.d.length < 2) continue;
    // Unterströmung
    ctx.beginPath();
    ctx.moveTo(river.d[0].x, river.d[0].y);
    for (let i = 1; i < river.d.length; i++) ctx.lineTo(river.d[i].x, river.d[i].y);
    ctx.strokeStyle = 'rgba(106,138,154,0.35)';
    ctx.lineWidth = river.width * (near ? 3.2 : 2.4);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(river.d[0].x, river.d[0].y);
    for (let i = 1; i < river.d.length; i++) {
      const wobble = Math.sin(t * 0.002 + i * 0.4) * 0.6;
      ctx.lineTo(river.d[i].x + wobble, river.d[i].y);
    }
    ctx.strokeStyle = '#5a8aa0';
    ctx.lineWidth = river.width * (near ? 1.8 : 1.3);
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Verbreiterung Richtung Mündung
    if (near) {
      const last = river.d[river.d.length - 1];
      ctx.fillStyle = 'rgba(90,138,160,0.35)';
      ctx.beginPath();
      ctx.ellipse(last.x, last.y, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawRoads(ctx: CanvasRenderingContext2D, roads: RoadSeg[], detail: boolean) {
  for (const r of roads) {
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1);
    ctx.quadraticCurveTo(r.mx, r.my, r.x2, r.y2);
    ctx.strokeStyle = 'rgba(92,64,51,0.75)';
    ctx.lineWidth = detail ? 2.8 : 1.8;
    ctx.lineCap = 'round';
    if (!detail) ctx.setLineDash([7, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Heller Mittelstreifen
    if (detail) {
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1);
      ctx.quadraticCurveTo(r.mx, r.my, r.x2, r.y2);
      ctx.strokeStyle = 'rgba(196,168,130,0.45)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }
}

export function drawBridges(ctx: CanvasRenderingContext2D, roads: RoadSeg[], rivers: RiverPath[]) {
  // Dekorative Brücken nahe Fluss-Mittelpunkten
  for (const river of rivers) {
    const mid = river.d[Math.floor(river.d.length / 2)];
    if (!mid) continue;
    const nearRoad = roads.some((r) => {
      const dx = (r.x1 + r.x2) / 2 - mid.x;
      const dy = (r.y1 + r.y2) / 2 - mid.y;
      return dx * dx + dy * dy < 55 * 55;
    });
    if (!nearRoad && hash(mid.x + mid.y) > 0.4) continue;
    ctx.fillStyle = '#8a7348';
    ctx.strokeStyle = '#4a3420';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.rect(mid.x - 9, mid.y - 4, 18, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#c4a882';
    ctx.beginPath();
    ctx.moveTo(mid.x - 7, mid.y);
    ctx.lineTo(mid.x + 7, mid.y);
    ctx.stroke();
  }
}

type SettleKind = 'weiler' | 'dorf' | 'stadt' | 'metropole' | 'burg' | 'haupt';

export function settleKindOf(p: {
  city?: { level: number } | null;
  village?: { level: number } | null;
  castle?: { level: number } | null;
  isCapital?: boolean;
  population: number;
}): SettleKind {
  if (p.isCapital) return 'haupt';
  const city = p.city?.level ?? 0;
  const vill = p.village?.level ?? 0;
  const cast = p.castle?.level ?? 0;
  if (cast > 0 && city === 0 && vill < 2) return 'burg';
  if (city >= 3 || p.population >= 2200) return 'metropole';
  if (city >= 1) return 'stadt';
  if (vill >= 2) return 'dorf';
  if (vill >= 1 || cast > 0) return 'dorf';
  return 'weiler';
}

export function drawSettlement(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  kind: SettleKind,
  opts: { scale: number; flagPhase: number; smokePhase: number; label: string; showLabel: boolean },
) {
  const s = opts.scale;
  ctx.save();
  ctx.translate(cx, cy - 4);

  // Schatten
  ctx.fillStyle = 'rgba(60,40,20,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 8 * s, (kind === 'haupt' || kind === 'metropole' ? 16 : 9) * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  if (kind === 'burg') {
    drawCastle(ctx, s, opts.flagPhase);
  } else if (kind === 'weiler' || kind === 'dorf') {
    drawVillage(ctx, s, kind === 'dorf');
  } else if (kind === 'stadt') {
    drawTown(ctx, s, opts.smokePhase);
  } else {
    drawMetropolis(ctx, s, opts.flagPhase, opts.smokePhase, kind === 'haupt');
  }

  if (opts.showLabel) {
    ctx.font = `600 ${Math.max(9, 11 * s)}px Cinzel, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f3e6c8';
    ctx.fillStyle = '#3d2914';
    const y = (kind === 'haupt' || kind === 'metropole' ? 28 : 20) * s;
    const text = kind === 'haupt' ? `★ ${opts.label}` : opts.label;
    ctx.strokeText(text, 0, y);
    ctx.fillText(text, 0, y);
  }
  ctx.restore();
}

function drawCastle(ctx: CanvasRenderingContext2D, s: number, flagPhase: number) {
  ctx.fillStyle = '#8b7355';
  ctx.strokeStyle = '#3d2914';
  ctx.lineWidth = 1.1 * s;
  ctx.beginPath();
  ctx.moveTo(-10 * s, 6 * s);
  ctx.lineTo(-10 * s, -4 * s);
  ctx.lineTo(-6 * s, -4 * s);
  ctx.lineTo(-6 * s, -9 * s);
  ctx.lineTo(-2 * s, -9 * s);
  ctx.lineTo(-2 * s, -4 * s);
  ctx.lineTo(2 * s, -4 * s);
  ctx.lineTo(2 * s, -9 * s);
  ctx.lineTo(6 * s, -9 * s);
  ctx.lineTo(6 * s, -4 * s);
  ctx.lineTo(10 * s, -4 * s);
  ctx.lineTo(10 * s, 6 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Dach
  ctx.fillStyle = '#6b5344';
  ctx.beginPath();
  ctx.moveTo(-10 * s, -4 * s);
  ctx.lineTo(0, -14 * s);
  ctx.lineTo(10 * s, -4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Zugbrücke-Hinweis
  ctx.fillStyle = '#5c4033';
  ctx.fillRect(-2.5 * s, 2 * s, 5 * s, 4 * s);
  // Fahne
  const wave = Math.sin(flagPhase) * 2 * s;
  ctx.strokeStyle = '#3d2914';
  ctx.beginPath();
  ctx.moveTo(0, -14 * s);
  ctx.lineTo(0, -22 * s);
  ctx.stroke();
  ctx.fillStyle = '#8b1a1a';
  ctx.beginPath();
  ctx.moveTo(0, -22 * s);
  ctx.lineTo(8 * s + wave, -19 * s);
  ctx.lineTo(0, -16 * s);
  ctx.closePath();
  ctx.fill();
}

function drawVillage(ctx: CanvasRenderingContext2D, s: number, withChurch: boolean) {
  // Häuser
  for (const [ox, oy] of [
    [-8, 2],
    [6, 3],
    [0, 4],
  ] as const) {
    ctx.fillStyle = '#c4a574';
    ctx.strokeStyle = '#3d2914';
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.moveTo((ox - 5) * s, (oy + 4) * s);
    ctx.lineTo((ox - 5) * s, oy * s);
    ctx.lineTo(ox * s, (oy - 5) * s);
    ctx.lineTo((ox + 5) * s, oy * s);
    ctx.lineTo((ox + 5) * s, (oy + 4) * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6b5344';
    ctx.beginPath();
    ctx.moveTo((ox - 5.5) * s, oy * s);
    ctx.lineTo(ox * s, (oy - 5.5) * s);
    ctx.lineTo((ox + 5.5) * s, oy * s);
    ctx.closePath();
    ctx.fill();
  }
  if (withChurch) {
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(10 * s, -2 * s, 4 * s, 8 * s);
    ctx.fillStyle = '#6b5344';
    ctx.beginPath();
    ctx.moveTo(9 * s, -2 * s);
    ctx.lineTo(12 * s, -8 * s);
    ctx.lineTo(15 * s, -2 * s);
    ctx.closePath();
    ctx.fill();
  }
  // Felder
  ctx.strokeStyle = 'rgba(138,115,64,0.55)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 3; i++) {
    ctx.strokeRect((-18 + i * 8) * s, 10 * s, 6 * s, 4 * s);
  }
}

function drawTown(ctx: CanvasRenderingContext2D, s: number, smoke: number) {
  ctx.fillStyle = 'rgba(196,165,116,0.45)';
  ctx.strokeStyle = '#6b5344';
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.ellipse(0, 2 * s, 14 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Häuserblock
  ctx.fillStyle = '#b8956c';
  ctx.strokeStyle = '#3d2914';
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(-10 * s, 6 * s);
  ctx.lineTo(-10 * s, -2 * s);
  ctx.lineTo(0, -10 * s);
  ctx.lineTo(10 * s, -2 * s);
  ctx.lineTo(10 * s, 6 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6b5344';
  ctx.beginPath();
  ctx.moveTo(-10 * s, -2 * s);
  ctx.lineTo(0, -10 * s);
  ctx.lineTo(10 * s, -2 * s);
  ctx.closePath();
  ctx.fill();
  // Kirche
  ctx.fillStyle = '#8b7355';
  ctx.fillRect(-2 * s, -4 * s, 4 * s, 10 * s);
  ctx.beginPath();
  ctx.moveTo(-3 * s, -4 * s);
  ctx.lineTo(0, -12 * s);
  ctx.lineTo(3 * s, -4 * s);
  ctx.closePath();
  ctx.fillStyle = '#6b5344';
  ctx.fill();
  // Rauch
  ctx.fillStyle = `rgba(160,150,140,${0.35 + Math.sin(smoke) * 0.15})`;
  ctx.beginPath();
  ctx.arc(6 * s, (-14 - Math.sin(smoke) * 3) * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawMetropolis(
  ctx: CanvasRenderingContext2D,
  s: number,
  flagPhase: number,
  smoke: number,
  capital: boolean,
) {
  // Stadtmauer
  ctx.fillStyle = 'rgba(196,165,116,0.5)';
  ctx.strokeStyle = '#6b5344';
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  ctx.ellipse(0, 4 * s, 22 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Türme der Mauer
  for (const ang of [0.3, 1.2, 2.1, 3.5, 4.8, 5.6]) {
    const tx = Math.cos(ang) * 20 * s;
    const ty = Math.sin(ang) * 10 * s + 4 * s;
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(tx - 2 * s, ty - 6 * s, 4 * s, 8 * s);
  }
  // Schloss
  ctx.fillStyle = '#7a6550';
  ctx.strokeStyle = '#2a1a0c';
  ctx.lineWidth = 1 * s;
  ctx.fillRect(-16 * s, -2 * s, 10 * s, 10 * s);
  ctx.strokeRect(-16 * s, -2 * s, 10 * s, 10 * s);
  // Kathedrale
  ctx.fillStyle = '#8b7355';
  ctx.beginPath();
  ctx.moveTo(-4 * s, 6 * s);
  ctx.lineTo(-4 * s, -8 * s);
  ctx.lineTo(0, -18 * s);
  ctx.lineTo(4 * s, -8 * s);
  ctx.lineTo(4 * s, 6 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.moveTo(0, -18 * s);
  ctx.lineTo(5 * s, -15 * s);
  ctx.lineTo(0, -13 * s);
  ctx.closePath();
  ctx.fill();
  // Markt
  ctx.fillStyle = 'rgba(201,162,39,0.4)';
  ctx.beginPath();
  ctx.arc(10 * s, 4 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a227';
  ctx.stroke();
  // Häuser-Cluster
  ctx.fillStyle = '#b8956c';
  for (const [hx, hy] of [
    [12, -4],
    [16, 2],
    [-8, 8],
    [6, 10],
  ] as const) {
    ctx.fillRect(hx * s, hy * s, 5 * s, 4 * s);
  }
  // Fahne
  if (capital) {
    const wave = Math.sin(flagPhase) * 2.5 * s;
    ctx.strokeStyle = '#3d2914';
    ctx.beginPath();
    ctx.moveTo(14 * s, -8 * s);
    ctx.lineTo(14 * s, -20 * s);
    ctx.stroke();
    ctx.fillStyle = '#8b1a1a';
    ctx.beginPath();
    ctx.moveTo(14 * s, -20 * s);
    ctx.lineTo(22 * s + wave, -17 * s);
    ctx.lineTo(14 * s, -14 * s);
    ctx.closePath();
    ctx.fill();
  }
  // Rauch
  ctx.fillStyle = `rgba(160,150,140,${0.4 + Math.sin(smoke) * 0.12})`;
  ctx.beginPath();
  ctx.arc(-6 * s, (-16 - Math.sin(smoke) * 4) * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4 * s, (-12 - Math.cos(smoke) * 3) * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBanner(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#3d2914';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.rect(x - 5, y - 8, 10, 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x + 5, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawLifeActors(
  ctx: CanvasRenderingContext2D,
  meshes: MeshProvince[],
  provinces: Array<{ id: string; terrain: string; city?: { level: number } | null }>,
  t: number,
  ultra: boolean,
) {
  if (!ultra) return;
  for (const m of meshes) {
    const p = provinces.find((x) => x.id === m.id);
    if (!p) continue;
    const seed = nameSeed(m.name);
    // Bauer / Schaf / Wagen
    if (p.terrain === 'PLAINS' || p.terrain === 'HILLS') {
      const ax = m.cx + Math.sin(t * 0.0004 + seed) * 28;
      const ay = m.cy + 18 + Math.cos(t * 0.0003 + seed) * 8;
      ctx.fillStyle = '#e8dcc8';
      ctx.beginPath();
      ctx.arc(ax, ay - 4, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6b5344';
      ctx.beginPath();
      ctx.moveTo(ax - 2.5, ay + 5);
      ctx.lineTo(ax, ay - 1);
      ctx.lineTo(ax + 2.5, ay + 5);
      ctx.closePath();
      ctx.fill();
      // Schaf
      ctx.fillStyle = '#f0ebe0';
      ctx.beginPath();
      ctx.ellipse(m.cx - 20, m.cy + 22, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.terrain === 'COAST') {
      const sx = m.cx + Math.sin(t * 0.0005 + seed) * 40;
      const sy = m.cy + 10;
      ctx.fillStyle = '#6b5344';
      ctx.beginPath();
      ctx.moveTo(sx - 7, sy);
      ctx.lineTo(sx + 7, sy);
      ctx.lineTo(sx + 4, sy + 4);
      ctx.lineTo(sx - 4, sy + 4);
      ctx.closePath();
      ctx.fill();
    }
    if (p.city && p.city.level > 0) {
      // Händlerwagen
      const wx = m.cx + Math.cos(t * 0.00035 + seed) * 35;
      const wy = m.cy + 16;
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(wx - 6, wy - 2, 12, 5);
      ctx.fillStyle = '#4a3420';
      ctx.beginPath();
      ctx.arc(wx - 3.5, wy + 4, 2.2, 0, Math.PI * 2);
      ctx.arc(wx + 3.5, wy + 4, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawCompass(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#4a3420';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#8b1a1a';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(3, 0);
  ctx.lineTo(0, 12);
  ctx.lineTo(-3, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4a3420';
  ctx.font = '9px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', 0, 28);
  ctx.restore();
}

export function drawLakes(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const lakes = [
    { cx: width * 0.28, cy: height * 0.42, rx: 28, ry: 16 },
    { cx: width * 0.62, cy: height * 0.28, rx: 22, ry: 14 },
    { cx: width * 0.48, cy: height * 0.62, rx: 30, ry: 15 },
  ];
  for (const l of lakes) {
    ctx.fillStyle = 'rgba(122,154,170,0.35)';
    ctx.beginPath();
    ctx.ellipse(l.cx, l.cy, l.rx + 3, l.ry + 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(143,176,184,0.75)';
    ctx.strokeStyle = '#5a7a88';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(l.cx, l.cy, l.rx, l.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
