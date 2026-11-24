import raw from './puzzles.json';

export type Puzzle = {
  id: string;
  fen: string; // solver to move
  lastMove?: string; // opponent's move that led here (UCI)
  solution: string[]; // UCI: solver, reply, solver...
  themes: string[];
  rating: number;
  source?: 'pack' | 'lichess';
};

export const PACK: Puzzle[] = (raw as Puzzle[]).map((p) => ({ ...p, source: 'pack' as const }));

export const THEME_LABELS: Record<string, string> = {
  mix: 'Mixed',
  hangingPiece: 'Hanging pieces',
  fork: 'Forks',
  pin: 'Pins',
  skewer: 'Skewers',
  discoveredAttack: 'Discovered attacks',
  mate: 'Checkmates',
  mateIn1: 'Mate in 1',
  mateIn2: 'Mate in 2',
  mateIn3: 'Mate in 3',
  backRankMate: 'Back-rank mate',
  quietMove: 'Quiet moves',
  short: 'Short (1–2 moves)',
  long: 'Long (3+ moves)',
  opening: 'Opening',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
  defensiveMove: 'Defensive moves',
};

/** Pick puzzles for a theme near a rating, preferring unseen ones. */
export function pickPuzzles(theme: string, rating: number, n: number, seen: string[] = []): Puzzle[] {
  let pool = PACK.filter((p) => theme === 'mix' || p.themes.includes(theme));
  if (!pool.length) pool = PACK;
  const unseen = pool.filter((p) => !seen.includes(p.id));
  const base = unseen.length >= n ? unseen : pool;
  return [...base]
    .map((p) => ({ p, k: Math.abs(p.rating - rating) + Math.random() * 250 }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((x) => x.p);
}

export function themeCounts() {
  const c: Record<string, number> = {};
  for (const p of PACK) for (const t of p.themes) c[t] = (c[t] ?? 0) + 1;
  return c;
}
