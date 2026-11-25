import { Chess } from 'chess.js';
import { botSearchParams, pickHumanLike } from '../lib/bot';
import { getBotEngine } from './browserEngine';

/** Get a move for the computer opponent at the given Elo (100–3000). */
export async function botMove(fen: string, elo: number): Promise<string> {
  const eng = getBotEngine();
  const p = botSearchParams(elo);
  if (p.mode === 'limit') {
    eng.setOption('UCI_LimitStrength', true);
    eng.setOption('UCI_Elo', p.elo);
    const a = await eng.analyse(fen, { movetime: p.movetime, multipv: 1 });
    return a.lines[0].move;
  }
  eng.setOption('UCI_LimitStrength', false);
  const a = await eng.analyse(fen, { depth: p.depth, multipv: p.multipv });
  return pickHumanLike(fen, a.lines, elo);
}

export function startFenPly(fen: string) {
  const parts = fen.split(' ');
  return (Number(parts[5] ?? 1) - 1) * 2 + (parts[1] === 'b' ? 1 : 0);
}

/**
 * How long a human-ish opponent "takes" over a move, in ms. Varies with the position:
 * forced moves and recaptures are quick, quiet middlegame moves take longer, and the clock is respected.
 */
export function thinkTimeMs(fenBefore: string, uci: string, ply: number, lastUci: string | undefined, clockLeftMs?: number) {
  const c = new Chess(fenBefore);
  const legal = c.moves({ verbose: true });
  const rand = () => Math.random();
  // Log-normal-ish: most moves 0.6–2.5 s, the odd long think.
  const lognormal = (median: number, spread: number) => median * Math.exp((rand() + rand() + rand() - 1.5) * spread);
  let ms: number;
  const move = legal.find((m) => m.from + m.to + (m.promotion ?? '') === uci);
  const isRecapture = !!move?.captured && !!lastUci && lastUci.slice(2, 4) === move.to;
  if (legal.length === 1) ms = 250 + rand() * 250;
  else if (isRecapture) ms = 300 + rand() * 600;
  else if (ply < 8) ms = 350 + rand() * 900;
  else if (c.inCheck()) ms = lognormal(900, 0.6);
  else {
    const tension = legal.filter((m) => m.captured).length;
    ms = lognormal(1100 + tension * 120, 0.75);
    if (rand() < 0.08) ms += 2000 + rand() * 3000; // occasionally a long think
  }
  if (clockLeftMs !== undefined) ms = Math.min(ms, Math.max(150, clockLeftMs / 25));
  return Math.max(200, Math.min(ms, 7000));
}
