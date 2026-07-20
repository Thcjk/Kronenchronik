/** Ampel-Farben für Info-Karten (nur Darstellung). */

export type StatusTone = 'good' | 'warn' | 'bad' | 'neutral';

export function toneClass(tone: StatusTone): string {
  switch (tone) {
    case 'good':
      return 'info-card tone-good';
    case 'warn':
      return 'info-card tone-warn';
    case 'bad':
      return 'info-card tone-bad';
    default:
      return 'info-card tone-neutral';
  }
}

/** Prozentwerte: hoch = gut */
export function toneHighGood(n: number | undefined | null, good = 70, warn = 40): StatusTone {
  if (n == null || Number.isNaN(n)) return 'neutral';
  if (n >= good) return 'good';
  if (n >= warn) return 'warn';
  return 'bad';
}

/** Prozentwerte: hoch = schlecht (z. B. Kriminalität) */
export function toneHighBad(n: number | undefined | null, bad = 60, warn = 35): StatusTone {
  if (n == null || Number.isNaN(n)) return 'neutral';
  if (n >= bad) return 'bad';
  if (n >= warn) return 'warn';
  return 'good';
}

/** Netto-Fluss: positiv = gut */
export function toneNet(n: number | undefined | null): StatusTone {
  if (n == null) return 'neutral';
  if (n > 0) return 'good';
  if (n === 0) return 'warn';
  return 'bad';
}

export function toneHousing(used: number, cap: number): StatusTone {
  if (cap <= 0) return 'neutral';
  const pct = (used / cap) * 100;
  if (pct <= 85) return 'good';
  if (pct <= 100) return 'warn';
  return 'bad';
}

export function toneJobs(pop: number, jobs: number): StatusTone {
  if (pop <= 0) return 'neutral';
  const pct = (jobs / pop) * 100;
  if (pct >= 90) return 'good';
  if (pct >= 70) return 'warn';
  return 'bad';
}
