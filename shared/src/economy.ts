/** Erweiterte Wirtschafts- und Stadtentwicklungs-Logik (Phase 2) */

import { CityTileKind, type CityTile, countKind } from './cityGrid';
import type { ProvinceStock } from './production';

export type CityTierId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface CityTier {
  id: CityTierId;
  name: string;
  description: string;
  minBuildings: number;
  minCityLevel: number;
  requiresCapital?: boolean;
}

export const CITY_TIERS: CityTier[] = [
  { id: 1, name: 'Dorf', description: 'Wenige Hütten und Felder', minBuildings: 0, minCityLevel: 0 },
  { id: 2, name: 'Siedlung', description: 'Erste Werkstätten und Markt', minBuildings: 8, minCityLevel: 0 },
  { id: 3, name: 'Marktflecken', description: 'Handel und Kirche', minBuildings: 14, minCityLevel: 1 },
  { id: 4, name: 'Kleinstadt', description: 'Mauern und Viertel', minBuildings: 20, minCityLevel: 2 },
  { id: 5, name: 'Großstadt', description: 'Handelszentrum und Türme', minBuildings: 28, minCityLevel: 3 },
  { id: 6, name: 'Herzogssitz', description: 'Palast und Universität', minBuildings: 36, minCityLevel: 4 },
  {
    id: 7,
    name: 'Königliche Hauptstadt',
    description: 'Monumentale Bauten, mehrere Mauerringe',
    minBuildings: 42,
    minCityLevel: 5,
    requiresCapital: true,
  },
];

export function computeCityTier(
  tiles: CityTile[],
  cityLevel: number,
  isCapital: boolean,
): CityTier {
  const buildings = tiles.filter(
    (t) =>
      t.kind !== CityTileKind.EMPTY &&
      t.kind !== CityTileKind.ROAD &&
      !(t.buildRemaining && t.buildRemaining > 0),
  ).length;

  let best = CITY_TIERS[0];
  for (const tier of CITY_TIERS) {
    if (tier.requiresCapital && !isCapital) continue;
    if (buildings >= tier.minBuildings && cityLevel >= tier.minCityLevel) {
      best = tier;
    }
  }
  return best;
}

export interface ProfessionCounts {
  farmers: number;
  lumberjacks: number;
  miners: number;
  smiths: number;
  merchants: number;
  priests: number;
  teachers: number;
  soldiers: number;
  nobles: number;
  workers: number;
}

export function countProfessions(tiles: CityTile[]): ProfessionCounts {
  const done = tiles.filter((t) => !t.buildRemaining);
  return {
    farmers:
      countKind(done, CityTileKind.FARM) +
      countKind(done, CityTileKind.VINEYARD) +
      countKind(done, CityTileKind.SHEEP_FARM) +
      countKind(done, CityTileKind.FISHERY),
    lumberjacks: countKind(done, CityTileKind.LUMBER_CAMP) + countKind(done, CityTileKind.CHARCOAL_KILN),
    miners: countKind(done, CityTileKind.MINE) + countKind(done, CityTileKind.QUARRY),
    smiths:
      countKind(done, CityTileKind.SMITHY) +
      countKind(done, CityTileKind.FOUNDRY) +
      countKind(done, CityTileKind.ARMORER) +
      countKind(done, CityTileKind.WORKSHOP),
    merchants:
      countKind(done, CityTileKind.MARKET) +
      countKind(done, CityTileKind.HARBOR) +
      countKind(done, CityTileKind.WAREHOUSE),
    priests: countKind(done, CityTileKind.CHURCH) + countKind(done, CityTileKind.CATHEDRAL),
    teachers: countKind(done, CityTileKind.SCHOOL) + countKind(done, CityTileKind.UNIVERSITY),
    soldiers: countKind(done, CityTileKind.BARRACKS) + countKind(done, CityTileKind.STABLES),
    nobles: countKind(done, CityTileKind.NOBLE_HOUSE) + countKind(done, CityTileKind.PALACE),
    workers:
      countKind(done, CityTileKind.MILL) +
      countKind(done, CityTileKind.BAKERY) +
      countKind(done, CityTileKind.BREWERY) +
      countKind(done, CityTileKind.WEAVER) +
      countKind(done, CityTileKind.TAILOR) +
      countKind(done, CityTileKind.SAWMILL),
  };
}

/** Bauphasen für große Gebäude (Ticks) */
export function constructionTicks(kind: CityTileKind): number {
  switch (kind) {
    case CityTileKind.CATHEDRAL:
    case CityTileKind.UNIVERSITY:
    case CityTileKind.PALACE:
      return 4;
    case CityTileKind.FOUNDRY:
    case CityTileKind.HARBOR:
    case CityTileKind.TOWN_HALL:
      return 3;
    case CityTileKind.CHURCH:
    case CityTileKind.WALL:
    case CityTileKind.TOWER:
    case CityTileKind.SCHOOL:
      return 2;
    case CityTileKind.ROAD:
    case CityTileKind.EMPTY:
      return 0;
    default:
      return 1;
  }
}

export function applyTaxEffect(satisfaction: number, taxRate: number): number {
  const penalty = Math.max(0, taxRate - 30) * 0.6;
  const bonus = Math.max(0, 30 - taxRate) * 0.15;
  return Math.max(0, Math.min(100, satisfaction - penalty + bonus));
}

export function autoTradeBetween(
  a: ProvinceStock,
  b: ProvinceStock,
): { a: ProvinceStock; b: ProvinceStock; gold: number } {
  let gold = 0;
  const na = { ...a };
  const nb = { ...b };

  if (na.grain > 40 && nb.bread < 15) {
    const move = Math.min(8, na.grain - 30);
    na.grain -= move;
    nb.grain += move;
    gold += Math.floor(move * 0.5);
  }
  if (nb.grain > 40 && na.bread < 15) {
    const move = Math.min(8, nb.grain - 30);
    nb.grain -= move;
    na.grain += move;
    gold += Math.floor(move * 0.5);
  }
  if (na.tools > 20 && nb.weapons < 8) {
    const move = Math.min(4, na.tools - 12);
    na.tools -= move;
    nb.tools += move;
    gold += move;
  }
  if (na.cloth > 15 && nb.clothes < 8) {
    const move = Math.min(3, Math.floor(na.cloth / 4));
    na.cloth -= move * 2;
    nb.clothes += move;
    gold += move * 2;
  }
  if (na.steel > 10 && nb.armor < 5) {
    const move = Math.min(2, Math.floor(na.steel / 5));
    na.steel -= move;
    nb.steel += move;
    gold += move * 3;
  }

  return { a: na, b: nb, gold };
}

export function capitalVisualTitle(tier: CityTier, isCapital: boolean): string {
  if (isCapital && tier.id >= 6) return 'Königliche Hauptstadt';
  if (isCapital) return `${tier.name} (Hauptstadt)`;
  return tier.name;
}
