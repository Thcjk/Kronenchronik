/**
 * Anzeige-Hilfe: geschätzte Ressourcenflüsse (kein Speichern, keine Spiellogik).
 * Spiegelt die Tick-Rechnung aus localApi.applyResourceTick wider.
 */
import type { GameState, Resources } from '../api/client';
import {
  BuildingType,
  UnitType,
  calculateProvinceIncome,
  calculateUpkeep,
  runCityProduction,
  migrateStock,
  type CityTile,
  CityTileKind,
} from '@kronenchronik/shared';

export type ResourceKey = keyof Resources;

export type FlowRates = Record<
  ResourceKey,
  { income: number; expense: number; net: number }
>;

const ZERO: FlowRates = {
  gold: { income: 0, expense: 0, net: 0 },
  food: { income: 0, expense: 0, net: 0 },
  wood: { income: 0, expense: 0, net: 0 },
  stone: { income: 0, expense: 0, net: 0 },
  iron: { income: 0, expense: 0, net: 0 },
  influence: { income: 0, expense: 0, net: 0 },
  fame: { income: 0, expense: 0, net: 0 },
  coal: { income: 0, expense: 0, net: 0 },
};

function addIncome(rates: FlowRates, key: ResourceKey, n: number) {
  if (!n) return;
  rates[key].income += n;
  rates[key].net += n;
}

function addExpense(rates: FlowRates, key: ResourceKey, n: number) {
  if (!n) return;
  rates[key].expense += n;
  rates[key].net -= n;
}

/** Geschätzte Einnahmen/Verbräuche pro Tick (Normalgeschwindigkeit ≈ 30s). */
export function estimateResourceFlow(gameState: GameState): FlowRates {
  const rates: FlowRates = structuredClone(ZERO);
  const owned = gameState.provinces.filter((p) => p.isOwned);

  for (const p of owned) {
    const income = calculateProvinceIncome({
      buildings: p.buildings.map((b) => ({ type: b.type as BuildingType, level: b.level })),
      population: p.population,
      cityLevel: p.city?.level ?? 0,
      villageLevel: p.village?.level ?? 0,
    });
    addIncome(rates, 'gold', income.gold ?? 0);
    addIncome(rates, 'food', income.food ?? 0);
    addIncome(rates, 'wood', income.wood ?? 0);
    addIncome(rates, 'stone', income.stone ?? 0);
    addIncome(rates, 'iron', income.iron ?? 0);
    addIncome(rates, 'influence', income.influence ?? 0);

    if (p.cityGrid && p.devStats?.stock) {
      const tiles = p.cityGrid.map((t) => ({
        ...t,
        kind: t.kind as CityTileKind,
      })) as CityTile[];
      const chain = runCityProduction(tiles, migrateStock(p.devStats.stock));
      addIncome(rates, 'gold', chain.kingdomIncome.gold);
      addIncome(rates, 'food', chain.kingdomIncome.food);
      addIncome(rates, 'wood', chain.kingdomIncome.wood);
      addIncome(rates, 'stone', chain.kingdomIncome.stone);
      addIncome(rates, 'iron', chain.kingdomIncome.iron);

      const taxRate = p.devStats.taxRate ?? 30;
      const taxGold = Math.floor(
        (p.population / 100) * (taxRate / 30) * (1 + (p.prosperity ?? 50) / 100),
      );
      addIncome(rates, 'gold', taxGold);
    }
  }

  const allUnits = gameState.armies.flatMap((a) => a.units);
  const upkeep = calculateUpkeep(
    allUnits.map((u) => ({ type: u.type as UnitType, count: u.count })),
  );
  addExpense(rates, 'gold', upkeep.gold ?? 0);
  addExpense(rates, 'food', upkeep.food ?? 0);

  // Aufrunden für Anzeige
  for (const k of Object.keys(rates) as ResourceKey[]) {
    rates[k].income = Math.round(rates[k].income);
    rates[k].expense = Math.round(rates[k].expense);
    rates[k].net = Math.round(rates[k].net);
  }
  return rates;
}

/** Pro Minute bei Normalgeschwindigkeit (2 Ticks/Min). */
export function perMinute(flow: FlowRates): FlowRates {
  const out = structuredClone(flow);
  for (const k of Object.keys(out) as ResourceKey[]) {
    out[k].income *= 2;
    out[k].expense *= 2;
    out[k].net *= 2;
  }
  return out;
}
