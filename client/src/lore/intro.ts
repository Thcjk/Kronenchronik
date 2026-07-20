/** Einstiegsgeschichten, Wappen & Dynastie-Farben */

const MOTTOS = [
  'Stärke durch Ehre',
  'Durch Stahl und Blut',
  'Das Licht führt uns',
  'Wurzeln tiefer als Kronen',
  'Kein Verrat ohne Preis',
  'Für Haus und Heimat',
  'Geduld und Klinge',
];

const COAT_COLORS = [
  ['#8b1a1a', '#d4af37'],
  ['#1a3a5c', '#c4a882'],
  ['#2d4a3e', '#d4af37'],
  ['#4a2c0a', '#e8dcc4'],
  ['#3a1a4a', '#c9a227'],
  ['#1a1a1a', '#b33a3a'],
];

export function coatFromName(name: string): { primary: string; secondary: string; emblem: string } {
  let s = 0;
  for (let i = 0; i < name.length; i++) s += name.charCodeAt(i);
  const colors = COAT_COLORS[s % COAT_COLORS.length];
  const emblems = ['✦', '⚜', '✝', '☽', '⚔', '🦅', '🦌', '🌲'];
  return { primary: colors[0], secondary: colors[1], emblem: emblems[s % emblems.length] };
}

export function mottoFromName(name: string): string {
  let s = 0;
  for (let i = 0; i < name.length; i++) s += name.charCodeAt(i);
  return MOTTOS[s % MOTTOS.length];
}

export function buildIntroStory(opts: {
  rulerName: string;
  kingdomName: string;
  dynastyName: string;
  startProvince: string;
}): string {
  return (
    `Das Jahr ist 1148.\n\n` +
    `Nach dem Tod deines Vaters erbtest du, ${opts.rulerName} vom ${opts.dynastyName}, ` +
    `die kleine Grenzgrafschaft ${opts.startProvince} – Herzstück von ${opts.kingdomName}.\n\n` +
    `Die Felder sind karg. Die Burg ist alt. Deine Nachbarn beobachten jede deiner Bewegungen.\n\n` +
    `Nun liegt das Schicksal deiner Familie in deinen Händen.`
  );
}

export const INTRO_SEEN_KEY = 'kronenchronik_intro_seen';
