/**
 * Bau-Voraussetzungen als lesbare Gründe (nur UI, spiegelt localApi.placeCityTile).
 */
import type { Province, Resources } from '../api/client';
import {
  CITY_TILE_DEFS,
  CityTileKind,
  constructionTicks,
  hasAdjacentRoad,
  canAfford,
  type CityTile,
} from '@kronenchronik/shared';

export function explainBuildBlockers(
  kind: CityTileKind,
  province: Province,
  resources: Resources,
  x?: number,
  y?: number,
): string[] {
  const blockers: string[] = [];
  const def = CITY_TILE_DEFS[kind];
  if (!def || kind === CityTileKind.EMPTY) {
    blockers.push('❌ Ungültiges Gebäude');
    return blockers;
  }

  const cityLevel = province.city?.level ?? 0;
  if (cityLevel < def.minCityLevel) {
    blockers.push(`❌ Stadtstufe ${def.minCityLevel} fehlt (aktuell ${cityLevel})`);
  }

  const cost = {
    gold: def.cost.gold,
    food: def.cost.food ?? 0,
    wood: def.cost.wood,
    stone: def.cost.stone,
    iron: def.cost.iron,
  };
  if (!canAfford(resources, cost)) {
    if ((resources.gold ?? 0) < cost.gold) blockers.push('❌ Nicht genug Gold');
    if ((resources.wood ?? 0) < cost.wood) blockers.push('❌ Nicht genug Holz');
    if ((resources.stone ?? 0) < cost.stone) blockers.push('❌ Nicht genug Stein');
    if ((resources.iron ?? 0) < cost.iron) blockers.push('❌ Nicht genug Eisen');
    if (cost.food && (resources.food ?? 0) < cost.food) blockers.push('❌ Zu wenig Nahrung');
    if (blockers.length === 0 || !blockers.some((b) => b.includes('Nicht genug') || b.includes('Nahrung'))) {
      blockers.push('❌ Nicht genügend Ressourcen');
    }
  }

  const tiles = (province.cityGrid ?? []).map((t) => ({
    ...t,
    kind: t.kind as CityTileKind,
  })) as CityTile[];

  if (x != null && y != null) {
    const tile = tiles.find((t) => t.x === x && t.y === y);
    if (!tile) blockers.push('❌ Feld außerhalb der Stadt');
    else if (tile.kind !== CityTileKind.EMPTY && kind !== CityTileKind.ROAD) {
      blockers.push('❌ Feld ist belegt – erst abreißen');
    }
    if (
      def.category === 'building' &&
      kind !== CityTileKind.CASTLE_KEEP &&
      !hasAdjacentRoad(tiles, x, y)
    ) {
      blockers.push('❌ Straße fehlt (Gebäude braucht Anschluss)');
    }
  } else if (
    def.category === 'building' &&
    kind !== CityTileKind.CASTLE_KEEP &&
    kind !== CityTileKind.ROAD
  ) {
    // Allgemeine Hinweis ohne konkrete Zelle
    blockers.push('ℹ️ Gebäude benötigt Straßenanschluss');
  }

  const houses =
    tiles.filter((t) => t.kind === CityTileKind.HOUSE || t.kind === CityTileKind.NOBLE_HOUSE).length;
  if (def.category === 'building' && kind !== CityTileKind.HOUSE && houses === 0 && cityLevel === 0) {
    // soft hint only — not a hard blocker in sim
  }

  return blockers.filter((b) => !b.startsWith('ℹ️') || blockers.length === 1);
}

export function formatBuildCost(kind: CityTileKind): string {
  const d = CITY_TILE_DEFS[kind];
  if (!d) return '';
  const parts = [
    d.cost.gold ? `${d.cost.gold} Gold` : '',
    d.cost.wood ? `${d.cost.wood} Holz` : '',
    d.cost.stone ? `${d.cost.stone} Stein` : '',
    d.cost.iron ? `${d.cost.iron} Eisen` : '',
    d.cost.food ? `${d.cost.food} Nahrung` : '',
  ].filter(Boolean);
  return parts.join(' · ');
}

export function buildTimeLabel(kind: CityTileKind): string {
  const t = constructionTicks(kind);
  if (t <= 0) return 'Sofort';
  return `${t} Tick${t === 1 ? '' : 's'}`;
}

/** Grobe Arbeitsplätze / Bevölkerungshinweise für Anzeige */
export function buildingJobsHint(kind: CityTileKind): string {
  switch (kind) {
    case CityTileKind.FARM:
      return '3 Arbeiter';
    case CityTileKind.LUMBER_CAMP:
    case CityTileKind.MINE:
    case CityTileKind.SMITHY:
    case CityTileKind.MARKET:
    case CityTileKind.BAKERY:
    case CityTileKind.WEAVER:
      return '2 Arbeiter';
    case CityTileKind.BARRACKS:
      return '4 Soldaten';
    case CityTileKind.HOUSE:
      return '+18 Wohnraum';
    case CityTileKind.NOBLE_HOUSE:
      return '+36 Wohnraum';
    default:
      return '–';
  }
}

export function buildingProducesHint(kind: CityTileKind): string {
  switch (kind) {
    case CityTileKind.FARM:
      return 'Getreide, Nahrung';
    case CityTileKind.MILL:
      return 'Mehl (aus Getreide)';
    case CityTileKind.BAKERY:
      return 'Brot (aus Mehl)';
    case CityTileKind.LUMBER_CAMP:
      return 'Holz';
    case CityTileKind.SAWMILL:
      return 'Bretter';
    case CityTileKind.WORKSHOP:
      return 'Werkzeuge';
    case CityTileKind.MINE:
      return 'Eisen';
    case CityTileKind.QUARRY:
      return 'Stein';
    case CityTileKind.SHEEP_FARM:
      return 'Wolle';
    case CityTileKind.WEAVER:
      return 'Stoff';
    case CityTileKind.TAILOR:
      return 'Kleidung';
    case CityTileKind.MARKET:
      return 'Gold, Handel';
    case CityTileKind.BREWERY:
      return 'Bier';
    case CityTileKind.SMITHY:
      return 'Waffen';
    case CityTileKind.FOUNDRY:
      return 'Stahl';
    case CityTileKind.ARMORER:
      return 'Rüstung';
    case CityTileKind.FISHERY:
      return 'Fisch';
    case CityTileKind.VINEYARD:
      return 'Wein';
    case CityTileKind.CHARCOAL_KILN:
      return 'Holzkohle';
    default:
      return '–';
  }
}
