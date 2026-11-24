import { Chess, type Color } from 'chess.js';
import type { Analysis, Engine } from './engineTypes';
import { judgeMove, type MoveReport, type Tag } from './coach';
import { BAD_CLASSES, type MoveClass } from './evalUtil';
import { playUci, phaseOf } from './chessUtil';
import { bookInfo } from '../data/openingBook';

export type GameSummary = {
  accuracy: number;
  counts: Partial<Record<MoveClass, number>>;
  tags: Partial<Record<Tag, number>>;
  blundersByPhase: { opening: number; middlegame: number; endgame: number };
};

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
  return { accuracy: Math.round((mean + harmonic) / 2), counts, tags, blundersByPhase };
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
