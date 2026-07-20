/** Stadtgitter & platzierbare Gebäude (Stadtansicht) */

export const CITY_GRID_W = 14;
export const CITY_GRID_H = 10;

export enum CityTileKind {
  EMPTY = 'EMPTY',
  ROAD = 'ROAD',
  HOUSE = 'HOUSE',
  FARM = 'FARM',
  MILL = 'MILL',
  BAKERY = 'BAKERY',
  LUMBER_CAMP = 'LUMBER_CAMP',
  SAWMILL = 'SAWMILL',
  WORKSHOP = 'WORKSHOP',
  MINE = 'MINE',
  QUARRY = 'QUARRY',
  SMITHY = 'SMITHY',
  MARKET = 'MARKET',
  CHURCH = 'CHURCH',
  BARRACKS = 'BARRACKS',
  STABLES = 'STABLES',
  WELL = 'WELL',
  WALL = 'WALL',
  TOWER = 'TOWER',
  GATE = 'GATE',
  WAREHOUSE = 'WAREHOUSE',
  HARBOR = 'HARBOR',
  WINDMILL = 'WINDMILL',
  VINEYARD = 'VINEYARD',
  PALACE = 'PALACE',
  CASTLE_KEEP = 'CASTLE_KEEP',
  SHEEP_FARM = 'SHEEP_FARM',
  WEAVER = 'WEAVER',
  TAILOR = 'TAILOR',
  BREWERY = 'BREWERY',
  FISHERY = 'FISHERY',
  CHARCOAL_KILN = 'CHARCOAL_KILN',
  FOUNDRY = 'FOUNDRY',
  ARMORER = 'ARMORER',
  SCHOOL = 'SCHOOL',
  UNIVERSITY = 'UNIVERSITY',
  CATHEDRAL = 'CATHEDRAL',
  TOWN_HALL = 'TOWN_HALL',
  NOBLE_HOUSE = 'NOBLE_HOUSE',
}

export type CityDistrict =
  | 'wohn'
  | 'handel'
  | 'industrie'
  | 'militar'
  | 'tempel'
  | 'landwirtschaft'
  | 'hafen'
  | 'verteidigung'
  | 'leer';

export interface CityTileDef {
  kind: CityTileKind;
  name: string;
  icon: string;
  district: CityDistrict;
  cost: { gold: number; wood: number; stone: number; iron: number; food?: number };
  /** Benötigt Stadtstufe (0 = Dorf ok) */
  minCityLevel: number;
  category: 'road' | 'building' | 'wall' | 'field';
}

export const CITY_TILE_DEFS: Record<CityTileKind, CityTileDef> = {
  [CityTileKind.EMPTY]: {
    kind: CityTileKind.EMPTY,
    name: 'Leer',
    icon: '·',
    district: 'leer',
    cost: { gold: 0, wood: 0, stone: 0, iron: 0 },
    minCityLevel: 0,
    category: 'building',
  },
  [CityTileKind.ROAD]: {
    kind: CityTileKind.ROAD,
    name: 'Straße',
    icon: '═',
    district: 'leer',
    cost: { gold: 5, wood: 5, stone: 10, iron: 0 },
    minCityLevel: 0,
    category: 'road',
  },
  [CityTileKind.HOUSE]: {
    kind: CityTileKind.HOUSE,
    name: 'Wohnhaus',
    icon: '🏠',
    district: 'wohn',
    cost: { gold: 20, wood: 30, stone: 10, iron: 0, food: 5 },
    minCityLevel: 0,
    category: 'building',
  },
  [CityTileKind.FARM]: {
    kind: CityTileKind.FARM,
    name: 'Bauernhof',
    icon: '🌾',
    district: 'landwirtschaft',
    cost: { gold: 25, wood: 20, stone: 5, iron: 0 },
    minCityLevel: 0,
    category: 'field',
  },
  [CityTileKind.MILL]: {
    kind: CityTileKind.MILL,
    name: 'Mühle',
    icon: '⚙️',
    district: 'industrie',
    cost: { gold: 40, wood: 35, stone: 20, iron: 5 },
    minCityLevel: 0,
    category: 'building',
  },
  [CityTileKind.BAKERY]: {
    kind: CityTileKind.BAKERY,
    name: 'Bäckerei',
    icon: '🍞',
    district: 'handel',
    cost: { gold: 35, wood: 25, stone: 15, iron: 0 },
    minCityLevel: 0,
    category: 'building',
  },
  [CityTileKind.LUMBER_CAMP]: {
    kind: CityTileKind.LUMBER_CAMP,
    name: 'Holzfällerlager',
    icon: '🪓',
    district: 'industrie',
    cost: { gold: 20, wood: 10, stone: 5, iron: 0 },
    minCityLevel: 0,
    category: 'field',
  },
  [CityTileKind.SAWMILL]: {
    kind: CityTileKind.SAWMILL,
    name: 'Sägewerk',
    icon: '🪵',
    district: 'industrie',
    cost: { gold: 45, wood: 20, stone: 25, iron: 10 },
    minCityLevel: 0,
    category: 'building',
  },
  [CityTileKind.WORKSHOP]: {
    kind: CityTileKind.WORKSHOP,
    name: 'Werkstatt',
    icon: '🔧',
    district: 'industrie',
    cost: { gold: 50, wood: 30, stone: 20, iron: 15 },
    minCityLevel: 1,
    category: 'building',
  },
  [CityTileKind.MINE]: {
    kind: CityTileKind.MINE,
    name: 'Mine',
    icon: '⛏️',
    district: 'industrie',
    cost: { gold: 40, wood: 25, stone: 15, iron: 0 },
    minCityLevel: 0,
    category: 'field',
  },
  [CityTileKind.QUARRY]: {
    kind: CityTileKind.QUARRY,
    name: 'Steinbruch',
    icon: '🪨',
    district: 'industrie',
    cost: { gold: 35, wood: 20, stone: 5, iron: 5 },
    minCityLevel: 0,
    category: 'field',
  },
  [CityTileKind.SMITHY]: {
    kind: CityTileKind.SMITHY,
    name: 'Schmiede',
    icon: '⚒️',
    district: 'industrie',
    cost: { gold: 60, wood: 30, stone: 40, iron: 20 },
    minCityLevel: 1,
    category: 'building',
  },
  [CityTileKind.MARKET]: {
    kind: CityTileKind.MARKET,
    name: 'Markt',
    icon: '🏪',
    district: 'handel',
    cost: { gold: 50, wood: 40, stone: 30, iron: 5 },
    minCityLevel: 0,
    category: 'building',
  },
  [CityTileKind.CHURCH]: {
    kind: CityTileKind.CHURCH,
    name: 'Kirche',
    icon: '⛪',
    district: 'tempel',
    cost: { gold: 80, wood: 40, stone: 100, iron: 10 },
    minCityLevel: 1,
    category: 'building',
  },
  [CityTileKind.BARRACKS]: {
    kind: CityTileKind.BARRACKS,
    name: 'Kaserne',
    icon: '🛡️',
    district: 'militar',
    cost: { gold: 70, wood: 50, stone: 40, iron: 15 },
    minCityLevel: 0,
    category: 'building',
  },
  [CityTileKind.STABLES]: {
    kind: CityTileKind.STABLES,
    name: 'Stallungen',
    icon: '🐴',
    district: 'militar',
    cost: { gold: 65, wood: 60, stone: 25, iron: 10, food: 20 },
    minCityLevel: 1,
    category: 'building',
  },
  [CityTileKind.WELL]: {
    kind: CityTileKind.WELL,
    name: 'Brunnen',
    icon: '🚰',
    district: 'wohn',
    cost: { gold: 15, wood: 10, stone: 25, iron: 0 },
    minCityLevel: 0,
    category: 'building',
  },
  [CityTileKind.WALL]: {
    kind: CityTileKind.WALL,
    name: 'Mauer',
    icon: '🧱',
    district: 'verteidigung',
    cost: { gold: 15, wood: 5, stone: 40, iron: 0 },
    minCityLevel: 1,
    category: 'wall',
  },
  [CityTileKind.TOWER]: {
    kind: CityTileKind.TOWER,
    name: 'Turm',
    icon: '🗼',
    district: 'verteidigung',
    cost: { gold: 40, wood: 20, stone: 60, iron: 10 },
    minCityLevel: 2,
    category: 'wall',
  },
  [CityTileKind.GATE]: {
    kind: CityTileKind.GATE,
    name: 'Stadttor',
    icon: '🚪',
    district: 'verteidigung',
    cost: { gold: 50, wood: 30, stone: 50, iron: 15 },
    minCityLevel: 1,
    category: 'wall',
  },
  [CityTileKind.WAREHOUSE]: {
    kind: CityTileKind.WAREHOUSE,
    name: 'Lagerhaus',
    icon: '📦',
    district: 'handel',
    cost: { gold: 40, wood: 50, stone: 20, iron: 0 },
    minCityLevel: 0,
    category: 'building',
  },
  [CityTileKind.HARBOR]: {
    kind: CityTileKind.HARBOR,
    name: 'Hafen',
    icon: '⚓',
    district: 'hafen',
    cost: { gold: 120, wood: 80, stone: 60, iron: 20 },
    minCityLevel: 2,
    category: 'building',
  },
  [CityTileKind.WINDMILL]: {
    kind: CityTileKind.WINDMILL,
    name: 'Windmühle',
    icon: '🌬️',
    district: 'landwirtschaft',
    cost: { gold: 55, wood: 70, stone: 30, iron: 10 },
    minCityLevel: 1,
    category: 'building',
  },
  [CityTileKind.VINEYARD]: {
    kind: CityTileKind.VINEYARD,
    name: 'Weinberg',
    icon: '🍇',
    district: 'landwirtschaft',
    cost: { gold: 45, wood: 15, stone: 10, iron: 0 },
    minCityLevel: 1,
    category: 'field',
  },
  [CityTileKind.PALACE]: {
    kind: CityTileKind.PALACE,
    name: 'Palast',
    icon: '🏛️',
    district: 'wohn',
    cost: { gold: 300, wood: 100, stone: 250, iron: 50 },
    minCityLevel: 4,
    category: 'building',
  },
  [CityTileKind.CASTLE_KEEP]: {
    kind: CityTileKind.CASTLE_KEEP,
    name: 'Burgfried',
    icon: '🏰',
    district: 'verteidigung',
    cost: { gold: 200, wood: 80, stone: 200, iron: 40 },
    minCityLevel: 0,
    category: 'building',
  },
  [CityTileKind.SHEEP_FARM]: {
    kind: CityTileKind.SHEEP_FARM,
    name: 'Schäferei',
    icon: '🐑',
    district: 'landwirtschaft',
    cost: { gold: 30, wood: 25, stone: 5, iron: 0, food: 10 },
    minCityLevel: 0,
    category: 'field',
  },
  [CityTileKind.WEAVER]: {
    kind: CityTileKind.WEAVER,
    name: 'Weberei',
    icon: '🧵',
    district: 'industrie',
    cost: { gold: 45, wood: 30, stone: 15, iron: 5 },
    minCityLevel: 1,
    category: 'building',
  },
  [CityTileKind.TAILOR]: {
    kind: CityTileKind.TAILOR,
    name: 'Schneiderei',
    icon: '👔',
    district: 'handel',
    cost: { gold: 50, wood: 25, stone: 15, iron: 5 },
    minCityLevel: 1,
    category: 'building',
  },
  [CityTileKind.BREWERY]: {
    kind: CityTileKind.BREWERY,
    name: 'Brauerei',
    icon: '🍺',
    district: 'handel',
    cost: { gold: 55, wood: 40, stone: 30, iron: 5 },
    minCityLevel: 1,
    category: 'building',
  },
  [CityTileKind.FISHERY]: {
    kind: CityTileKind.FISHERY,
    name: 'Fischerei',
    icon: '🐟',
    district: 'hafen',
    cost: { gold: 35, wood: 40, stone: 10, iron: 0 },
    minCityLevel: 0,
    category: 'field',
  },
  [CityTileKind.CHARCOAL_KILN]: {
    kind: CityTileKind.CHARCOAL_KILN,
    name: 'Köhlerei',
    icon: '🔥',
    district: 'industrie',
    cost: { gold: 30, wood: 50, stone: 10, iron: 0 },
    minCityLevel: 0,
    category: 'building',
  },
  [CityTileKind.FOUNDRY]: {
    kind: CityTileKind.FOUNDRY,
    name: 'Schmelzofen',
    icon: '🏭',
    district: 'industrie',
    cost: { gold: 90, wood: 40, stone: 80, iron: 30 },
    minCityLevel: 2,
    category: 'building',
  },
  [CityTileKind.ARMORER]: {
    kind: CityTileKind.ARMORER,
    name: 'Rüstungsschmiede',
    icon: '🛡️',
    district: 'militar',
    cost: { gold: 80, wood: 30, stone: 50, iron: 40 },
    minCityLevel: 2,
    category: 'building',
  },
  [CityTileKind.SCHOOL]: {
    kind: CityTileKind.SCHOOL,
    name: 'Schule',
    icon: '📚',
    district: 'wohn',
    cost: { gold: 60, wood: 40, stone: 40, iron: 5 },
    minCityLevel: 1,
    category: 'building',
  },
  [CityTileKind.UNIVERSITY]: {
    kind: CityTileKind.UNIVERSITY,
    name: 'Universität',
    icon: '🎓',
    district: 'wohn',
    cost: { gold: 250, wood: 80, stone: 200, iron: 40 },
    minCityLevel: 4,
    category: 'building',
  },
  [CityTileKind.CATHEDRAL]: {
    kind: CityTileKind.CATHEDRAL,
    name: 'Kathedrale',
    icon: '⛪',
    district: 'tempel',
    cost: { gold: 280, wood: 60, stone: 300, iron: 30 },
    minCityLevel: 4,
    category: 'building',
  },
  [CityTileKind.TOWN_HALL]: {
    kind: CityTileKind.TOWN_HALL,
    name: 'Rathaus',
    icon: '🏛️',
    district: 'wohn',
    cost: { gold: 120, wood: 50, stone: 100, iron: 20 },
    minCityLevel: 2,
    category: 'building',
  },
  [CityTileKind.NOBLE_HOUSE]: {
    kind: CityTileKind.NOBLE_HOUSE,
    name: 'Adelshaus',
    icon: '👑',
    district: 'wohn',
    cost: { gold: 100, wood: 60, stone: 80, iron: 15 },
    minCityLevel: 3,
    category: 'building',
  },
};

export interface CityTile {
  x: number;
  y: number;
  kind: CityTileKind;
  level: number;
  /** Verbleibende Ticks bis Fertigstellung (0/undefined = fertig) */
  buildRemaining?: number;
}

export function createEmptyCityGrid(): CityTile[] {
  const tiles: CityTile[] = [];
  // Start: Brunnen + Burgfried + paar Häuser + Felder
  const starters: Array<[number, number, CityTileKind]> = [
    [6, 4, CityTileKind.CASTLE_KEEP],
    [7, 4, CityTileKind.WELL],
    [5, 4, CityTileKind.HOUSE],
    [6, 5, CityTileKind.HOUSE],
    [8, 4, CityTileKind.HOUSE],
    [4, 6, CityTileKind.FARM],
    [5, 6, CityTileKind.FARM],
    [6, 3, CityTileKind.ROAD],
    [7, 3, CityTileKind.ROAD],
    [7, 5, CityTileKind.ROAD],
  ];
  const map = new Map(starters.map(([x, y, k]) => [`${x},${y}`, k]));
  for (let y = 0; y < CITY_GRID_H; y++) {
    for (let x = 0; x < CITY_GRID_W; x++) {
      const kind = map.get(`${x},${y}`) ?? CityTileKind.EMPTY;
      tiles.push({ x, y, kind, level: 1 });
    }
  }
  return tiles;
}

export function tileAt(tiles: CityTile[], x: number, y: number): CityTile | undefined {
  return tiles.find((t) => t.x === x && t.y === y);
}

export function hasAdjacentRoad(tiles: CityTile[], x: number, y: number): boolean {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  return dirs.some(([dx, dy]) => {
    const t = tileAt(tiles, x + dx, y + dy);
    return t?.kind === CityTileKind.ROAD;
  });
}

export function countKind(tiles: CityTile[], kind: CityTileKind): number {
  return tiles.filter((t) => t.kind === kind).length;
}

/** Visuelles Stadtlevel 1–7 aus Gebäuden + Stadtstufe (+ Hauptstadt) */
export function computeSettlementVisualLevel(
  tiles: CityTile[],
  cityLevel: number,
  villageLevel: number,
  isCapital = false,
): number {
  const buildings = tiles.filter(
    (t) =>
      t.kind !== CityTileKind.EMPTY &&
      t.kind !== CityTileKind.ROAD &&
      !(t.buildRemaining && t.buildRemaining > 0),
  ).length;
  if (isCapital && (cityLevel >= 5 || buildings >= 42)) return 7;
  if (cityLevel >= 5 || buildings >= 36) return 6;
  if (cityLevel >= 4 || buildings >= 28) return 5;
  if (cityLevel >= 3 || buildings >= 20) return 4;
  if (cityLevel >= 2 || buildings >= 14) return 3;
  if (cityLevel >= 1 || buildings >= 8) return 2;
  if (villageLevel >= 1 || buildings >= 4) return 1;
  return 1;
}

export const SETTLEMENT_VISUAL: Record<
  number,
  { title: string; description: string; sky: string; ground: string }
> = {
  1: {
    title: 'Dorf',
    description: 'Kleine Holzburg, wenige Häuser, kleiner Marktplatz',
    sky: '#3a4a5a',
    ground: '#3d5a32',
  },
  2: {
    title: 'Siedlung',
    description: 'Werkstätten, Holzzaun, wachsende Felder',
    sky: '#3a5060',
    ground: '#3a5830',
  },
  3: {
    title: 'Marktflecken',
    description: 'Steinburg, Kirche, Handelsbuden',
    sky: '#3a5570',
    ground: '#355828',
  },
  4: {
    title: 'Kleinstadt',
    description: 'Stadtmauer, Viertel, breitere Straßen',
    sky: '#2f4a68',
    ground: '#325528',
  },
  5: {
    title: 'Großstadt',
    description: 'Handelszentrum, Türme, große Werkstätten',
    sky: '#2a4060',
    ground: '#304e28',
  },
  6: {
    title: 'Herzogssitz',
    description: 'Palast, Universität, Kathedrale im Bau',
    sky: '#243858',
    ground: '#2a4820',
  },
  7: {
    title: 'Königliche Hauptstadt',
    description: 'Palast, mehrere Mauerringe, monumentale Plätze',
    sky: '#1c2e4a',
    ground: '#243c1c',
  },
};

export const BUILD_CATEGORIES: { id: string; label: string; kinds: CityTileKind[] }[] = [
  {
    id: 'wohn',
    label: 'Wohnen',
    kinds: [CityTileKind.HOUSE, CityTileKind.NOBLE_HOUSE, CityTileKind.WELL, CityTileKind.PALACE],
  },
  {
    id: 'land',
    label: 'Landwirtschaft',
    kinds: [
      CityTileKind.FARM,
      CityTileKind.VINEYARD,
      CityTileKind.SHEEP_FARM,
      CityTileKind.FISHERY,
      CityTileKind.WINDMILL,
    ],
  },
  {
    id: 'prod',
    label: 'Rohstoffe',
    kinds: [
      CityTileKind.LUMBER_CAMP,
      CityTileKind.MINE,
      CityTileKind.QUARRY,
      CityTileKind.CHARCOAL_KILN,
    ],
  },
  {
    id: 'proc',
    label: 'Verarbeitung',
    kinds: [
      CityTileKind.MILL,
      CityTileKind.BAKERY,
      CityTileKind.BREWERY,
      CityTileKind.SAWMILL,
      CityTileKind.WORKSHOP,
      CityTileKind.WEAVER,
      CityTileKind.TAILOR,
      CityTileKind.FOUNDRY,
      CityTileKind.SMITHY,
      CityTileKind.ARMORER,
    ],
  },
  {
    id: 'handel',
    label: 'Handel',
    kinds: [CityTileKind.MARKET, CityTileKind.WAREHOUSE, CityTileKind.HARBOR],
  },
  {
    id: 'mil',
    label: 'Militär',
    kinds: [
      CityTileKind.BARRACKS,
      CityTileKind.STABLES,
      CityTileKind.WALL,
      CityTileKind.TOWER,
      CityTileKind.GATE,
      CityTileKind.CASTLE_KEEP,
    ],
  },
  {
    id: 'rel',
    label: 'Religion & Bildung',
    kinds: [
      CityTileKind.CHURCH,
      CityTileKind.CATHEDRAL,
      CityTileKind.SCHOOL,
      CityTileKind.UNIVERSITY,
      CityTileKind.TOWN_HALL,
    ],
  },
  {
    id: 'infra',
    label: 'Straßen',
    kinds: [CityTileKind.ROAD],
  },
];

/** Bau-Palette (ohne EMPTY) */
export const BUILD_PALETTE: CityTileKind[] = BUILD_CATEGORIES.flatMap((c) => c.kinds);
