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
