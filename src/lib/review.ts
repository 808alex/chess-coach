import { Chess, type Color } from 'chess.js';
import type { Analysis, Engine } from './engineTypes';
import { judgeMove, type MoveReport, type Tag } from './coach';
import { BAD_CLASSES, type MoveClass } from './evalUtil';
import { playUci, phaseOf } from './chessUtil';
import { bookInfo } from '../data/openingBook';

export type GameSummary = {
  accuracy: number;
  acpl?: number;
  rating?: GameRating;
  counts: Partial<Record<MoveClass, number>>;
  tags: Partial<Record<Tag, number>>;
  blundersByPhase: { opening: number; middlegame: number; endgame: number };
};

export type GameRating = {
  estimate: number;
  low: number;
  high: number;
  phases: Partial<Record<'opening' | 'middlegame' | 'endgame', number>>;
};

// Average centipawn loss -> rating. Anchors follow the commonly reported relationship between
// ACPL and rating in online games (roughly: 100 ≈ 1000, 60 ≈ 1500, 35 ≈ 2000, 20 ≈ 2500).
const ACPL_TABLE: [number, number][] = [
  [5, 3000],
  [10, 2750],
  [20, 2450],
  [35, 2000],
  [50, 1700],
  [65, 1450],
  [85, 1200],
  [110, 950],
  [150, 700],
  [220, 450],
  [320, 200],
];
export function ratingFromAcpl(acpl: number) {
  if (acpl <= ACPL_TABLE[0][0]) return ACPL_TABLE[0][1];
  for (let i = 1; i < ACPL_TABLE.length; i++) {
    const [x1, y1] = ACPL_TABLE[i];
    const [x0, y0] = ACPL_TABLE[i - 1];
    if (acpl <= x1) return Math.round(y0 + ((acpl - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 100;
}

function estimate(moves: MoveReport[]) {
  // Ignore moves where the game was already completely decided (big evals inflate losses).
  const counted = moves.filter((r) => r.winBefore > 3 && r.winBefore < 97);
  const use = counted.length >= 5 ? counted : moves;
  const acpl = use.length ? use.reduce((s, r) => s + Math.min(r.cpLoss ?? 0, 600), 0) / use.length : 0;
  return { acpl, raw: ratingFromAcpl(acpl), n: use.length };
}

export function gameRating(reports: MoveReport[], color: Color): GameRating | undefined {
  const mine = reports.filter((r) => r.color === color && r.cpLoss !== undefined);
  if (mine.length < 6) return undefined;
  const all = estimate(mine);
  // Short games say little: pull towards a neutral 1200 with a weight of 8 moves.
  const est = Math.round((all.raw * all.n + 1200 * 8) / (all.n + 8) / 10) * 10;
  const spread = Math.round(Math.max(120, 900 / Math.sqrt(all.n)) / 10) * 10;
  const phases: GameRating['phases'] = {};
  for (const ph of ['opening', 'middlegame', 'endgame'] as const) {
    const sub = mine.filter((r) => phaseOf(new Chess(r.fenBefore)) === ph);
    if (sub.length >= 4) phases[ph] = Math.round(estimate(sub).raw / 10) * 10;
  }
  return { estimate: est, low: Math.max(100, est - spread), high: Math.min(3000, est + spread), phases };
}

export function summarize(reports: MoveReport[], color: Color): GameSummary {
  const mine = reports.filter((r) => r.color === color);
  const counts: Partial<Record<MoveClass, number>> = {};
  const tags: Partial<Record<Tag, number>> = {};
  const blundersByPhase = { opening: 0, middlegame: 0, endgame: 0 };
  for (const r of mine) {
    counts[r.cls] = (counts[r.cls] ?? 0) + 1;
    if (BAD_CLASSES.includes(r.cls)) {
      for (const t of r.tags) tags[t] = (tags[t] ?? 0) + 1;
    }
    if (r.cls === 'blunder' || r.cls === 'mistake' || r.cls === 'miss') {
      blundersByPhase[phaseOf(new Chess(r.fenBefore))]++;
    }
  }
  // Harmonic-ish mean like Lichess: average, but pulled down by bad moves.
  const accs = mine.map((r) => r.accuracy);
  const mean = accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : 0;
  const harmonic = accs.length ? accs.length / accs.reduce((a, b) => a + 1 / Math.max(1, b), 0) : 0;
  const rating = gameRating(reports, color);
  const acpl = mine.length ? Math.round(mine.reduce((s, r) => s + Math.min(r.cpLoss ?? 0, 600), 0) / mine.length) : 0;
  return { accuracy: Math.round((mean + harmonic) / 2), acpl, rating, counts, tags, blundersByPhase };
}

export type ReviewOptions = { depth: number; multipv?: number };

/** Analyse every position of a game and grade every move. */
export async function reviewGame(
  startFen: string,
  ucis: string[],
  engine: Engine,
  opts: ReviewOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<MoveReport[]> {
  const fens: string[] = [startFen];
  const c = new Chess(startFen);
  for (const u of ucis) {
    if (!playUci(c, u)) break;
    fens.push(c.fen());
  }
  const analyses: (Analysis | null)[] = [];
  for (let i = 0; i < fens.length; i++) {
    const pos = new Chess(fens[i]);
    analyses.push(pos.isGameOver() ? null : await engine.analyse(fens[i], { depth: opts.depth, multipv: opts.multipv ?? 3 }));
    onProgress?.(i + 1, fens.length);
  }
  const reports: MoveReport[] = [];
  const sanSoFar: string[] = [];
  let inBook = startFen === new Chess().fen();
  for (let i = 0; i < fens.length - 1; i++) {
    const a = analyses[i];
    if (!a) break;
    const san = new Chess(fens[i]).move({ from: ucis[i].slice(0, 2), to: ucis[i].slice(2, 4), promotion: ucis[i][4] }).san;
    sanSoFar.push(san);
    inBook = inBook && !!bookInfo(sanSoFar);
    reports.push(judgeMove(fens[i], ucis[i], a, analyses[i + 1], { ply: i, isBook: inBook }));
  }
  return reports;
}
