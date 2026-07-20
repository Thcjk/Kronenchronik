import { CityTileKind, type CityTile, hasAdjacentRoad, countKind } from './cityGrid';

/** Lokale Zwischenprodukte einer Provinz */
export interface ProvinceStock {
  grain: number;
  flour: number;
  bread: number;
  planks: number;
  tools: number;
  weapons: number;
  horses: number;
}

export interface ProvinceDevStats {
  satisfaction: number;
  loyalty: number;
  security: number;
  crime: number;
  health: number;
  education: number;
  stock: ProvinceStock;
}

export function emptyStock(): ProvinceStock {
  return { grain: 20, flour: 5, bread: 10, planks: 10, tools: 5, weapons: 2, horses: 0 };
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

/**
 * Produktionsketten:
 * Getreide → Mühle → Mehl → Bäckerei → Brot → Bevölkerung
 * Holz → Sägewerk → Bretter → Werkstatt → Werkzeuge
 * Eisen + Werkzeuge → Schmiede → Waffen
 */
export function runCityProduction(tiles: CityTile[], stock: ProvinceStock): ChainTickResult {
  const s = { ...stock };
  const income = { gold: 0, food: 0, wood: 0, stone: 0, iron: 0 };
  let satisfactionDelta = 0;
  let populationDelta = 0;
  let prosperityDelta = 0;

  const roadBonus = (x: number, y: number) => (hasAdjacentRoad(tiles, x, y) ? 1.35 : 0.7);

  for (const t of tiles) {
    if (t.kind === CityTileKind.EMPTY || t.kind === CityTileKind.ROAD) continue;
    const mult = roadBonus(t.x, t.y) * t.level;

    switch (t.kind) {
      case CityTileKind.FARM:
      case CityTileKind.VINEYARD:
        s.grain += Math.floor(4 * mult);
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
      case CityTileKind.LUMBER_CAMP:
        income.wood += Math.floor(3 * mult);
        s.planks += Math.floor(1 * mult); // Rohholz als Bretter-Vorstufe
        break;
      case CityTileKind.SAWMILL: {
        // Bretter aus „Rohholz“-Anteil im Kingdom wood – hier lokal planks aus lager
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
      case CityTileKind.MINE:
        income.iron += Math.floor(2 * mult);
        break;
      case CityTileKind.QUARRY:
        income.stone += Math.floor(3 * mult);
        break;
      case CityTileKind.SMITHY: {
        const tools = Math.min(s.tools, Math.floor(1 * mult));
        s.tools -= tools;
        s.weapons += tools;
        break;
      }
      case CityTileKind.MARKET:
        income.gold += Math.floor(6 * mult);
        prosperityDelta += 1;
        break;
      case CityTileKind.HARBOR:
        income.gold += Math.floor(10 * mult);
        prosperityDelta += 2;
        break;
      case CityTileKind.HOUSE:
        populationDelta += hasAdjacentRoad(tiles, t.x, t.y) ? 2 : 1;
        break;
      case CityTileKind.WELL:
        satisfactionDelta += 2;
        break;
      case CityTileKind.CHURCH:
        satisfactionDelta += 3;
        prosperityDelta += 1;
        break;
      case CityTileKind.WAREHOUSE:
        // Lagerbonus: nichts direkt, hält Stock-Cap später
        break;
      case CityTileKind.STABLES:
        s.horses += Math.floor(1 * mult);
        break;
      case CityTileKind.BARRACKS:
        // Waffen → indirekt Rekrutierung später
        break;
      default:
        break;
    }
  }

  // Brot füttert Bevölkerung
  if (s.bread >= 5) {
    const eat = Math.floor(s.bread / 5);
    s.bread -= eat * 2;
    populationDelta += eat;
    income.food += eat;
  }

  const walls = countKind(tiles, CityTileKind.WALL);
  const towers = countKind(tiles, CityTileKind.TOWER);
  const defenseBonus = walls * 2 + towers * 5;

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
  const houses = countKind(tiles, CityTileKind.HOUSE);
  const wells = countKind(tiles, CityTileKind.WELL);
  const churches = countKind(tiles, CityTileKind.CHURCH);
  const barracks = countKind(tiles, CityTileKind.BARRACKS);
  const markets = countKind(tiles, CityTileKind.MARKET);
  const roads = countKind(tiles, CityTileKind.ROAD);

  const satisfaction = clamp(
    40 + wells * 5 + churches * 8 + markets * 4 + roads * 1 + tick.satisfactionDelta - houses * 0.5,
    0,
    100,
  );
  const security = clamp(30 + barracks * 10 + countKind(tiles, CityTileKind.TOWER) * 5, 0, 100);
  const crime = clamp(40 - security / 2 + houses * 0.3, 0, 100);
  const health = clamp(35 + wells * 8 + churches * 3, 0, 100);
  const education = clamp(15 + churches * 5 + countKind(tiles, CityTileKind.PALACE) * 10, 0, 100);
  const loyalty = clamp((prev.loyalty + satisfaction) / 2 + 5 - crime / 10, 0, 100);

  return {
    satisfaction: Math.round(satisfaction),
    loyalty: Math.round(loyalty),
    security: Math.round(security),
    crime: Math.round(crime),
    health: Math.round(health),
    education: Math.round(education),
    stock: tick.stock,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
