import { CityTileKind, type CityTile, hasAdjacentRoad, countKind } from './cityGrid';
import { applyTaxEffect } from './economy';

/** Lokale Zwischenprodukte einer Provinz (Phase 2 erweitert) */
export interface ProvinceStock {
  grain: number;
  flour: number;
  bread: number;
  planks: number;
  tools: number;
  weapons: number;
  horses: number;
  wool: number;
  cloth: number;
  clothes: number;
  charcoal: number;
  steel: number;
  beer: number;
  wine: number;
  fish: number;
  meat: number;
  salt: number;
  clay: number;
  armor: number;
  luxury: number;
}

export function migrateStock(stock: Partial<ProvinceStock> | undefined): ProvinceStock {
  return {
    grain: 20,
    flour: 5,
    bread: 10,
    planks: 10,
    tools: 5,
    weapons: 2,
    horses: 0,
    wool: 0,
    cloth: 0,
    clothes: 0,
    charcoal: 0,
    steel: 0,
    beer: 0,
    wine: 0,
    fish: 0,
    meat: 0,
    salt: 0,
    clay: 0,
    armor: 0,
    luxury: 0,
    ...stock,
  };
}

export interface ProvinceDevStats {
  satisfaction: number;
  loyalty: number;
  security: number;
  crime: number;
  health: number;
  education: number;
  stock: ProvinceStock;
  /** Steuersatz 0–100 (pro Provinz, Standard 30) */
  taxRate?: number;
}

export function emptyStock(): ProvinceStock {
  return migrateStock({});
}

export function defaultDevStats(): ProvinceDevStats {
  return {
    satisfaction: 55,
    loyalty: 60,
    security: 40,
    crime: 20,
    health: 50,
    education: 20,
    stock: emptyStock(),
    taxRate: 30,
  };
}

export interface ChainTickResult {
  stock: ProvinceStock;
  /** Ressourcen fürs Königreich */
  kingdomIncome: { gold: number; food: number; wood: number; stone: number; iron: number };
  satisfactionDelta: number;
  populationDelta: number;
  prosperityDelta: number;
  defenseBonus: number;
}

function isBuilding(t: CityTile): boolean {
  if (t.kind === CityTileKind.EMPTY || t.kind === CityTileKind.ROAD) return false;
  if (t.buildRemaining && t.buildRemaining > 0) return false;
  return true;
}

/**
 * Produktionsketten Phase 2:
 * Getreide → Mühle → Mehl → Bäckerei → Brot
 * Schafe → Wolle → Weberei → Stoff → Schneiderei → Kleidung
 * Holz → Sägewerk → Bretter → Werkstatt → Werkzeuge
 * Eisen + Holzkohle → Schmelzofen → Stahl → Schmiede → Waffen
 * Getreide → Brauerei → Bier
 */
export function runCityProduction(tiles: CityTile[], stock: ProvinceStock): ChainTickResult {
  const s = migrateStock(stock);
  const income = { gold: 0, food: 0, wood: 0, stone: 0, iron: 0 };
  let satisfactionDelta = 0;
  let populationDelta = 0;
  let prosperityDelta = 0;

  const roadBonus = (x: number, y: number) => (hasAdjacentRoad(tiles, x, y) ? 1.35 : 0.7);

  for (const t of tiles) {
    if (!isBuilding(t)) continue;
    const mult = roadBonus(t.x, t.y) * Math.max(1, t.level);

    switch (t.kind) {
      case CityTileKind.FARM:
        s.grain += Math.floor(4 * mult);
        income.food += Math.floor(2 * mult);
        break;
      case CityTileKind.VINEYARD:
        s.grain += Math.floor(2 * mult);
        s.wine += Math.floor(1 * mult);
        income.gold += Math.floor(1 * mult);
        income.food += Math.floor(1 * mult);
        break;
      case CityTileKind.SHEEP_FARM:
        s.wool += Math.floor(3 * mult);
        s.meat += Math.floor(1 * mult);
        income.food += Math.floor(1 * mult);
        break;
      case CityTileKind.FISHERY:
        s.fish += Math.floor(3 * mult);
        income.food += Math.floor(2 * mult);
        break;
      case CityTileKind.WINDMILL:
      case CityTileKind.MILL: {
        const use = Math.min(s.grain, Math.floor(3 * mult));
        s.grain -= use;
        s.flour += use;
        break;
      }
      case CityTileKind.BAKERY: {
        const use = Math.min(s.flour, Math.floor(2 * mult));
        s.flour -= use;
        s.bread += use;
        if (use > 0) {
          populationDelta += 1;
          satisfactionDelta += 1;
        }
        break;
      }
      case CityTileKind.BREWERY: {
        const use = Math.min(s.grain, Math.floor(2 * mult));
        s.grain -= use;
        s.beer += Math.floor(use * 0.9);
        if (use > 0) {
          income.gold += Math.floor(2 * mult);
          satisfactionDelta += 1;
        }
        break;
      }
      case CityTileKind.LUMBER_CAMP:
        income.wood += Math.floor(3 * mult);
        s.planks += Math.floor(1 * mult);
        break;
      case CityTileKind.CHARCOAL_KILN: {
        const use = Math.min(s.planks, Math.floor(2 * mult));
        if (use >= 1) {
          s.planks -= use;
          s.charcoal += Math.floor(use * 0.8);
        }
        break;
      }
      case CityTileKind.SAWMILL: {
        const raw = Math.min(s.planks + 5, Math.floor(3 * mult));
        s.planks += Math.floor(raw * 0.5);
        income.wood += Math.floor(1 * mult);
        break;
      }
      case CityTileKind.WORKSHOP: {
        const use = Math.min(s.planks, Math.floor(2 * mult));
        s.planks -= use;
        s.tools += use;
        break;
      }
      case CityTileKind.WEAVER: {
        const use = Math.min(s.wool, Math.floor(2 * mult));
        s.wool -= use;
        s.cloth += use;
        break;
      }
      case CityTileKind.TAILOR: {
        const use = Math.min(s.cloth, Math.floor(2 * mult));
        s.cloth -= use;
        s.clothes += use;
        if (use > 0) {
          satisfactionDelta += 1;
          income.gold += Math.floor(1 * mult);
        }
        break;
      }
      case CityTileKind.MINE:
        income.iron += Math.floor(2 * mult);
        break;
      case CityTileKind.QUARRY:
        income.stone += Math.floor(3 * mult);
        s.clay += Math.floor(0.5 * mult);
        break;
      case CityTileKind.FOUNDRY: {
        const ironNeed = Math.min(Math.floor(2 * mult), 4);
        const coalNeed = Math.min(s.charcoal, Math.floor(1 * mult));
        if (coalNeed >= 1) {
          s.charcoal -= coalNeed;
          s.steel += coalNeed;
          income.iron += Math.floor(1 * mult);
        } else {
          income.iron += Math.floor(ironNeed * 0.5);
        }
        break;
      }
      case CityTileKind.SMITHY: {
        const metal = s.steel > 0 ? Math.min(s.steel, Math.floor(1 * mult)) : 0;
        const tools = Math.min(s.tools, Math.floor(1 * mult));
        if (metal > 0) {
          s.steel -= metal;
          s.weapons += metal + Math.floor(tools * 0.5);
          if (tools > 0) s.tools -= tools;
        } else if (tools > 0) {
          s.tools -= tools;
          s.weapons += tools;
        }
        break;
      }
      case CityTileKind.ARMORER: {
        const metal = s.steel > 0 ? Math.min(s.steel, Math.floor(1 * mult)) : 0;
        if (metal > 0) {
          s.steel -= metal;
          s.armor += metal;
        }
        break;
      }
      case CityTileKind.MARKET:
        income.gold += Math.floor(6 * mult) + Math.min(4, Math.floor(s.clothes / 5) + Math.floor(s.beer / 5));
        prosperityDelta += 1;
        break;
      case CityTileKind.HARBOR:
        income.gold += Math.floor(10 * mult);
        s.salt += Math.floor(1 * mult);
        prosperityDelta += 2;
        break;
      case CityTileKind.WAREHOUSE:
        // Lagerkapazität: indirekt über weniger Verderb später
        break;
      case CityTileKind.HOUSE:
        populationDelta += hasAdjacentRoad(tiles, t.x, t.y) ? 2 : 1;
        break;
      case CityTileKind.NOBLE_HOUSE:
        populationDelta += 1;
        s.luxury += Math.floor(0.5 * mult);
        income.gold += Math.floor(2 * mult);
        satisfactionDelta += 1;
        break;
      case CityTileKind.WELL:
        satisfactionDelta += 2;
        break;
      case CityTileKind.CHURCH:
        satisfactionDelta += 3;
        prosperityDelta += 1;
        break;
      case CityTileKind.CATHEDRAL:
        satisfactionDelta += 6;
        prosperityDelta += 3;
        income.gold += Math.floor(3 * mult);
        break;
      case CityTileKind.SCHOOL:
        satisfactionDelta += 1;
        break;
      case CityTileKind.UNIVERSITY:
        satisfactionDelta += 2;
        prosperityDelta += 2;
        income.gold += Math.floor(2 * mult);
        break;
      case CityTileKind.TOWN_HALL:
        income.gold += Math.floor(4 * mult);
        prosperityDelta += 1;
        satisfactionDelta += 1;
        break;
      case CityTileKind.PALACE:
        income.gold += Math.floor(8 * mult);
        s.luxury += Math.floor(1 * mult);
        satisfactionDelta += 2;
        prosperityDelta += 3;
        break;
      case CityTileKind.STABLES:
        s.horses += Math.floor(1 * mult);
        break;
      case CityTileKind.BARRACKS:
        break;
      case CityTileKind.CASTLE_KEEP:
        satisfactionDelta += 1;
        break;
      default:
        break;
    }
  }

  // Nahrung: Brot, Fisch, Fleisch
  const foodPool = s.bread + s.fish + s.meat;
  if (foodPool >= 5) {
    const eat = Math.floor(foodPool / 5);
    let rem = eat * 2;
    for (const key of ['bread', 'fish', 'meat'] as const) {
      const take = Math.min(s[key], rem);
      s[key] -= take;
      rem -= take;
    }
    populationDelta += eat;
    income.food += eat;
    satisfactionDelta += 1;
  } else if (foodPool < 2) {
    satisfactionDelta -= 3;
    populationDelta = Math.min(populationDelta, 0);
  }

  // Kleidung und Bier steigern Zufriedenheit
  if (s.clothes >= 3) {
    satisfactionDelta += 2;
    s.clothes -= 1;
  }
  if (s.beer >= 3) {
    satisfactionDelta += 1;
    s.beer -= 1;
  }

  const walls = countKind(tiles, CityTileKind.WALL);
  const towers = countKind(tiles, CityTileKind.TOWER);
  const keep = countKind(tiles, CityTileKind.CASTLE_KEEP);
  const defenseBonus = walls * 2 + towers * 5 + keep * 8;

  return {
    stock: s,
    kingdomIncome: income,
    satisfactionDelta,
    populationDelta,
    prosperityDelta,
    defenseBonus,
  };
}

export function recalcDevStats(
  tiles: CityTile[],
  prev: ProvinceDevStats,
  tick: ChainTickResult,
): ProvinceDevStats {
  const houses =
    countKind(tiles, CityTileKind.HOUSE) + countKind(tiles, CityTileKind.NOBLE_HOUSE) * 2;
  const wells = countKind(tiles, CityTileKind.WELL);
  const churches =
    countKind(tiles, CityTileKind.CHURCH) + countKind(tiles, CityTileKind.CATHEDRAL) * 2;
  const barracks = countKind(tiles, CityTileKind.BARRACKS);
  const markets = countKind(tiles, CityTileKind.MARKET);
  const roads = countKind(tiles, CityTileKind.ROAD);
  const schools =
    countKind(tiles, CityTileKind.SCHOOL) + countKind(tiles, CityTileKind.UNIVERSITY) * 2;
  const halls = countKind(tiles, CityTileKind.TOWN_HALL);
  const stock = tick.stock;

  const jobs =
    countKind(tiles, CityTileKind.FARM) * 3 +
    countKind(tiles, CityTileKind.LUMBER_CAMP) * 2 +
    countKind(tiles, CityTileKind.MINE) * 2 +
    countKind(tiles, CityTileKind.SMITHY) * 2 +
    countKind(tiles, CityTileKind.MARKET) * 2 +
    countKind(tiles, CityTileKind.BAKERY) * 2 +
    countKind(tiles, CityTileKind.WEAVER) * 2 +
    countKind(tiles, CityTileKind.BARRACKS) * 4 +
    countKind(tiles, CityTileKind.CHURCH) +
    countKind(tiles, CityTileKind.SCHOOL) * 2;

  const housing = 40 + houses * 18;
  const popApprox = Math.min(housing, 30 + houses * 12);
  const unemployment = Math.max(0, popApprox - jobs);

  let satisfaction = clamp(
    40 +
      wells * 5 +
      churches * 8 +
      markets * 4 +
      roads * 1 +
      halls * 4 +
      tick.satisfactionDelta +
      Math.min(10, stock.clothes) +
      Math.min(5, stock.beer) -
      houses * 0.5 -
      unemployment * 0.8,
    0,
    100,
  );

  const taxRate = prev.taxRate ?? 30;
  satisfaction = applyTaxEffect(satisfaction, taxRate);

  const security = clamp(
    30 + barracks * 10 + countKind(tiles, CityTileKind.TOWER) * 5 + countKind(tiles, CityTileKind.CASTLE_KEEP) * 8,
    0,
    100,
  );
  const crime = clamp(40 - security / 2 + houses * 0.3 + unemployment * 0.4, 0, 100);
  const health = clamp(35 + wells * 8 + churches * 3 + Math.min(10, stock.fish + stock.meat), 0, 100);
  const education = clamp(
    15 + churches * 3 + schools * 8 + countKind(tiles, CityTileKind.PALACE) * 5 + halls * 4,
    0,
    100,
  );
  const loyalty = clamp((prev.loyalty + satisfaction) / 2 + 5 - crime / 10 - (taxRate - 30) * 0.2, 0, 100);

  return {
    satisfaction: Math.round(satisfaction),
    loyalty: Math.round(loyalty),
    security: Math.round(security),
    crime: Math.round(crime),
    health: Math.round(health),
    education: Math.round(education),
    stock: tick.stock,
    taxRate,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Bau-Ticks vorantreiben; liefert Anzahl fertiggestellter Gebäude */
export function advanceConstruction(tiles: CityTile[]): number {
  let finished = 0;
  for (const t of tiles) {
    if (t.buildRemaining && t.buildRemaining > 0) {
      t.buildRemaining -= 1;
      if (t.buildRemaining <= 0) {
        t.buildRemaining = 0;
        finished += 1;
      }
    }
  }
  return finished;
}

/** Gebäude-Stufe erhöhen (Kosten multiplizieren) */
export function upgradeCostMultiplier(level: number): number {
  return level;
}
