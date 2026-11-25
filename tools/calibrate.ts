// Sanity check for the game-rating estimate: bots of different strength play themselves,
// and the estimate should rise with their Elo.
import { Chess } from 'chess.js';
import { NodeEngine } from './nodeEngine';
import { botSearchParams, pickHumanLike } from '../src/lib/bot';
import { reviewGame, gameRating } from '../src/lib/review';
import { playUci } from '../src/lib/chessUtil';

// One engine instance (the npm build doesn't like several in one process); options are toggled per use.
const eng = new NodeEngine({ Hash: '64' });
const analysis = eng;
const human = eng;
const limited = eng;
const strength = (on: boolean) => eng.command(`setoption name UCI_LimitStrength value ${on}`);

async function move(fen: string, elo: number) {
  const p = botSearchParams(elo);
  if (p.mode === 'limit') {
    strength(true);
    limited.command(`setoption name UCI_Elo value ${p.elo}`);
    const a = await limited.analyse(fen, { movetime: 300, multipv: 1 });
    strength(false);
    return a.lines[0].move;
  }
  const a = await human.analyse(fen, { depth: p.depth, multipv: p.multipv });
  return pickHumanLike(fen, a.lines, elo);
}

for (const elo of (process.argv[2] ?? '300,700,1100,1500,2000').split(',').map(Number)) {
  const ests: number[] = [];
  for (let g = 0; g < 2; g++) {
    const c = new Chess();
    const ucis: string[] = [];
    while (!c.isGameOver() && ucis.length < 90) {
      const mv = await move(c.fen(), elo);
      playUci(c, mv);
      ucis.push(mv);
    }
    const reps = await reviewGame(new Chess().fen(), ucis, analysis, { depth: 11, multipv: 2 });
    for (const col of ['w', 'b'] as const) {
      const r = gameRating(reps, col);
      if (r) ests.push(r.estimate);
    }
  }
  console.log(`bot ${elo}: estimates ${ests.join(', ')}  mean ${Math.round(ests.reduce((a, b) => a + b, 0) / ests.length)}`);
}
eng.quit();
process.exit(0);
