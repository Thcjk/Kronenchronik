const API_URL = import.meta.env.VITE_API_URL ?? '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unbekannter Fehler' }));
    throw new ApiError(res.status, body.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  register: (data: {
    email: string;
    username: string;
    password: string;
    kingdomName: string;
    rulerName: string;
  }) =>
    request<{ accessToken: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => request<User>('/auth/me'),

  getProfile: () => request<Profile>('/users/profile'),

  updateProfile: (data: { username: string }) =>
    request<Profile>('/users/profile', { method: 'PATCH', body: JSON.stringify(data) }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/users/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getGameState: () => request<GameState>('/game/state'),

  build: (data: { provinceId: string; buildingType: string }) =>
    request<GameState>('/game/build', { method: 'POST', body: JSON.stringify(data) }),

  recruit: (data: { provinceId: string; unitType: string; count: number }) =>
    request<GameState>('/game/recruit', { method: 'POST', body: JSON.stringify(data) }),

  createArmy: (data: { name: string; provinceId: string }) =>
    request<{ army: Army; gameState: GameState }>('/game/army', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  upgradeCastle: (data: { provinceId: string }) =>
    request<GameState>('/game/castle/upgrade', { method: 'POST', body: JSON.stringify(data) }),

  attack: (data: { armyId: string; targetProvinceId: string }) =>
    request<{ battle: Battle; result: BattleResult; gameState: GameState }>('/game/attack', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export interface User {
  id: string;
  email: string;
  username: string;
  hasKingdom?: boolean;
}

export interface Profile {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  kingdom: {
    id: string;
    name: string;
    resources: Resources;
    dynasty: { id: string; name: string; motto: string | null } | null;
    ruler: { id: string; name: string; age: number; martial: number } | null;
    provinceCount: number;
    provinces: Array<{
      id: string;
      name: string;
      castle: { level: number } | null;
      village: { level: number } | null;
      city: { level: number } | null;
    }>;
  } | null;
}

export interface Resources {
  gold: number;
  food: number;
  wood: number;
  stone: number;
  iron: number;
  influence: number;
  fame: number;
}

export interface Province {
  id: string;
  slug: string;
  name: string;
  x: number;
  y: number;
  terrain: string;
  population: number;
  prosperity: number;
  defense: number;
  ownerId: string | null;
  ownerName: string | null;
  isOwned: boolean;
  castle: { level: number } | null;
  village: { level: number } | null;
  city: { level: number } | null;
  buildings: Array<{ id: string; type: string; level: number }>;
  armies: Army[];
  neighbors: Array<{ id: string; slug: string; name: string }>;
}

export interface Army {
  id: string;
  name: string;
  morale: number;
  isGarrison: boolean;
  provinceId?: string;
  units: Array<{ id: string; type: string; count: number }>;
  province?: { id: string; name: string };
}

export interface Battle {
  id: string;
  attackerWon: boolean;
  createdAt: string;
  province: { name: string };
  attacker: { name: string };
  defender: { name: string } | null;
}

export interface BattleResult {
  attackerWon: boolean;
  summary: string;
  rounds: Array<{ round: number; description: string }>;
  attackerCasualties: Array<{ type: string; count: number }>;
  defenderCasualties: Array<{ type: string; count: number }>;
}

export interface GameState {
  kingdom: { id: string; name: string; resources: Resources };
  provinces: Province[];
  armies: Army[];
  recentBattles: Battle[];
}

export { ApiError };
