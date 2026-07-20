/**
 * Weltkarten-Geometrie – Pergament / historische Landkarte
 * Nur Darstellung; Spielmechanik (x/y/neighbors) bleibt unverändert.
 */

export const CELL_W = 148;
export const CELL_H = 118;
const PAD = 2;

export function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function nameSeed(name: string) {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

/** Organisches Provinzpolygon – füllt die Zelle, handgezeichnete Kanten */
export function provincePolygon(x: number, y: number, name: string): string {
  const seed = nameSeed(name);
  const cx = x * CELL_W + CELL_W / 2;
  const cy = y * CELL_H + CELL_H / 2;
  const sides = 10 + Math.floor(hash(seed) * 4);
  const points: string[] = [];

  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    // Wenig Lücke zum Nachbarn → zusammenhängendes Land
    const jitter = 0.88 + hash(seed + i * 7) * 0.14;
    const wobble = 1 + (hash(seed + i * 13) - 0.5) * 0.08;
    const rx = (CELL_W / 2 - PAD) * jitter * wobble;
    const ry = (CELL_H / 2 - PAD) * jitter * wobble;
    points.push(`${(cx + Math.cos(angle) * rx).toFixed(1)},${(cy + Math.sin(angle) * ry).toFixed(1)}`);
  }
  return points.join(' ');
}

export function provinceCenter(x: number, y: number) {
  return {
    cx: x * CELL_W + CELL_W / 2,
    cy: y * CELL_H + CELL_H / 2,
  };
}

export function mapBounds(maxX: number, maxY: number) {
  return {
    width: (maxX + 1) * CELL_W + 100,
    height: (maxY + 1) * CELL_H + 100,
  };
}

/** Pergament-Terrain (gedämpft, Landschaft bleibt lesbar) */
export const TERRAIN_FILL: Record<string, string> = {
  PLAINS: '#c5b896',
  FOREST: '#8a9a6e',
  HILLS: '#b5a078',
  MOUNTAINS: '#9a958c',
  COAST: '#a8b8a0',
};

export const TERRAIN_FILL_ALT: Record<string, string> = {
  PLAINS: '#beb089',
  FOREST: '#7d8f62',
  HILLS: '#a8946c',
  MOUNTAINS: '#8e8980',
  COAST: '#9aab92',
};

/** Dezente Reichsfarben (Overlay, nicht deckend) */
export const REALM_COLORS = [
  '#8b6914',
  '#8b3a3a',
  '#3a5a7a',
  '#5a3a6a',
  '#3a6a4a',
  '#8a4a28',
  '#2a6a6a',
  '#6a3a5a',
];

/** Flüsse – geschwungen, Richtung Meer (dekorativ, skaliert mit Karte) */
export const RIVER_PATHS = [
  'M 50 40 C 90 100, 130 160, 170 230 C 220 310, 280 350, 360 400 C 430 440, 510 460, 600 490',
  'M 620 30 C 580 90, 540 150, 490 220 C 440 290, 390 340, 320 400 C 270 440, 200 470, 130 500',
  'M 70 420 C 160 435, 250 445, 340 455 C 430 465, 520 475, 620 485',
  'M 240 50 C 270 130, 290 200, 310 270 C 330 340, 360 400, 400 470',
  'M 480 80 C 450 140, 420 200, 380 260 C 340 320, 300 380, 250 450',
];

export const LAKE_ELLIPSES = [
  { cx: 200, cy: 300, rx: 36, ry: 22 },
  { cx: 460, cy: 170, rx: 28, ry: 18 },
  { cx: 330, cy: 450, rx: 40, ry: 20 },
  { cx: 140, cy: 180, rx: 22, ry: 14 },
];

export type ZoomLod = 'far' | 'mid' | 'near' | 'ultra';

export function zoomLod(scale: number): ZoomLod {
  if (scale < 0.55) return 'far';
  if (scale < 1.15) return 'mid';
  if (scale < 2.1) return 'near';
  return 'ultra';
}

export function castleVisual(level: number): { icon: string; label: string; size: number } {
  if (level >= 5) return { icon: '', label: 'Königliche Zitadelle', size: 28 };
  if (level >= 4) return { icon: '', label: 'Festung', size: 24 };
  if (level >= 3) return { icon: '', label: 'Steinburg', size: 22 };
  if (level >= 2) return { icon: '', label: 'Kleine Burg', size: 18 };
  return { icon: '', label: 'Holzpalisade', size: 16 };
}

export function settlementVisual(
  cityLevel: number,
  villageLevel: number,
  buildingCount: number,
): { icon: string; label: string; size: number } {
  const score = cityLevel * 3 + villageLevel + Math.floor(buildingCount / 8);
  if (score >= 15 || cityLevel >= 5) return { icon: '', label: 'Hauptstadt', size: 26 };
  if (score >= 10 || cityLevel >= 3) return { icon: '', label: 'Große Stadt', size: 22 };
  if (score >= 5 || cityLevel >= 1) return { icon: '', label: 'Kleinstadt', size: 18 };
  if (villageLevel >= 2) return { icon: '', label: 'Dorf', size: 14 };
  return { icon: '', label: 'Weiler', size: 12 };
}

export type AmbientKind =
  | 'peasant'
  | 'merchant'
  | 'soldier'
  | 'sheep'
  | 'smoke'
  | 'flag'
  | 'boat'
  | 'hunter'
  | 'child'
  | 'cart'
  | 'knight'
  | 'wolf'
  | 'deer'
  | 'bear'
  | 'cow'
  | 'horse'
  | 'bell'
  | 'mill'
  | 'farm';

export interface AmbientActor {
  id: string;
  kind: AmbientKind;
  x: number;
  y: number;
  delay: number;
  duration: number;
}

export function buildAmbientActors(
  provinces: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    terrain: string;
    isOwned?: boolean;
    hasCity?: boolean;
  }>,
  season?: string,
): AmbientActor[] {
  const actors: AmbientActor[] = [];
  let i = 0;
  for (const p of provinces) {
    const seed = nameSeed(p.name);
    const { cx, cy } = provinceCenter(p.x, p.y);
    if (hash(seed) > 0.35 && i < 32) {
      const kindPool: AmbientKind[] =
        p.terrain === 'FOREST'
          ? ['hunter', 'deer', 'wolf']
          : p.terrain === 'COAST'
            ? ['boat', 'merchant']
            : p.terrain === 'PLAINS'
              ? ['sheep', 'peasant', 'farm', 'cow', 'horse']
              : p.terrain === 'HILLS'
                ? ['mill', 'sheep', 'peasant']
                : ['soldier', 'flag'];
      const kind = kindPool[Math.floor(hash(seed + 3) * kindPool.length)];
      actors.push({
        id: `a-${p.id}`,
        kind,
        x: cx + (hash(seed + 1) - 0.5) * 55,
        y: cy + (hash(seed + 2) - 0.5) * 42,
        delay: hash(seed + 4) * 4,
        duration: 4 + hash(seed + 5) * 6,
      });
      i++;
    }
    if (p.hasCity && i < 40) {
      actors.push({
        id: `c-${p.id}`,
        kind: 'cart',
        x: cx + 16,
        y: cy + 14,
        delay: hash(seed + 11) * 2,
        duration: 5,
      });
      i++;
    }
    if (season === 'winter' && hash(seed + 20) > 0.75 && i < 42) {
      actors.push({
        id: `w-${p.id}`,
        kind: 'smoke',
        x: cx - 10,
        y: cy - 8,
        delay: 1,
        duration: 4,
      });
      i++;
    }
  }
  return actors;
}

/** Geschwungene Straßen zwischen Nachbarn */
export function buildRoadSegments(
  provinces: Array<{
    id: string;
    x: number;
    y: number;
    name?: string;
    neighbors: Array<{ id: string }>;
    castle?: { level: number } | null;
    city?: { level: number } | null;
    village?: { level: number } | null;
  }>,
): Array<{ x1: number; y1: number; x2: number; y2: number; mx: number; my: number; key: string }> {
  const byId = new Map(provinces.map((p) => [p.id, p]));
  const segs: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    mx: number;
    my: number;
    key: string;
  }> = [];
  const seen = new Set<string>();

  for (const p of provinces) {
    const hasSettlement = !!(p.castle || (p.city && p.city.level > 0) || p.village);
    if (!hasSettlement) continue;
    const a = provinceCenter(p.x, p.y);
    for (const n of p.neighbors) {
      const q = byId.get(n.id);
      if (!q) continue;
      const key = p.id < q.id ? `${p.id}-${q.id}` : `${q.id}-${p.id}`;
      if (seen.has(key)) continue;
      const qSettle = !!(q.castle || (q.city && q.city.level > 0) || q.village);
      if (!qSettle && !p.castle) continue;
      seen.add(key);
      const b = provinceCenter(q.x, q.y);
      const seed = nameSeed((p.name ?? p.id) + (q.name ?? q.id));
      const midX = (a.cx + b.cx) / 2 + (hash(seed) - 0.5) * 40;
      const midY = (a.cy + b.cy) / 2 + (hash(seed + 1) - 0.5) * 36;
      segs.push({
        x1: a.cx,
        y1: a.cy,
        x2: b.cx,
        y2: b.cy,
        mx: midX,
        my: midY,
        key,
      });
    }
  }
  return segs;
}

export function nearDecor(
  name: string,
  x: number,
  y: number,
  terrain: string,
): Array<{ px: number; py: number; kind: 'tree' | 'rock' | 'hill' | 'reed' }> {
  const seed = nameSeed(name);
  const { cx, cy } = provinceCenter(x, y);
  const count = terrain === 'FOREST' ? 6 : terrain === 'MOUNTAINS' ? 5 : terrain === 'PLAINS' ? 3 : 3;
  const out: Array<{ px: number; py: number; kind: 'tree' | 'rock' | 'hill' | 'reed' }> = [];
  for (let i = 0; i < count; i++) {
    const kind =
      terrain === 'FOREST'
        ? 'tree'
        : terrain === 'MOUNTAINS'
          ? 'rock'
          : terrain === 'HILLS'
            ? 'hill'
            : terrain === 'COAST'
              ? 'reed'
              : 'tree';
    out.push({
      px: cx + (hash(seed + i * 3) - 0.5) * 70,
      py: cy + (hash(seed + i * 5) - 0.5) * 55,
      kind,
    });
  }
  return out;
}

/** SVG-Pfad: kleine Bergkette */
export function mountainMarks(name: string, x: number, y: number): Array<{ d: string }> {
  const seed = nameSeed(name);
  const { cx, cy } = provinceCenter(x, y);
  const marks: Array<{ d: string }> = [];
  const n = 2 + Math.floor(hash(seed) * 2);
  for (let i = 0; i < n; i++) {
    const ox = cx + (hash(seed + i * 2) - 0.5) * 50;
    const oy = cy + (hash(seed + i * 3) - 0.5) * 30;
    const h = 10 + hash(seed + i) * 12;
    const w = 8 + hash(seed + i + 1) * 8;
    marks.push({
      d: `M ${ox - w} ${oy} L ${ox} ${oy - h} L ${ox + w} ${oy} Z`,
    });
  }
  return marks;
}

/** Baumgruppe als einfache Dreiecke */
export function treeMarks(name: string, x: number, y: number): Array<{ cx: number; cy: number; r: number }> {
  const seed = nameSeed(name);
  const { cx, cy } = provinceCenter(x, y);
  const out: Array<{ cx: number; cy: number; r: number }> = [];
  const n = 4 + Math.floor(hash(seed) * 4);
  for (let i = 0; i < n; i++) {
    out.push({
      cx: cx + (hash(seed + i * 4) - 0.5) * 60,
      cy: cy + (hash(seed + i * 5) - 0.5) * 45,
      r: 3 + hash(seed + i) * 4,
    });
  }
  return out;
}
