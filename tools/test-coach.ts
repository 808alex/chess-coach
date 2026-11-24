import { Chess } from 'chess.js';
import { NodeEngine } from './nodeEngine';
import { judgeMove, threatReport } from '../src/lib/coach';

const eng = new NodeEngine();
function fenAfter(moves: string[]) { const c = new Chess(); for (const m of moves) c.move(m); return c.fen(); }
async function judge(fen: string, san: string) {
  const c = new Chess(fen); const m = c.move(san); const uci = m.from + m.to + (m.promotion ?? '');
  const a = await eng.analyse(fen, { depth: 13, multipv: 3 });
  const b = c.isGameOver() ? null : await eng.analyse(c.fen(), { depth: 13, multipv: 1 });
  return judgeMove(fen, uci, a, b, { ply: new Chess(fen).history().length });
}
const cases: [string, string[], string, string][] = [
  ['allowed mate', ['e4','e5','Qh5','Nc6','Bc4'], 'Nf6', 'allowed-mate'],
  ['missed mate', ['e4','e5','Qh5','Nc6','Bc4','Nf6'], 'd3', 'missed-mate'],
  ['hung queen', ['e4','e5','Nf3'], 'Qg5', 'hung-piece'],
  ['missed free queen', ['e4','e5','Nf3','Qg5'], 'd3', 'missed-free-piece'],
  ['allowed fork', ['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5'], 'h6', 'allowed-fork'],
  ['found fork', ['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','h6'], 'Nxf7', 'fork'],
  ['removed defender', ['e4','e5','Nf3','Nc6','d4','exd4','Nxd4','Nf6','Nc3','Bb4','Nxc6','bxc6','Bd3','d5','exd5','cxd5','O-O','O-O','Bg5','c6','Qf3','Be7'], 'Bxf6', ''],
  ['screenshot Be7', [], 'Be7', ''],
  ['allowed queen fork', ['e4','e5','Nf3','Nc6','Bc4','Nd4'], 'Nxe5', 'allowed-fork'],
  ['opening queen', ['e4','e5','Nf3','Nc6'], 'Qe2', ''],
];
let fails = 0;
for (const [name, moves, mv, expectTag] of cases) {
  const fen = name.startsWith('screenshot') ? 'r1bqkb1r/2pp1ppp/p1n2n2/1p2p3/4P3/1BN2N2/PPPP1PPP/R1BQK2R b KQkq - 1 6' : fenAfter(moves);
  const r = await judge(fen, mv);
  const ok = !expectTag || r.tags.includes(expectTag as never);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${r.san} [${r.cls}] ${r.headline} | ${r.details.join(' ')} | tags=${r.tags.join(',')} win ${r.winBefore.toFixed(0)}->${r.winAfter.toFixed(0)}`);
}
console.log(threatReport(fenAfter(['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5'])).lines);
console.log(threatReport(fenAfter(['e4','e5','Qh5','Nc6','Bc4'])).lines);
eng.quit();
process.exit(fails ? 1 : 0);
