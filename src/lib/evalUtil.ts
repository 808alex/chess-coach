import type { Score } from './engineTypes';

/** Turn a score into centipawns, with mates mapped to huge values. */
export function scoreToCp(s: Score): number {
  if (s.mate !== undefined) {
    if (s.mate === 0) return -100000; // side to move is mated
    return s.mate > 0 ? 100000 - s.mate * 100 : -100000 - s.mate * 100;
  }
  return s.cp ?? 0;
}

/** Negate a score (switch point of view). */
export function flip(s: Score): Score {
  if (s.mate !== undefined) return { mate: -s.mate };
  return { cp: -(s.cp ?? 0) };
}

/**
 * Win probability (0-100) for the side whose point of view the score is in.
 * Same curve Lichess uses for its accuracy/annotation model.
 */
export function winPct(s: Score): number {
  if (s.mate !== undefined) {
    if (s.mate === 0) return 0;
    return s.mate > 0 ? 100 : 0;
  }
  const cp = Math.max(-1500, Math.min(1500, s.cp ?? 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Per-move accuracy from the drop in win% (Lichess formula). */
export function moveAccuracy(winBefore: number, winAfter: number): number {
  const diff = Math.max(0, winBefore - winAfter);
  const acc = 103.1668 * Math.exp(-0.04354 * diff) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

/** Human readable score, from White's point of view. */
export function formatScore(s: Score): string {
  if (s.mate !== undefined) {
    if (s.mate === 0) return '#';
    return s.mate > 0 ? `M${s.mate}` : `-M${-s.mate}`;
  }
  const v = (s.cp ?? 0) / 100;
  return (v > 0 ? '+' : '') + v.toFixed(1);
}

export type MoveClass =
  | 'book'
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder';

export const CLASS_INFO: Record<MoveClass, { label: string; color: string; symbol: string }> = {
  book: { label: 'Book', color: '#a88865', symbol: '📖' },
  brilliant: { label: 'Brilliant', color: '#1baca6', symbol: '!!' },
  great: { label: 'Great', color: '#5c8bb0', symbol: '!' },
  best: { label: 'Best', color: '#81b64c', symbol: '★' },
  excellent: { label: 'Excellent', color: '#81b64c', symbol: '👍' },
  good: { label: 'Good', color: '#77915f', symbol: '✓' },
  inaccuracy: { label: 'Inaccuracy', color: '#f7c631', symbol: '?!' },
  mistake: { label: 'Mistake', color: '#ffa459', symbol: '?' },
  miss: { label: 'Missed win', color: '#ff7769', symbol: '✗' },
  blunder: { label: 'Blunder', color: '#fa412d', symbol: '??' },
};

export const BAD_CLASSES: MoveClass[] = ['inaccuracy', 'mistake', 'miss', 'blunder'];
