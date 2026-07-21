/**
 * Organische Weltgeometrie – Voronoi-ähnliche Provinzen.
 * Logische x/y bleiben nur für Spielmechanik; der Spieler sieht kein Raster.
 */

export function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function nameSeed(name: string) {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

export const WORLD_PAD = 80;
export const SITE_SPACING_X = 160;
export const SITE_SPACING_Y = 130;

export type Pt = { x: number; y: number };

export type MeshProvince = {
  id: string;
  name: string;
  terrain: string;
  /** Organisches Zentrum (Weltkoordinaten) */
  cx: number;
  cy: number;
  /** Geschlossenes Polygon */
  polygon: Pt[];
  /** Path-String für Canvas */
  path: Path2D;
};

export type RoadSeg = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mx: number;
  my: number;
};

export type RiverPath = { d: Pt[]; width: number };

function siteOf(x: number, y: number, name: string): Pt {
  const s = nameSeed(name);
  // Starke Jitter – keine sichtbare Gitterstruktur
  const jx = (hash(s) - 0.5) * SITE_SPACING_X * 0.55;
  const jy = (hash(s + 17) - 0.5) * SITE_SPACING_Y * 0.55;
  return {
    x: WORLD_PAD + x * SITE_SPACING_X + SITE_SPACING_X * 0.5 + jx,
    y: WORLD_PAD + y * SITE_SPACING_Y + SITE_SPACING_Y * 0.5 + jy,
  };
}

/** Chaikin-ähnlich + Rauschen → handgezeichnete Kante */
function organicEdge(a: Pt, b: Pt, seed: number, steps = 5): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const nx = -(b.y - a.y);
    const ny = b.x - a.x;
    const len = Math.hypot(nx, ny) || 1;
    const amp = 6 + hash(seed + i * 3) * 14;
    const wave = Math.sin(t * Math.PI * (1.5 + hash(seed) * 2)) * amp * (0.35 + hash(seed + i) * 0.65);
    // Weniger Versatz an Endpunkten
    const fade = Math.sin(t * Math.PI);
    out.push({
      x: x + (nx / len) * wave * fade,
      y: y + (ny / len) * wave * fade,
    });
  }
  return out;
}

function orderByAngle(center: Pt, pts: Pt[]): Pt[] {
  return [...pts].sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));
}

function buildPolygon(
  self: Pt,
  neighbors: Pt[],
  name: string,
  bounds: { w: number; h: number },
): Pt[] {
  const seed = nameSeed(name);
  const corners: Pt[] = [];

  if (neighbors.length === 0) {
    const r = 40 + hash(seed) * 20;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      corners.push({ x: self.x + Math.cos(a) * r, y: self.y + Math.sin(a) * r });
    }
  } else {
    // Voronoi-ähnlich: Mittelpunkte zu Nachbarn + Winkel-Samples
    for (const n of neighbors) {
      corners.push({
        x: (self.x + n.x) / 2,
        y: (self.y + n.y) / 2,
      });
    }
    // Zusätzliche Richtungs-Samples für unregelmäßige Größe
    const nCount = 6 + Math.floor(hash(seed) * 4);
    for (let i = 0; i < nCount; i++) {
      const ang = (Math.PI * 2 * i) / nCount + hash(seed + i) * 0.4;
      // Radius = Abstand zum nächsten Nachbarn in ähnlicher Richtung, gekürzt
      let minD = SITE_SPACING_X * 0.72;
      for (const n of neighbors) {
        const dang = Math.atan2(n.y - self.y, n.x - self.x);
        let diff = Math.abs(dang - ang);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 0.9) {
          const d = Math.hypot(n.x - self.x, n.y - self.y) * 0.48;
          minD = Math.min(minD, d);
        }
      }
      const r = minD * (0.85 + hash(seed + i * 9) * 0.35);
      corners.push({
        x: self.x + Math.cos(ang) * r,
        y: self.y + Math.sin(ang) * r,
      });
    }
  }

  // Zum Rand erweitern wenn wenig Nachbarn (Küste)
  if (neighbors.length < 3) {
    const edgePush = 28 + hash(seed + 99) * 22;
    if (self.x < bounds.w * 0.25) corners.push({ x: self.x - edgePush, y: self.y + (hash(seed) - 0.5) * 40 });
    if (self.x > bounds.w * 0.75) corners.push({ x: self.x + edgePush, y: self.y + (hash(seed + 1) - 0.5) * 40 });
    if (self.y < bounds.h * 0.25) corners.push({ x: self.x + (hash(seed + 2) - 0.5) * 40, y: self.y - edgePush });
    if (self.y > bounds.h * 0.75) corners.push({ x: self.x + (hash(seed + 3) - 0.5) * 40, y: self.y + edgePush });
  }

  const ordered = orderByAngle(self, corners);
  // Organische Kanten
  const poly: Pt[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i];
    const b = ordered[(i + 1) % ordered.length];
    const edge = organicEdge(a, b, seed + i * 11, 4);
    // Skip last of each segment to avoid duplicates
    for (let j = 0; j < edge.length - 1; j++) poly.push(edge[j]);
  }
  return poly;
}

function toPath(poly: Pt[]): Path2D {
  const p = new Path2D();
  if (!poly.length) return p;
  p.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) p.lineTo(poly[i].x, poly[i].y);
  p.closePath();
  return p;
}

export type ProvinceInput = {
  id: string;
  name: string;
  x: number;
  y: number;
  terrain: string;
  neighbors: Array<{ id: string; name?: string }>;
};

export function buildWorldMesh(provinces: ProvinceInput[]): {
  meshes: MeshProvince[];
  byId: Map<string, MeshProvince>;
  width: number;
  height: number;
  sites: Map<string, Pt>;
} {
  const maxX = Math.max(0, ...provinces.map((p) => p.x));
  const maxY = Math.max(0, ...provinces.map((p) => p.y));
  const width = WORLD_PAD * 2 + (maxX + 1) * SITE_SPACING_X + 40;
  const height = WORLD_PAD * 2 + (maxY + 1) * SITE_SPACING_Y + 40;
  const bounds = { w: width, h: height };

  const sites = new Map<string, Pt>();
  for (const p of provinces) {
    sites.set(p.id, siteOf(p.x, p.y, p.name));
  }

  const byName = new Map(provinces.map((p) => [p.name, p]));
  const meshes: MeshProvince[] = [];
  const byId = new Map<string, MeshProvince>();

  for (const p of provinces) {
    const self = sites.get(p.id)!;
    const neighborSites: Pt[] = [];
    for (const n of p.neighbors) {
      const np = provinces.find((x) => x.id === n.id) ?? byName.get(n.name ?? '');
      if (!np) continue;
      const s = sites.get(np.id);
      if (s) neighborSites.push(s);
    }
    const polygon = buildPolygon(self, neighborSites, p.name, bounds);
    const mesh: MeshProvince = {
      id: p.id,
      name: p.name,
      terrain: p.terrain,
      cx: self.x,
      cy: self.y,
      polygon,
      path: toPath(polygon),
    };
    meshes.push(mesh);
    byId.set(p.id, mesh);
  }

  return { meshes, byId, width, height, sites };
}

export function buildOrganicRoads(
  provinces: Array<{
    id: string;
    name: string;
    neighbors: Array<{ id: string }>;
    castle?: { level: number } | null;
    city?: { level: number } | null;
    village?: { level: number } | null;
  }>,
  sites: Map<string, Pt>,
): RoadSeg[] {
  const segs: RoadSeg[] = [];
  const seen = new Set<string>();
  for (const p of provinces) {
    const has = !!(p.castle || (p.city && p.city.level > 0) || p.village);
    if (!has) continue;
    const a = sites.get(p.id);
    if (!a) continue;
    for (const n of p.neighbors) {
      const q = provinces.find((x) => x.id === n.id);
      if (!q) continue;
      const key = p.id < q.id ? `${p.id}-${q.id}` : `${q.id}-${p.id}`;
      if (seen.has(key)) continue;
      const qHas = !!(q.castle || (q.city && q.city.level > 0) || q.village);
      if (!qHas && !p.castle) continue;
      seen.add(key);
      const b = sites.get(q.id);
      if (!b) continue;
      const seed = nameSeed(p.name + q.name);
      // Straße folgt „Tal“: versetzter Kontrollpunkt
      const mx = (a.x + b.x) / 2 + (hash(seed) - 0.5) * 55;
      const my = (a.y + b.y) / 2 + (hash(seed + 1) - 0.5) * 48;
      segs.push({ key, x1: a.x, y1: a.y, x2: b.x, y2: b.y, mx, my });
    }
  }
  return segs;
}

/** Flüsse: von Bergen (Norden/hoch) Richtung Küste/Süden, organisch */
export function buildRivers(
  provinces: Array<{ id: string; name: string; terrain: string }>,
  sites: Map<string, Pt>,
  width: number,
  height: number,
): RiverPath[] {
  const mountains = provinces.filter((p) => p.terrain === 'MOUNTAINS' || p.terrain === 'HILLS');
  const coasts = provinces.filter((p) => p.terrain === 'COAST');
  const rivers: RiverPath[] = [];
  const count = Math.min(4, Math.max(2, Math.floor(mountains.length / 2)));

  for (let i = 0; i < count; i++) {
    const startP = mountains[i % mountains.length];
    const endP = coasts[(i * 2) % Math.max(1, coasts.length)] ?? provinces[provinces.length - 1];
    const a = sites.get(startP.id);
    const b = sites.get(endP?.id ?? '');
    if (!a) continue;
    const end = b ?? { x: width * 0.5, y: height - WORLD_PAD * 0.4 };
    const seed = nameSeed(startP.name) + i * 31;
    const pts: Pt[] = [];
    const steps = 14;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = a.x + (end.x - a.x) * t + Math.sin(t * Math.PI * 3 + hash(seed) * 6) * (18 + hash(seed + s) * 28);
      const y = a.y + (end.y - a.y) * t + Math.cos(t * Math.PI * 2.2) * (10 + hash(seed + s + 3) * 16);
      pts.push({ x, y });
    }
    rivers.push({ d: pts, width: 2.2 + i * 0.6 });
  }
  return rivers;
}

export function hitTest(meshes: MeshProvince[], x: number, y: number, ctx: CanvasRenderingContext2D): string | null {
  // Rückwärts: kleinere/oben zuerst – wir testen alle
  for (let i = meshes.length - 1; i >= 0; i--) {
    if (ctx.isPointInPath(meshes[i].path, x, y)) return meshes[i].id;
  }
  return null;
}

export type Lod = 'far' | 'mid' | 'near' | 'ultra';

export function zoomLod(scale: number): Lod {
  if (scale < 0.55) return 'far';
  if (scale < 0.95) return 'mid';
  if (scale < 1.6) return 'near';
  return 'ultra';
}

/** Pergament-Palette – Landschaft bleibt lesbar, keine Buntheit */
export const TERRAIN_PAINT: Record<string, { fill: string; ink: string }> = {
  PLAINS: { fill: '#d2c29a', ink: '#8a7348' },
  FOREST: { fill: '#9aab7a', ink: '#4a5c32' },
  HILLS: { fill: '#c4b080', ink: '#7a6540' },
  MOUNTAINS: { fill: '#b0aaa0', ink: '#5a5550' },
  COAST: { fill: '#c5c8a8', ink: '#5a7a70' },
};

export const REALM_WASH = [
  'rgba(139,105,20,0.16)',
  'rgba(139,58,58,0.16)',
  'rgba(58,90,122,0.16)',
  'rgba(90,58,106,0.16)',
  'rgba(58,106,74,0.16)',
  'rgba(138,74,40,0.16)',
  'rgba(42,106,106,0.16)',
  'rgba(106,58,90,0.16)',
];
