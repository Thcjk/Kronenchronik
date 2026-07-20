import {
  WORLD_PROVINCES,
  STARTING_RESOURCES,
  resolveBattle,
  UNIT_DEFINITIONS,
  BUILDING_DEFINITIONS,
  canAfford,
  subtractResources,
  calculateProvinceIncome,
  calculateUpkeep,
  CITY_FOUND_COST,
  CITY_FOUND_REQUIREMENTS,
  CITY_UPGRADE_COST_PER_LEVEL,
  MAX_CITY_LEVEL,
  getCityBuildingMinLevel,
  Terrain,
  UnitType,
  BuildingType,
  createEmptyCityGrid,
  CITY_TILE_DEFS,
  CityTileKind,
  runCityProduction,
  recalcDevStats,
  defaultDevStats,
  computeSettlementVisualLevel,
  migrateStock,
  constructionTicks,
  advanceConstruction,
  autoTradeBetween,
  computeCityTier,
  countProfessions,
  upgradeCostMultiplier,
  hasAdjacentRoad,
  type CityTile,
  type ProvinceDevStats,
} from '@kronenchronik/shared';
import type {
  User,
  Profile,
  GameState,
  DynastyInfo,
  DiplomacyState,
  Battle,
} from '../api/client';
import { mottoFromName } from '../lore/intro';

const USERS_KEY = 'kronenchronik_users';
const SESSION_KEY = 'kronenchronik_session';

interface StoredUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

interface SaveBuilding {
  id: string;
  type: string;
  level: number;
}

interface SaveUnit {
  id: string;
  type: string;
  count: number;
}

interface SaveArmy {
  id: string;
  name: string;
  provinceId: string;
  morale: number;
  isGarrison: boolean;
  units: SaveUnit[];
}

interface SaveProvince {
  id: string;
  slug: string;
  name: string;
  x: number;
  y: number;
  terrain: string;
  culture?: string;
  religion?: string;
  population: number;
  prosperity: number;
  defense: number;
  ownerId: string | null;
  ownerName: string | null;
  castle: { level: number } | null;
  village: { level: number } | null;
  city: { level: number } | null;
  buildings: SaveBuilding[];
  neighborSlugs: string[];
  cityGrid?: CityTile[];
  devStats?: ProvinceDevStats;
  forestStock?: number;
  mineStock?: number;
}

interface GameSave {
  kingdom: {
    id: string;
    name: string;
    gold: number;
    food: number;
    wood: number;
    stone: number;
    iron: number;
    influence: number;
    fame: number;
  };
  /** Hauptstadt-Provinz (Herz des Reiches) */
  capitalProvinceId?: string;
  provinces: SaveProvince[];
  armies: SaveArmy[];
  battles: Battle[];
  dynasty: DynastyInfo;
  lastTickAt: number;
}

function saveKey(userId: string) {
  return `kronenchronik_save_${userId}`;
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + 'kronenchronik');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function uid(): string {
  return crypto.randomUUID();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getUsers(): StoredUser[] {
  return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]');
}

function setUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

function ensureProvinceDev(p: SaveProvince) {
  if (!p.cityGrid || p.cityGrid.length === 0) {
    p.cityGrid = createEmptyCityGrid();
  }
  if (!p.devStats) {
    p.devStats = defaultDevStats();
  } else {
    p.devStats.stock = migrateStock(p.devStats.stock);
    if (p.devStats.taxRate === undefined) p.devStats.taxRate = 30;
  }
  if (p.forestStock === undefined) p.forestStock = 1000;
  if (p.mineStock === undefined) p.mineStock = 800;
}

/** Gebäude brauchen Straße – Felder/Mauern/Brunnen etwas lockerer */
function hasRoadOrIsRoad(
  tiles: CityTile[],
  x: number,
  y: number,
  kind: CityTileKind,
): boolean {
  const def = CITY_TILE_DEFS[kind];
  if (kind === CityTileKind.ROAD || def.category === 'field' || def.category === 'wall') return true;
  if (kind === CityTileKind.WELL || kind === CityTileKind.HOUSE) return true;
  return hasAdjacentRoad(tiles, x, y);
}

function loadSave(userId: string): GameSave | null {
  const raw = localStorage.getItem(saveKey(userId));
  if (!raw) return null;
  const save = JSON.parse(raw) as GameSave;
  for (const p of save.provinces) {
    if (p.ownerId === save.kingdom.id) ensureProvinceDev(p);
  }
  return save;
}

function storeSave(userId: string, save: GameSave) {
  localStorage.setItem(saveKey(userId), JSON.stringify(save));
}

function createWorld(): SaveProvince[] {
  const cultureByTerrain: Record<string, string> = {
    PLAINS: 'germanisch',
    FOREST: 'slawisch',
    HILLS: 'frankisch',
    MOUNTAINS: 'nordisch',
    COAST: 'romanisch',
  };
  return WORLD_PROVINCES.map((seed) => ({
    id: slugify(seed.name),
    slug: slugify(seed.name),
    name: seed.name,
    x: seed.x,
    y: seed.y,
    terrain: seed.terrain,
    culture: cultureByTerrain[seed.terrain] ?? 'germanisch',
    religion: 'lichtglaube',
    population: seed.population,
    prosperity: 50,
    defense: 10,
    ownerId: null,
    ownerName: null,
    castle: null,
    village: null,
    city: null,
    buildings: [],
    neighborSlugs: seed.neighbors.map(slugify),
    cityGrid: undefined,
    devStats: undefined,
    forestStock: 1000,
    mineStock: 800,
  }));
}

function createNewSave(kingdomName: string, rulerName: string): GameSave {
  const provinces = createWorld();
  const startProvince = [...provinces].sort((a, b) => b.population - a.population).find((p) => !p.ownerId)!;
  const kingdomId = uid();

  startProvince.ownerId = kingdomId;
  startProvince.ownerName = kingdomName;
  startProvince.castle = { level: 1 };
  startProvince.village = { level: 1 };
  startProvince.city = { level: 0 };
  ensureProvinceDev(startProvince);

  const dynastyId = uid();
  const rulerId = uid();
  const heirId = uid();

  const armies: SaveArmy[] = [
    {
      id: uid(),
      name: 'Garnison',
      provinceId: startProvince.id,
      morale: 100,
      isGarrison: true,
      units: [
        { id: uid(), type: 'MILITIA', count: 10 },
        { id: uid(), type: 'SPEARMAN', count: 5 },
      ],
    },
  ];

  return {
    kingdom: {
      id: kingdomId,
      name: kingdomName,
      ...STARTING_RESOURCES,
    },
    capitalProvinceId: startProvince.id,
    provinces,
    armies,
    battles: [],
      dynasty: {
      dynasty: { id: dynastyId, name: `Haus ${rulerName}`, motto: mottoFromName(rulerName) },
      characters: [
        {
          id: rulerId,
          name: rulerName,
          age: 28,
          gender: 'MALE',
          traits: ['mutig', 'ehrgeizig'],
          experience: 0,
          health: 100,
          prestige: 0,
          isAlive: true,
          isRuler: true,
          isHeir: false,
          martial: 10,
          diplomacy: 7,
          stewardship: 8,
          intrigue: 5,
        },
        {
          id: heirId,
          name: `${rulerName} Jr.`,
          age: 8,
          gender: 'MALE',
          traits: ['loyal'],
          experience: 0,
          health: 100,
          prestige: 0,
          isAlive: true,
          isRuler: false,
          isHeir: true,
          martial: 6,
          diplomacy: 5,
          stewardship: 5,
          intrigue: 4,
        },
      ],
      ruler: {
        id: rulerId,
        name: rulerName,
        age: 28,
        gender: 'MALE',
        traits: ['mutig', 'ehrgeizig'],
        experience: 0,
        health: 100,
        prestige: 0,
        isAlive: true,
        isRuler: true,
        isHeir: false,
        martial: 10,
        diplomacy: 7,
        stewardship: 8,
        intrigue: 5,
      },
      heir: {
        id: heirId,
        name: `${rulerName} Jr.`,
        age: 8,
        gender: 'MALE',
        traits: ['loyal'],
        experience: 0,
        health: 100,
        prestige: 0,
        isAlive: true,
        isRuler: false,
        isHeir: true,
        martial: 6,
        diplomacy: 5,
        stewardship: 5,
        intrigue: 4,
      },
    },
    lastTickAt: Date.now(),
  };
}

function toGameState(save: GameSave): GameState {
  const kid = save.kingdom.id;
  const capitalId = save.capitalProvinceId ?? save.provinces.find((p) => p.ownerId === kid)?.id;
  return {
    kingdom: {
      id: save.kingdom.id,
      name: save.kingdom.name,
      resources: {
        gold: save.kingdom.gold,
        food: save.kingdom.food,
        wood: save.kingdom.wood,
        stone: save.kingdom.stone,
        iron: save.kingdom.iron,
        influence: save.kingdom.influence,
        fame: save.kingdom.fame,
      },
    },
    dynasty: save.dynasty,
    capitalProvinceId: capitalId,
    provinces: save.provinces.map((p) => {
      const isCapital = p.id === capitalId;
      const cityLevel = p.city?.level ?? 0;
      const villageLevel = p.village?.level ?? 0;
      const tier = p.cityGrid
        ? computeCityTier(p.cityGrid, cityLevel, isCapital)
        : undefined;
      const professions = p.cityGrid ? countProfessions(p.cityGrid) : undefined;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        x: p.x,
        y: p.y,
        terrain: p.terrain,
        culture: p.culture,
        religion: p.religion,
        population: p.population,
        prosperity: p.prosperity,
        defense: p.defense,
        ownerId: p.ownerId,
        ownerName: p.ownerName,
        isOwned: p.ownerId === kid,
        isCapital,
        castle: p.castle,
        village: p.village,
        city: p.city,
        buildings: p.buildings,
        armies: save.armies
          .filter((a) => a.provinceId === p.id)
          .map((a) => ({
            id: a.id,
            name: a.name,
            morale: a.morale,
            isGarrison: a.isGarrison,
            provinceId: a.provinceId,
            units: a.units,
          })),
        neighbors: p.neighborSlugs.map((slug) => {
          const n = save.provinces.find((x) => x.slug === slug)!;
          return { id: n.id, slug: n.slug, name: n.name };
        }),
        cityGrid: p.cityGrid,
        devStats: p.devStats,
        visualLevel: p.cityGrid
          ? computeSettlementVisualLevel(p.cityGrid, cityLevel, villageLevel, isCapital)
          : 1,
        cityTier: tier
          ? { id: tier.id, name: tier.name, description: tier.description }
          : undefined,
        professions,
        forestStock: p.forestStock,
        mineStock: p.mineStock,
      };
    }),
    armies: save.armies.map((a) => {
      const prov = save.provinces.find((p) => p.id === a.provinceId);
      return {
        id: a.id,
        name: a.name,
        morale: a.morale,
        isGarrison: a.isGarrison,
        provinceId: a.provinceId,
        units: a.units,
        province: prov ? { id: prov.id, name: prov.name } : undefined,
      };
    }),
    recentBattles: save.battles.slice(0, 10),
  };
}

function requireSave(): { userId: string; save: GameSave } {
  const userId = getSessionUserId();
  if (!userId) throw new Error('Nicht eingeloggt');
  const save = loadSave(userId);
  if (!save) throw new Error('Kein Spielstand gefunden');
  return { userId, save };
}

function persist(userId: string, save: GameSave): GameState {
  storeSave(userId, save);
  return toGameState(save);
}

export function applyResourceTick(userId: string): GameState | null {
  const save = loadSave(userId);
  if (!save) return null;

  const now = Date.now();
  if (now - save.lastTickAt < 25000) return toGameState(save);

  const kid = save.kingdom.id;
  if (!save.capitalProvinceId) {
    const first = save.provinces.find((p) => p.ownerId === kid);
    if (first) save.capitalProvinceId = first.id;
  }
  const owned = save.provinces.filter((p) => p.ownerId === kid);

  const totalIncome = { gold: 0, food: 0, wood: 0, stone: 0, iron: 0, influence: 0 };
  for (const p of owned) {
    ensureProvinceDev(p);
    // Bauphasen
    advanceConstruction(p.cityGrid!);

    const income = calculateProvinceIncome({
      buildings: p.buildings.map((b) => ({ type: b.type as BuildingType, level: b.level })),
      population: p.population,
      cityLevel: p.city?.level ?? 0,
      villageLevel: p.village?.level ?? 0,
    });
    totalIncome.gold += income.gold ?? 0;
    totalIncome.food += income.food ?? 0;
    totalIncome.wood += income.wood ?? 0;
    totalIncome.stone += income.stone ?? 0;
    totalIncome.iron += income.iron ?? 0;
    totalIncome.influence += income.influence ?? 0;

    // Stadt-Produktionsketten
    if (p.cityGrid && p.devStats) {
      const chain = runCityProduction(p.cityGrid, p.devStats.stock);
      totalIncome.gold += chain.kingdomIncome.gold;
      totalIncome.food += chain.kingdomIncome.food;
      totalIncome.wood += chain.kingdomIncome.wood;
      totalIncome.stone += chain.kingdomIncome.stone;
      totalIncome.iron += chain.kingdomIncome.iron;

      // Steuern aus Bevölkerung
      const taxRate = p.devStats.taxRate ?? 30;
      const taxGold = Math.floor((p.population / 100) * (taxRate / 30) * (1 + (p.prosperity ?? 50) / 100));
      totalIncome.gold += taxGold;

      p.population = Math.min(50000, Math.max(50, p.population + chain.populationDelta));
      p.prosperity = Math.min(100, Math.max(0, p.prosperity + chain.prosperityDelta));
      p.defense = Math.max(p.defense, 10 + chain.defenseBonus);
      p.devStats = recalcDevStats(p.cityGrid, p.devStats, chain);

      // Dorfwachstum: bei hoher Zufriedenheit und Nahrung
      if (p.village && p.devStats.satisfaction > 65 && (p.devStats.stock.bread ?? 0) > 8) {
        if (Math.random() < 0.15 && p.village.level < 5) {
          // gelegentlich sichtbares Wachstum über Population
          p.population += 15;
        }
      }

      const lumber = p.cityGrid.filter((t) => t.kind === CityTileKind.LUMBER_CAMP).length;
      const mines = p.cityGrid.filter((t) => t.kind === CityTileKind.MINE).length;
      p.forestStock = Math.max(0, (p.forestStock ?? 0) - lumber * 2);
      p.mineStock = Math.max(0, (p.mineStock ?? 0) - mines * 1);
      if ((p.forestStock ?? 0) < 100) totalIncome.wood = Math.floor(totalIncome.wood * 0.5);
      if ((p.mineStock ?? 0) < 80) totalIncome.iron = Math.floor(totalIncome.iron * 0.5);
      p.forestStock = Math.min(1200, (p.forestStock ?? 0) + 1);
    }
  }

  // Interprovinz-Handel zwischen Nachbarn
  for (let i = 0; i < owned.length; i++) {
    const a = owned[i];
    if (!a.devStats) continue;
    for (const slug of a.neighborSlugs) {
      const b = owned.find((p) => p.slug === slug);
      if (!b?.devStats || b.id <= a.id) continue;
      const traded = autoTradeBetween(a.devStats.stock, b.devStats.stock);
      a.devStats.stock = traded.a;
      b.devStats.stock = traded.b;
      totalIncome.gold += traded.gold;
    }
  }

  const allUnits = save.armies.flatMap((a) => a.units);
  const upkeep = calculateUpkeep(allUnits.map((u) => ({ type: u.type as UnitType, count: u.count })));

  save.kingdom.gold = Math.max(0, save.kingdom.gold + totalIncome.gold - (upkeep.gold ?? 0));
  save.kingdom.food = Math.max(0, save.kingdom.food + totalIncome.food - (upkeep.food ?? 0));
  save.kingdom.wood += totalIncome.wood;
  save.kingdom.stone += totalIncome.stone;
  save.kingdom.iron += totalIncome.iron;
  save.kingdom.influence += totalIncome.influence;
  save.lastTickAt = now;

  storeSave(userId, save);
  return toGameState(save);
}

export const localApi = {
  async register(data: {
    email: string;
    username: string;
    password: string;
    kingdomName: string;
    rulerName: string;
  }) {
    const users = getUsers();
    if (users.some((u) => u.email === data.email || u.username === data.username)) {
      throw new Error('E-Mail oder Benutzername bereits vergeben');
    }
    const user: StoredUser = {
      id: uid(),
      email: data.email,
      username: data.username,
      passwordHash: await hashPassword(data.password),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    setUsers(users);
    const save = createNewSave(data.kingdomName, data.rulerName);
    storeSave(user.id, save);
    localStorage.setItem(SESSION_KEY, user.id);
    return {
      accessToken: user.id,
      user: { id: user.id, email: user.email, username: user.username, hasKingdom: true },
    };
  },

  async login(data: { email: string; password: string }) {
    const users = getUsers();
    const hash = await hashPassword(data.password);
    const user = users.find((u) => u.email === data.email && u.passwordHash === hash);
    if (!user) throw new Error('Ungültige Anmeldedaten');
    localStorage.setItem(SESSION_KEY, user.id);
    return {
      accessToken: user.id,
      user: { id: user.id, email: user.email, username: user.username, hasKingdom: true },
    };
  },

  async getMe(): Promise<User> {
    const userId = getSessionUserId();
    if (!userId) throw new Error('Nicht eingeloggt');
    const user = getUsers().find((u) => u.id === userId);
    if (!user) throw new Error('Benutzer nicht gefunden');
    return { id: user.id, email: user.email, username: user.username, hasKingdom: true };
  },

  async getProfile(): Promise<Profile> {
    const userId = getSessionUserId()!;
    const user = getUsers().find((u) => u.id === userId)!;
    const save = loadSave(userId)!;
    const owned = save.provinces.filter((p) => p.ownerId === save.kingdom.id);
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      kingdom: {
        id: save.kingdom.id,
        name: save.kingdom.name,
        resources: {
          gold: save.kingdom.gold,
          food: save.kingdom.food,
          wood: save.kingdom.wood,
          stone: save.kingdom.stone,
          iron: save.kingdom.iron,
          influence: save.kingdom.influence,
          fame: save.kingdom.fame,
        },
        dynasty: save.dynasty.dynasty,
        ruler: save.dynasty.ruler,
        provinceCount: owned.length,
        provinces: owned.map((p) => ({
          id: p.id,
          name: p.name,
          castle: p.castle,
          village: p.village,
          city: p.city,
        })),
      },
    };
  },

  async updateProfile(data: { username: string }) {
    const userId = getSessionUserId()!;
    const users = getUsers();
    if (users.some((u) => u.username === data.username && u.id !== userId)) {
      throw new Error('Benutzername bereits vergeben');
    }
    const idx = users.findIndex((u) => u.id === userId);
    users[idx].username = data.username;
    setUsers(users);
    return localApi.getProfile();
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    const userId = getSessionUserId()!;
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    const hash = await hashPassword(data.currentPassword);
    if (users[idx].passwordHash !== hash) throw new Error('Aktuelles Passwort ist falsch');
    users[idx].passwordHash = await hashPassword(data.newPassword);
    setUsers(users);
    return { message: 'Passwort erfolgreich geändert' };
  },

  async getGameState(): Promise<GameState> {
    const userId = getSessionUserId()!;
    applyResourceTick(userId);
    const save = loadSave(userId)!;
    return toGameState(save);
  },

  async build(data: { provinceId: string; buildingType: string }) {
    const { userId, save } = requireSave();
    const province = save.provinces.find((p) => p.id === data.provinceId);
    if (!province || province.ownerId !== save.kingdom.id) throw new Error('Provinz gehört dir nicht');

    const def = BUILDING_DEFINITIONS[data.buildingType as BuildingType];
    if (!def) throw new Error('Unbekannter Gebäudetyp');

    const minCity = getCityBuildingMinLevel(def.category);
    if (minCity > 0 && (province.city?.level ?? 0) < minCity) {
      throw new Error('Stadt muss zuerst gegründet werden');
    }

    const existing = province.buildings.find((b) => b.type === data.buildingType);
    const nextLevel = existing ? existing.level + 1 : 1;
    if (nextLevel > def.maxLevel) throw new Error('Maximales Gebäudelevel erreicht');

    const cost = {
      gold: def.costPerLevel.gold * nextLevel,
      food: def.costPerLevel.food * nextLevel,
      wood: def.costPerLevel.wood * nextLevel,
      stone: def.costPerLevel.stone * nextLevel,
      iron: def.costPerLevel.iron * nextLevel,
    };
    const res = save.kingdom;
    if (!canAfford(res, cost)) throw new Error('Nicht genügend Ressourcen');
    const updated = subtractResources(res, cost);
    Object.assign(save.kingdom, updated);

    if (existing) existing.level = nextLevel;
    else province.buildings.push({ id: uid(), type: data.buildingType, level: 1 });

    if (def.effects.defense) province.defense += def.effects.defense;
    return persist(userId, save);
  },

  async recruit(data: { provinceId: string; unitType: string; count: number }) {
    const { userId, save } = requireSave();
    const def = UNIT_DEFINITIONS[data.unitType as UnitType];
    const cost = {
      gold: def.gold * data.count,
      food: def.food * data.count,
      wood: def.wood * data.count,
      stone: def.stone * data.count,
      iron: def.iron * data.count,
    };
    if (!canAfford(save.kingdom, cost)) throw new Error('Nicht genügend Ressourcen');
    Object.assign(save.kingdom, subtractResources(save.kingdom, cost));

    let garrison = save.armies.find(
      (a) => a.provinceId === data.provinceId && a.isGarrison,
    );
    if (!garrison) {
      garrison = { id: uid(), name: 'Garnison', provinceId: data.provinceId, morale: 100, isGarrison: true, units: [] };
      save.armies.push(garrison);
    }
    const unit = garrison.units.find((u) => u.type === data.unitType);
    if (unit) unit.count += data.count;
    else garrison.units.push({ id: uid(), type: data.unitType, count: data.count });

    return persist(userId, save);
  },

  async createArmy(data: { name: string; provinceId: string }) {
    const { userId, save } = requireSave();
    const garrison = save.armies.find((a) => a.provinceId === data.provinceId && a.isGarrison);
    if (!garrison?.units.length) throw new Error('Keine Truppen in der Garnison');

    save.armies.push({
      id: uid(),
      name: data.name,
      provinceId: data.provinceId,
      morale: 100,
      isGarrison: false,
      units: garrison.units.map((u) => ({
        id: uid(),
        type: u.type,
        count: Math.floor(u.count / 2) || 1,
      })),
    });
    for (const u of garrison.units) {
      u.count = Math.max(0, u.count - (Math.floor(u.count / 2) || 1));
    }
    return { gameState: persist(userId, save) };
  },

  async upgradeCastle(data: { provinceId: string }) {
    const { userId, save } = requireSave();
    const province = save.provinces.find((p) => p.id === data.provinceId)!;
    if (!province.castle) throw new Error('Keine Burg');
    const next = province.castle.level + 1;
    if (next > 5) throw new Error('Maximale Burgstufe');
    const cost = { gold: 100 * next, food: 0, wood: 50 * next, stone: 80 * next, iron: 20 * next };
    if (!canAfford(save.kingdom, cost)) throw new Error('Nicht genügend Ressourcen');
    Object.assign(save.kingdom, subtractResources(save.kingdom, cost));
    province.castle.level = next;
    province.defense += 10;
    return persist(userId, save);
  },

  async foundCity(data: { provinceId: string }) {
    const { userId, save } = requireSave();
    const p = save.provinces.find((x) => x.id === data.provinceId)!;
    if ((p.village?.level ?? 0) < CITY_FOUND_REQUIREMENTS.minVillageLevel) {
      throw new Error('Dorf zu niedrig');
    }
    if (p.population < CITY_FOUND_REQUIREMENTS.minPopulation) throw new Error('Zu wenig Bevölkerung');
    if ((p.city?.level ?? 0) > 0) throw new Error('Stadt existiert bereits');
    if (!canAfford(save.kingdom, CITY_FOUND_COST)) throw new Error('Nicht genügend Ressourcen');
    Object.assign(save.kingdom, subtractResources(save.kingdom, CITY_FOUND_COST));
    p.city = { level: 1 };
    p.population += 500;
    p.prosperity += 15;
    save.kingdom.fame += 5;
    ensureProvinceDev(p);
    return persist(userId, save);
  },

  async upgradeCity(data: { provinceId: string }) {
    const { userId, save } = requireSave();
    const p = save.provinces.find((x) => x.id === data.provinceId)!;
    if (!p.city || p.city.level === 0) throw new Error('Keine Stadt');
    const next = p.city.level + 1;
    if (next > MAX_CITY_LEVEL) throw new Error('Maximale Stadtstufe');
    const cost = {
      gold: CITY_UPGRADE_COST_PER_LEVEL.gold * next,
      food: CITY_UPGRADE_COST_PER_LEVEL.food * next,
      wood: CITY_UPGRADE_COST_PER_LEVEL.wood * next,
      stone: CITY_UPGRADE_COST_PER_LEVEL.stone * next,
      iron: CITY_UPGRADE_COST_PER_LEVEL.iron * next,
    };
    if (!canAfford(save.kingdom, cost)) throw new Error('Nicht genügend Ressourcen');
    Object.assign(save.kingdom, subtractResources(save.kingdom, cost));
    p.city.level = next;
    p.prosperity += 10;
    return persist(userId, save);
  },

  async attack(data: { armyId: string; targetProvinceId: string }) {
    const { userId, save } = requireSave();
    const army = save.armies.find((a) => a.id === data.armyId);
    if (!army || army.isGarrison) throw new Error('Armee nicht gefunden');
    const target = save.provinces.find((p) => p.id === data.targetProvinceId)!;
    const source = save.provinces.find((p) => p.id === army.provinceId)!;

    if (!source.neighborSlugs.includes(target.slug)) throw new Error('Muss Nachbar sein');
    if (target.ownerId === save.kingdom.id) throw new Error('Eigene Provinz');

    const defenderUnits = save.armies
      .filter((a) => a.provinceId === target.id)
      .flatMap((a) => a.units.map((u) => ({ type: u.type as UnitType, count: u.count })));
    if (defenderUnits.length === 0) {
      defenderUnits.push({ type: UnitType.MILITIA, count: 5 });
    }

    const ruler = save.dynasty.ruler;
    const result = resolveBattle({
      attackerUnits: army.units.map((u) => ({ type: u.type as UnitType, count: u.count })),
      defenderUnits,
      terrain: target.terrain as Terrain,
      attackerMorale: army.morale,
      defenderMorale: 80,
      castleLevel: target.castle?.level ?? 0,
      attackerCommanderMartial: ruler?.martial ?? 5,
      defenderCommanderMartial: 5,
    });

    for (const c of result.attackerCasualties) {
      const u = army.units.find((x) => x.type === c.type);
      if (u) u.count = Math.max(0, u.count - c.count);
    }
    army.units = army.units.filter((u) => u.count > 0);
    if (army.units.length === 0) {
      save.armies = save.armies.filter((a) => a.id !== army.id);
    }

    if (result.attackerWon) {
      const wasEnemy = target.ownerId && target.ownerId !== save.kingdom.id;
      target.ownerId = save.kingdom.id;
      target.ownerName = save.kingdom.name;
      army.provinceId = target.id;
      if (!target.castle) target.castle = { level: 1 };
      if (!target.village) target.village = { level: 1 };
      if (!target.city) target.city = { level: 0 };
      ensureProvinceDev(target);
      save.kingdom.fame += wasEnemy ? 10 : 5;
    }

    const battle: Battle = {
      id: uid(),
      attackerWon: result.attackerWon,
      createdAt: new Date().toISOString(),
      province: { name: target.name },
      attacker: { name: save.kingdom.name },
      defender: target.ownerName ? { name: target.ownerName } : null,
    };
    save.battles.unshift(battle);

    return { battle, result, gameState: persist(userId, save) };
  },

  async upgradeVillage(data: { provinceId: string }) {
    const { userId, save } = requireSave();
    const p = save.provinces.find((x) => x.id === data.provinceId);
    if (!p || p.ownerId !== save.kingdom.id) throw new Error('Provinz gehört dir nicht');
    if (!p.village) throw new Error('Kein Dorf');
    const next = p.village.level + 1;
    if (next > 5) throw new Error('Maximales Dorflevel');
    const cost = { gold: 80 * next, food: 40 * next, wood: 60 * next, stone: 40 * next, iron: 10 * next };
    if (!canAfford(save.kingdom, cost)) throw new Error('Nicht genügend Ressourcen');
    Object.assign(save.kingdom, subtractResources(save.kingdom, cost));
    p.village.level = next;
    p.population += 200;
    p.prosperity += 5;
    ensureProvinceDev(p);
    return persist(userId, save);
  },

  async placeCityTile(data: { provinceId: string; x: number; y: number; kind: string }) {
    const { userId, save } = requireSave();
    const p = save.provinces.find((x) => x.id === data.provinceId);
    if (!p || p.ownerId !== save.kingdom.id) throw new Error('Provinz gehört dir nicht');
    ensureProvinceDev(p);
    const kind = data.kind as CityTileKind;
    const def = CITY_TILE_DEFS[kind];
    if (!def || kind === CityTileKind.EMPTY) throw new Error('Ungültiges Gebäude');
    const cityLevel = p.city?.level ?? 0;
    if (cityLevel < def.minCityLevel) {
      throw new Error(`Benötigt Stadtstufe ${def.minCityLevel}`);
    }
    const tile = p.cityGrid!.find((t) => t.x === data.x && t.y === data.y);
    if (!tile) throw new Error('Feld außerhalb der Stadt');
    if (tile.kind !== CityTileKind.EMPTY && kind !== CityTileKind.ROAD) {
      throw new Error('Feld ist belegt – erst abreißen');
    }
    // Straßenanschluss für Gebäude (außer Straßen/Felder/Mauer)
    if (
      def.category === 'building' &&
      kind !== CityTileKind.CASTLE_KEEP &&
      !hasRoadOrIsRoad(p.cityGrid!, data.x, data.y, kind)
    ) {
      throw new Error('Gebäude braucht Straßenanschluss');
    }
    const cost = {
      gold: def.cost.gold,
      food: def.cost.food ?? 0,
      wood: def.cost.wood,
      stone: def.cost.stone,
      iron: def.cost.iron,
    };
    if (!canAfford(save.kingdom, cost)) throw new Error('Nicht genügend Ressourcen');
    Object.assign(save.kingdom, subtractResources(save.kingdom, cost));
    tile.kind = kind;
    tile.level = 1;
    const ticks = constructionTicks(kind);
    tile.buildRemaining = ticks > 0 ? ticks : 0;
    if (def.district === 'verteidigung') {
      p.defense += kind === CityTileKind.TOWER ? 5 : kind === CityTileKind.WALL ? 2 : 3;
    }
    return persist(userId, save);
  },

  async upgradeCityTile(data: { provinceId: string; x: number; y: number }) {
    const { userId, save } = requireSave();
    const p = save.provinces.find((x) => x.id === data.provinceId);
    if (!p || p.ownerId !== save.kingdom.id) throw new Error('Provinz gehört dir nicht');
    ensureProvinceDev(p);
    const tile = p.cityGrid!.find((t) => t.x === data.x && t.y === data.y);
    if (!tile || tile.kind === CityTileKind.EMPTY || tile.kind === CityTileKind.ROAD) {
      throw new Error('Kein Gebäude zum Ausbauen');
    }
    if (tile.buildRemaining && tile.buildRemaining > 0) {
      throw new Error('Gebäude wird noch gebaut');
    }
    const def = CITY_TILE_DEFS[tile.kind];
    const maxLevel = tile.kind === CityTileKind.CASTLE_KEEP ? 5 : 4;
    if (tile.level >= maxLevel) throw new Error('Maximale Ausbaustufe erreicht');
    const mult = upgradeCostMultiplier(tile.level);
    const cost = {
      gold: def.cost.gold * mult,
      food: (def.cost.food ?? 0) * mult,
      wood: def.cost.wood * mult,
      stone: def.cost.stone * mult,
      iron: def.cost.iron * mult,
    };
    if (!canAfford(save.kingdom, cost)) throw new Error('Nicht genügend Ressourcen');
    Object.assign(save.kingdom, subtractResources(save.kingdom, cost));
    tile.level += 1;
    tile.buildRemaining = Math.max(1, constructionTicks(tile.kind) - 1);
    return persist(userId, save);
  },

  async setProvinceTax(data: { provinceId: string; taxRate: number }) {
    const { userId, save } = requireSave();
    const p = save.provinces.find((x) => x.id === data.provinceId);
    if (!p || p.ownerId !== save.kingdom.id) throw new Error('Provinz gehört dir nicht');
    ensureProvinceDev(p);
    p.devStats!.taxRate = Math.max(0, Math.min(80, Math.round(data.taxRate)));
    return persist(userId, save);
  },

  async setCapital(data: { provinceId: string }) {
    const { userId, save } = requireSave();
    const p = save.provinces.find((x) => x.id === data.provinceId);
    if (!p || p.ownerId !== save.kingdom.id) throw new Error('Provinz gehört dir nicht');
    save.capitalProvinceId = p.id;
    return persist(userId, save);
  },

  async demolishCityTile(data: { provinceId: string; x: number; y: number }) {
    const { userId, save } = requireSave();
    const p = save.provinces.find((x) => x.id === data.provinceId);
    if (!p || p.ownerId !== save.kingdom.id) throw new Error('Provinz gehört dir nicht');
    ensureProvinceDev(p);
    const tile = p.cityGrid!.find((t) => t.x === data.x && t.y === data.y);
    if (!tile || tile.kind === CityTileKind.EMPTY) throw new Error('Nichts zum Abreißen');
    if (tile.kind === CityTileKind.CASTLE_KEEP) throw new Error('Burgfried kann nicht abgerissen werden');
    tile.kind = CityTileKind.EMPTY;
    tile.level = 1;
    tile.buildRemaining = 0;
    return persist(userId, save);
  },

  async getDynasty(): Promise<DynastyInfo> {
    return loadSave(getSessionUserId()!)!.dynasty;
  },

  async march(data: { armyId: string; targetProvinceId: string }) {
    const { userId, save } = requireSave();
    const army = save.armies.find((a) => a.id === data.armyId);
    if (!army || army.isGarrison) throw new Error('Armee nicht gefunden');
    const target = save.provinces.find((p) => p.id === data.targetProvinceId)!;
    const source = save.provinces.find((p) => p.id === army.provinceId)!;
    if (!source.neighborSlugs.includes(target.slug)) throw new Error('Muss Nachbar sein');
    army.provinceId = target.id;
    return persist(userId, save);
  },

  async getDiplomacy(): Promise<DiplomacyState> {
    return { relations: [], kingdoms: [], myAlliance: null, availableAlliances: [] };
  },

  declareWar: async () => localApi.getDiplomacy(),
  makePeace: async () => localApi.getDiplomacy(),
  proposeAlliance: async () => ({ diplomacy: await localApi.getDiplomacy() }),
  joinAlliance: async () => localApi.getDiplomacy(),
  proposeTrade: async () => localApi.getDiplomacy(),
};

export function localLogout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('token');
}
