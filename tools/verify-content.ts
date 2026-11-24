// Checks every lesson position, exercise, opening line and book line against chess rules and Stockfish.
// Usage: npx tsx tools/verify-content.ts [--quick]
import { Chess } from 'chess.js';
import { NodeEngine } from './nodeEngine';
import { LESSONS, type Start } from '../src/data/lessons';
import { REPERTOIRE } from '../src/data/repertoire';
import { BOOK } from '../src/data/openingBook';
import { winPct, formatScore, flip } from '../src/lib/evalUtil';
import { balance, validateFen } from '../src/lib/chessUtil';

const quick = process.argv.includes('--quick');
const eng = new NodeEngine({ Hash: '64' });
let errors = 0;
let warns = 0;
const err = (m: string) => {
  errors++;
  console.log('  ERROR ' + m);
};
const warn = (m: string) => {
  warns++;
  console.log('  warn  ' + m);
};

function startFen(s: Start): string {
  if ('fen' in s) {
    const bad = validateFen(s.fen);
    if (bad) throw new Error(`bad FEN ${s.fen}: ${bad}`);
    return s.fen;
  }
  const c = new Chess();
  for (const m of s.moves.split(' ').filter(Boolean)) c.move(m);
  return c.fen();
}

function playLine(fen: string, line: string) {
  const c = new Chess(fen);
  const ucis: string[] = [];
  for (const san of line.split(' ').filter(Boolean)) {
    const m = c.move(san);
    ucis.push(m.from + m.to + (m.promotion ?? ''));
  }
  return { c, ucis };
}

const D = quick ? 14 : 18;

for (const l of LESSONS) {
  console.log(`Lesson ${l.id}`);
  for (const [i, st] of l.steps.entries()) {
    try {
      if (st.kind === 'board') {
        const fen = startFen(st.start);
        if (st.line) playLine(fen, st.line);
      } else if (st.kind === 'play') {
        const fen = startFen(st.start);
        const a = await eng.analyse(fen, { depth: 14 });
        console.log(`  play "${st.label}" eval ${formatScore(a.lines[0].score)} (side to move)`);
      } else if (st.kind === 'exercise') {
        const fen = startFen(st.start);
        const { c, ucis } = playLine(fen, st.solution);
        const a = await eng.analyse(fen, { depth: D, multipv: 4 });
        const best = a.lines[0];
        const mine = a.lines.find((x) => x.move === ucis[0]);
        const sol = mine ? mine.score : flip((await eng.analyse((() => { const t = new Chess(fen); t.move(st.solution.split(' ')[0]); return t.fen(); })(), { depth: D })).lines[0].score);
        const loss = winPct(best.score) - winPct(sol);
        const alts = a.lines.filter((x) => x.move !== ucis[0] && winPct(best.score) - winPct(x.score) <= (st.tolerance ?? 3));
        const tag = `step ${i} [${st.goal}] ${st.solution.split(' ')[0]}`;
        if (st.goal === 'mate') {
          if (!c.isCheckmate()) err(`${tag}: solution does not end in mate`);
          if (best.score.mate === undefined || best.score.mate <= 0) err(`${tag}: engine sees no mate (${formatScore(best.score)})`);
          if (sol.mate === undefined || sol.mate <= 0) err(`${tag}: solution first move is not mating`);
        } else if (st.goal === 'material') {
          const me = new Chess(fen).turn();
          const gain = balance(c, me) - balance(new Chess(fen), me);
          if (loss > 5) err(`${tag}: solution loses ${loss.toFixed(1)}% vs best ${best.move} (${formatScore(best.score)})`);
          if (winPct(sol) < 75) warn(`${tag}: position after solution only ${winPct(sol).toFixed(0)}% for solver`);
          if (gain < (st.minGain ?? 2) && ucis.length > 1) warn(`${tag}: reference line only gains ${gain}`);
        } else {
          if (loss > (st.tolerance ?? 3)) err(`${tag}: loses ${loss.toFixed(1)}% vs best ${best.move} ${formatScore(best.score)}`);
        }
        console.log(`  ${tag}: best ${best.move} ${formatScore(best.score)}, solution ${formatScore(sol)}, loss ${loss.toFixed(1)}%, alternatives within tol: ${alts.map((x) => x.move).join(',') || 'none'}`);
      } else if (st.kind === 'practice') {
        /* resolved at runtime */
      }
    } catch (e) {
      err(`step ${i}: ${(e as Error).message}`);
    }
  }
}

for (const ch of REPERTOIRE) {
  console.log(`Chapter ${ch.id}`);
  for (const line of ch.lines) {
    try {
      const sans = line.moves.split(' ');
      const c = new Chess();
      const fens: string[] = [];
      for (const s of sans) {
        fens.push(c.fen());
        c.move(s);
      }
      for (const k of Object.keys(line.notes)) if (Number(k) >= sans.length) err(`${line.id}: note index ${k} beyond line`);
      if (quick) continue;
      // Check each of OUR moves isn't a real mistake.
      const side = ch.side;
      let worst = 0;
      let worstMove = '';
      for (let i = 0; i < sans.length; i++) {
        const turn = i % 2 === 0 ? 'w' : 'b';
        if (turn !== side) continue;
        const a = await eng.analyse(fens[i], { depth: 14, multipv: 1 });
        const after = new Chess(fens[i]);
        after.move(sans[i]);
        const b = await eng.analyse(after.fen(), { depth: 14 });
        const loss = winPct(a.lines[0].score) - winPct(flip(b.lines[0].score));
        if (loss > worst) {
          worst = loss;
          worstMove = `${Math.floor(i / 2) + 1}${turn === 'w' ? '.' : '...'}${sans[i]} (best ${a.lines[0].move})`;
        }
      }
      const end = await eng.analyse(c.fen(), { depth: 16 });
      const endScore = c.turn() === side ? end.lines[0].score : flip(end.lines[0].score);
      const msg = `${line.id}: end eval for us ${formatScore(endScore)}, worst move ${worstMove} -${worst.toFixed(1)}%`;
      if (worst > 9) err(msg);
      else if (winPct(endScore) < 40) warn(msg);
      else console.log('  ' + msg);
    } catch (e) {
      err(`${line.id}: ${(e as Error).message}`);
    }
  }
}

for (const [name, line] of BOOK) {
  try {
    const c = new Chess();
    for (const s of line.split(' ')) c.move(s);
  } catch (e) {
    err(`book "${name}": ${(e as Error).message}`);
  }
}

console.log(`\n${errors} errors, ${warns} warnings`);
eng.quit();
process.exit(errors ? 1 : 0);
