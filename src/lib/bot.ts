import { Chess } from 'chess.js';
import type { Line } from './engineTypes';
import { scoreToCp } from './evalUtil';
import { VALUE, moveToUci } from './chessUtil';

/** Stockfish's own strength limiter only goes down to 1320, below that we simulate a human. */
export const ENGINE_ELO_FLOOR = 1320;

export function botSearchParams(elo: number) {
  if (elo >= ENGINE_ELO_FLOOR) {
    return { mode: 'limit' as const, elo: Math.min(3190, elo), movetime: elo >= 2400 ? 1200 : 700 };
  }
  return {
    mode: 'sample' as const,
    depth: Math.max(1, Math.round(1 + elo / 260)),
    multipv: 10,
    pRandom: Math.max(0.02, 0.55 - elo * 0.00042),
    temperature: Math.max(45, 420 - 0.28 * elo),
  };
}

/** Pick a move for a sub-1320 bot from a multi-PV analysis. */
export function pickHumanLike(fen: string, lines: Line[], elo: number, rand = Math.random): string {
  const p = botSearchParams(elo);
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  if (!legal.length) throw new Error('no legal moves');
  if (p.mode !== 'sample') return lines[0]?.move ?? moveToUci(legal[0]);

  if (!lines.length || rand() < p.pRandom) {
    // A "human" random move: captures and checks are more tempting than quiet moves.
    const weights = legal.map((m) => {
      let w = 1;
      if (m.captured) w += 1 + VALUE[m.captured] * 0.6;
      if (m.san.includes('+')) w += 1.5;
      if (m.piece === 'k' && !m.san.startsWith('O-O')) w *= 0.4;
      return w;
    });
    return moveToUci(legal[weighted(weights, rand)]);
  }
  const cps = lines.map((l) => Math.max(-2000, Math.min(2000, scoreToCp(l.score))));
  const top = Math.max(...cps);
  const weights = cps.map((cp) => Math.exp((cp - top) / p.temperature));
  return lines[weighted(weights, rand)].move;
}

function weighted(weights: number[], rand: () => number) {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x <= 0) return i;
  }
  return weights.length - 1;
}

export function eloLabel(elo: number) {
  if (elo < 400) return 'Total beginner';
  if (elo < 800) return 'Beginner';
  if (elo < 1100) return 'Casual player';
  if (elo < 1400) return 'Club beginner';
  if (elo < 1700) return 'Intermediate';
  if (elo < 2000) return 'Strong club player';
  if (elo < 2300) return 'Expert';
  if (elo < 2600) return 'Master';
  return 'Super-GM / engine';
}
