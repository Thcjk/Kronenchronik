/** Titel-Leiter: Graf → Kaiser */

import type { TitleRank, TitleState } from './dynastyTypes';

export const TITLE_LADDER: Array<{
  rank: TitleRank;
  name: string;
  minProvinces: number;
  minFame: number;
  prestigeBonus: number;
}> = [
  { rank: 'graf', name: 'Graf', minProvinces: 1, minFame: 0, prestigeBonus: 0 },
  { rank: 'markgraf', name: 'Markgraf', minProvinces: 3, minFame: 20, prestigeBonus: 10 },
  { rank: 'herzog', name: 'Herzog', minProvinces: 6, minFame: 50, prestigeBonus: 25 },
  { rank: 'grossherzog', name: 'Großherzog', minProvinces: 10, minFame: 100, prestigeBonus: 40 },
  { rank: 'koenig', name: 'König', minProvinces: 14, minFame: 180, prestigeBonus: 70 },
  { rank: 'kaiser', name: 'Kaiser', minProvinces: 20, minFame: 300, prestigeBonus: 120 },
];

export function computeTitle(provinceCount: number, fame: number, kingdomName: string): TitleState {
  let best = TITLE_LADDER[0];
  for (const t of TITLE_LADDER) {
    if (provinceCount >= t.minProvinces && fame >= t.minFame) best = t;
  }
  return {
    rank: best.rank,
    formalTitle: `${best.name} von ${kingdomName}`,
    provinceThreshold: best.minProvinces,
  };
}

export function nextTitleHint(provinceCount: number, fame: number): string | null {
  const current = computeTitle(provinceCount, fame, 'X');
  const idx = TITLE_LADDER.findIndex((t) => t.rank === current.rank);
  const next = TITLE_LADDER[idx + 1];
  if (!next) return null;
  const needP = Math.max(0, next.minProvinces - provinceCount);
  const needF = Math.max(0, next.minFame - fame);
  if (needP === 0 && needF === 0) return null;
  return `Nächster Titel ${next.name}: noch ${needP} Provinzen / ${needF} Ruhm`;
}

export function crownForRank(rank: TitleRank): string {
  switch (rank) {
    case 'kaiser':
      return 'kaiserkrone';
    case 'koenig':
      return 'königskrone';
    case 'grossherzog':
    case 'herzog':
      return 'herzogshut';
    case 'markgraf':
      return 'markgrafenkrone';
    default:
      return 'grafenkrone';
  }
}
