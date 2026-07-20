/** Immersive Hof- und Rollenspiel-Ereignisse (Phase 4) */

import { cryptoRandomId, type PendingWorldEvent } from './worldState';

export interface ImmersionTemplate {
  id: string;
  title: string;
  description: string;
  weight: number;
  choices: Array<{
    id: string;
    label: string;
    effect: {
      gold?: number;
      food?: number;
      influence?: number;
      fame?: number;
      prestige?: number;
      stress?: number;
      loyaltyAll?: number;
      vassalOpinion?: number;
      chronicleTitle?: string;
      chronicleText?: string;
    };
  }>;
}

export const IMMERSION_EVENTS: ImmersionTemplate[] = [
  {
    id: 'peasant_plea',
    title: 'Ein Bauer bittet um Hilfe',
    description: 'Vor dem Tor kniet ein Bauer. Seine Ernte ist verbrannt. Er fleht um Getreide.',
    weight: 10,
    choices: [
      { id: 'help', label: 'Ihm helfen (−40 Gold, +Zufriedenheit)', effect: { gold: -40, food: -20, fame: 2, prestige: 5, stress: -3, chronicleTitle: 'Gnade des Herrschers', chronicleText: 'Der Graf speiste den Bauern aus eigener Tasche.' } },
      { id: 'tax', label: 'Steuern trotzdem eintreiben', effect: { gold: 25, fame: -2, prestige: -5, stress: 5, vassalOpinion: -5 } },
      { id: 'ignore', label: 'Fortschicken', effect: { stress: 2, fame: -1 } },
    ],
  },
  {
    id: 'vassal_insult',
    title: 'Ein Vasall beleidigt dich',
    description: 'Bei Hof spottet ein junger Edelmann über deine Herkunft. Die Halle verstummt.',
    weight: 8,
    choices: [
      { id: 'ignore', label: 'Ignorieren (Weisheit)', effect: { prestige: 3, stress: 4, chronicleTitle: 'Gelassener Herrscher', chronicleText: 'Der Spott verhallte – der Graf behielt die Würde.' } },
      { id: 'arrest', label: 'Verhaften', effect: { prestige: 5, loyaltyAll: -5, stress: -2, fame: 1 } },
      { id: 'pardon', label: 'Begnadigen nach Entschuldigung', effect: { prestige: 2, loyaltyAll: 5, stress: -1 } },
      { id: 'banish', label: 'Verbannen', effect: { prestige: 4, loyaltyAll: -8, fame: 2 } },
    ],
  },
  {
    id: 'general_gold',
    title: 'Der General fordert Gold',
    description: 'Dein Marschall knurrt: Ohne Sold kämpfen die Männer nicht. Er will 80 Gold.',
    weight: 7,
    choices: [
      { id: 'pay', label: 'Zustimmen (−80 Gold)', effect: { gold: -80, loyaltyAll: 8, fame: 1 } },
      { id: 'refuse', label: 'Ablehnen', effect: { loyaltyAll: -12, stress: 6 } },
      { id: 'fire', label: 'Entlassen', effect: { prestige: -3, stress: 3, fame: -1 } },
    ],
  },
  {
    id: 'bishop_church',
    title: 'Der Bischof verlangt eine Kirche',
    description: 'Der Hofkaplan mahnt: Ohne Gotteshaus droht göttlicher Zorn.',
    weight: 6,
    choices: [
      { id: 'build', label: 'Zustimmen (−100 Gold, −60 Stein)', effect: { gold: -100, fame: 5, prestige: 10, loyaltyAll: 5, chronicleTitle: 'Kirche gestiftet', chronicleText: 'Ein neues Gotteshaus erhob sich zum Himmel.' } },
      { id: 'delay', label: 'Auf später verschieben', effect: { stress: 2, prestige: -2 } },
      { id: 'refuse', label: 'Ablehnen', effect: { fame: -3, loyaltyAll: -5 } },
    ],
  },
  {
    id: 'knight_duel',
    title: 'Ein Ritter fordert ein Duell',
    description: 'Ein stolzer Ritter wirft den Handschuh. Der Hof hält den Atem an.',
    weight: 5,
    choices: [
      { id: 'fight', label: 'Persönlich kämpfen', effect: { fame: 8, prestige: 12, stress: 10, chronicleTitle: 'Duell gewonnen', chronicleText: 'Stahl krachte – der Herrscher siegte vor aller Augen.' } },
      { id: 'champion', label: 'Einen Champion schicken (−30 Gold)', effect: { gold: -30, fame: 3, prestige: 4 } },
      { id: 'refuse', label: 'Ablehnen', effect: { fame: -4, prestige: -6, stress: 2 } },
    ],
  },
  {
    id: 'sibling_rivalry',
    title: 'Geschwisterneid',
    description: 'Dein Bruder (oder Vetter) murrt über die Erbfolge. Intrigen flattern durch die Gänge.',
    weight: 6,
    choices: [
      { id: 'gift', label: 'Mit Land und Gold beschwichtigen (−70 Gold)', effect: { gold: -70, loyaltyAll: 6, stress: -4 } },
      { id: 'threat', label: 'Drohend warnen', effect: { stress: 5, loyaltyAll: -4, prestige: 2 } },
      { id: 'embrace', label: 'Zum Rat ziehen', effect: { prestige: 5, loyaltyAll: 8, influence: 5 } },
    ],
  },
  {
    id: 'bard_song',
    title: 'Der Barde will dich besingen',
    description: 'Ein Spielmann bietet an, deine Taten in die weite Welt zu tragen – gegen Gold.',
    weight: 7,
    choices: [
      { id: 'pay', label: 'Auftrag geben (−40 Gold)', effect: { gold: -40, fame: 6, prestige: 8 } },
      { id: 'feast', label: 'Fest veranstalten (−90 Gold)', effect: { gold: -90, fame: 10, prestige: 12, stress: -8, loyaltyAll: 5, chronicleTitle: 'Großes Fest', chronicleText: 'Fackeln, Gesang und Wein – der Hof feierte bis zum Morgen.' } },
      { id: 'refuse', label: 'Ablehnen', effect: { prestige: -2 } },
    ],
  },
  {
    id: 'statue_offer',
    title: 'Ein Künstler will eine Statue',
    description: 'Ein Bildhauer kniet: „Lasst euer Antlitz in Stein leben.“',
    weight: 4,
    choices: [
      { id: 'commission', label: 'Statue in Auftrag (−120 Gold)', effect: { gold: -120, fame: 8, prestige: 15, chronicleTitle: 'Statue errichtet', chronicleText: 'Auf dem Marktplatz erhob sich das steinerne Bild des Herrschers.' } },
      { id: 'modest', label: 'Kleine Büste (−50 Gold)', effect: { gold: -50, fame: 3, prestige: 5 } },
      { id: 'refuse', label: 'Ablehnen', effect: {} },
    ],
  },
  {
    id: 'wolf_attack',
    title: 'Wölfe bedrohen die Bauern',
    description: 'Hirten berichten von einer Wolfsplage am Waldrand.',
    weight: 6,
    choices: [
      { id: 'hunt', label: 'Jagd ausrufen (−35 Gold)', effect: { gold: -35, fame: 3, prestige: 4, food: 15 } },
      { id: 'ignore', label: 'Ignorieren', effect: { food: -25, loyaltyAll: -6 } },
    ],
  },
  {
    id: 'queen_ill',
    title: 'Krankheit am Hof',
    description: 'Ein geliebtes Familienmitglied fiebert. Die Ärzte streiten über Aderlass und Kräuter.',
    weight: 5,
    choices: [
      { id: 'healers', label: 'Beste Heiler rufen (−60 Gold)', effect: { gold: -60, prestige: 5, stress: -5 } },
      { id: 'pray', label: 'Beten lassen', effect: { influence: 3, stress: 3 } },
      { id: 'stoic', label: 'Schicksal annehmen', effect: { stress: 8, prestige: 2 } },
    ],
  },
];

export function rollImmersionEvent(tick: number): PendingWorldEvent | null {
  if (Math.random() > 0.2) return null;
  const total = IMMERSION_EVENTS.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  let picked = IMMERSION_EVENTS[0];
  for (const t of IMMERSION_EVENTS) {
    r -= t.weight;
    if (r <= 0) {
      picked = t;
      break;
    }
  }
  return {
    id: cryptoRandomId(),
    templateId: `immersion:${picked.id}`,
    title: picked.title,
    description: picked.description,
    choices: picked.choices.map((c) => ({ id: c.id, label: c.label })),
    createdTick: tick,
  };
}

export function resolveImmersionChoice(templateId: string, choiceId: string) {
  const id = templateId.replace(/^immersion:/, '');
  const t = IMMERSION_EVENTS.find((e) => e.id === id);
  return t?.choices.find((c) => c.id === choiceId)?.effect ?? null;
}
