// Generates an offline puzzle pack from engine self-play between weak "human-like" bots.
// A position becomes a puzzle when one move clearly wins (material or mate) and is unique,
// and every later move of the solver in the line is unique too.
// Usage: npx tsx tools/gen-puzzles.ts <count> <outfile> <seed>
import { Chess } from 'chess.js';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { NodeEngine } from './nodeEngine';
import { pickHumanLike } from '../src/lib/bot';
import { winPct } from '../src/lib/evalUtil';
import { balance, forkTargets, lineTactics, loosePieces, discoveredTargets, playUci, pieceList, phaseOf } from '../src/lib/chessUtil';

const target = Number(process.argv[2] ?? 50);
const out = process.argv[3] ?? 'tools/puzzles-raw.json';
let seed = Number(process.argv[4] ?? 1);
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

type Puzzle = { id: string; fen: string; lastMove: string; solution: string[]; themes: string[]; rating: number };
const puzzles: Puzzle[] = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : [];
const seen = new Set(puzzles.map((p) => p.fen.split(' ').slice(0, 4).join(' ')));

const eng = new NodeEngine({ Hash: '64' });

const gap = (a: { score: { cp?: number; mate?: number } }, b?: { score: { cp?: number; mate?: number } }) =>
  b ? winPct(a.score) - winPct(b.score) : 100;

async function unique(fen: string, depth: number) {
  const a = await eng.analyse(fen, { depth, multipv: 2 });
  const [l1, l2] = a.lines;
  if (!l1) return null;
  const isMate = l1.score.mate !== undefined && l1.score.mate > 0;
  const g = gap(l1, l2);
  // A unique move: everything else is much worse, or it's the only mate while the next best isn't mate.
  const ok = isMate ? !(l2 && l2.score.mate !== undefined && l2.score.mate > 0 && l2.score.mate <= l1.score.mate! + 1) : g >= 22;
  return { a, ok, l1 };
}

async function buildPuzzle(fen: string, lastMove: string): Promise<Puzzle | null> {
  const u = await unique(fen, 16);
  if (!u || !u.ok) return null;
  const l1 = u.l1;
  const win = winPct(l1.score);
  if (win < 80) return null;
  const isMate = l1.score.mate !== undefined && l1.score.mate > 0;
  if (isMate && l1.score.mate! > 4) return null;
  const c = new Chess(fen);
  const me = c.turn();
  const base = balance(c, me);
  const solution: string[] = [];
  let pv = l1.pv;
  // Walk the line, checking each of our moves is unique.
  for (let i = 0; i < 9; i++) {
    const mv = pv[0];
    if (!mv) break;
    if (c.turn() === me && i > 0) {
      const uu = await unique(c.fen(), 14);
      if (!uu || !uu.ok || uu.l1.move !== mv) break;
      pv = uu.l1.pv;
    }
    const m = playUci(c, pv[0]);
    if (!m) break;
    solution.push(pv[0]);
    pv = pv.slice(1);
    if (c.isCheckmate()) break;
    if (!isMate && m.color === me && balance(c, me) - base >= 2) {
      // Material realised. Stop if the opponent can't immediately win it back.
      const reply = await eng.analyse(c.fen(), { depth: 12, multipv: 1 });
      const r = reply.lines[0];
      const c2 = new Chess(c.fen());
      if (r && playUci(c2, r.move) && balance(c2, me) - base >= 2) break;
      if (!r) break;
      pv = r.pv;
    }
  }
  if (!solution.length || solution.length % 2 === 0) {
    if (solution.length % 2 === 0) solution.pop();
  }
  if (!solution.length) return null;
  if (isMate && !(() => { const t = new Chess(fen); for (const s of solution) playUci(t, s); return t.isCheckmate(); })()) return null;
  if (!isMate) {
    const t = new Chess(fen);
    for (const s of solution) playUci(t, s);
    if (balance(t, me) - base < 2 && solution.length < 3) return null;
  }
  const themes = classify(fen, solution, isMate ? l1.score.mate! : 0);
  const n = Math.ceil(solution.length / 2);
  let rating = 900 + (n - 1) * 300;
  if (themes.includes('hangingPiece')) rating -= 150;
  if (themes.includes('mateIn1')) rating -= 100;
  if (themes.includes('fork') || themes.includes('pin') || themes.includes('skewer')) rating += 100;
  if (themes.includes('discoveredAttack')) rating += 200;
  rating += Math.round(rand() * 120 - 60);
  return { id: `g${Date.now().toString(36)}${Math.floor(rand() * 1e4)}`, fen, lastMove, solution, themes, rating };
}

function classify(fen: string, solution: string[], mate: number): string[] {
  const t: string[] = [];
  const before = new Chess(fen);
  const after = new Chess(fen);
  const m = playUci(after, solution[0])!;
  if (mate) {
    t.push(`mateIn${mate}`, 'mate');
    const end = new Chess(fen);
    for (const s of solution) playUci(end, s);
    const last = end.history({ verbose: true }).at(-1)!;
    const kSq = pieceList(end, end.turn()).find((p) => p.type === 'k')!.square;
    const backRank = end.turn() === 'w' ? '1' : '8';
    if ((last.piece === 'r' || last.piece === 'q') && kSq[1] === backRank && last.to[1] === backRank) t.push('backRankMate');
  }
  if (m.captured && loosePieces(before, before.turn() === 'w' ? 'b' : 'w').some((l) => l.square === m.to && l.undefended))
    t.push('hangingPiece');
  const simpleGrab = t.includes('hangingPiece');
  if (!simpleGrab) {
    if (forkTargets(after, m.to).length >= 2) t.push('fork');
    const lt = lineTactics(after, m.to);
    if (lt.some((x) => x.kind === 'pin')) t.push('pin');
    if (lt.some((x) => x.kind === 'skewer')) t.push('skewer');
    if (discoveredTargets(before, after, m).length) t.push('discoveredAttack');
  }
  if (!m.captured && !m.san.includes('+')) t.push('quietMove');
  t.push(phaseOf(before));
  t.push(solution.length <= 3 ? 'short' : 'long');
  return [...new Set(t)];
}

async function playGame() {
  const c = new Chess();
  const eloW = 700 + Math.floor(rand() * 1100);
  const eloB = 700 + Math.floor(rand() * 1100);
  // Random-ish opening for variety.
  const openingPlies = 4 + Math.floor(rand() * 6);
  for (let i = 0; i < openingPlies; i++) {
    const a = await eng.analyse(c.fen(), { depth: 8, multipv: 4 });
    const pick = a.lines[Math.floor(rand() * Math.min(4, a.lines.length))];
    if (!pick) return;
    playUci(c, pick.move);
  }
  let found = 0;
  while (!c.isGameOver() && c.history().length < 140 && puzzles.length < target) {
    const fen = c.fen();
    const elo = c.turn() === 'w' ? eloW : eloB;
    const depth = Math.max(1, Math.round(1 + elo / 260));
    const a = await eng.analyse(fen, { depth, multipv: 8 });
    const mv = pickHumanLike(fen, a.lines, elo, rand);
    playUci(c, mv);
    if (c.isGameOver() || c.history().length < 10) continue;
    // Is there now a winning, unique move for the side to move?
    const scan = await eng.analyse(c.fen(), { depth: 10, multipv: 2 });
    const [s1, s2] = scan.lines;
    if (!s1 || winPct(s1.score) < 78 || gap(s1, s2) < 22) continue;
    const key = c.fen().split(' ').slice(0, 4).join(' ');
    if (seen.has(key)) continue;
    const p = await buildPuzzle(c.fen(), mv);
    const hanging = puzzles.filter((x) => x.themes.includes('hangingPiece')).length;
    if (p && p.themes.includes('hangingPiece') && hanging > puzzles.length * 0.25) continue;
    if (p) {
      seen.add(key);
      puzzles.push(p);
      found++;
      writeFileSync(out, JSON.stringify(puzzles, null, 0));
      console.log(`${puzzles.length}/${target} ${p.themes.join(',')} ${p.solution.length} plies r${p.rating}`);
      if (found >= 3) return; // spread puzzles across many games
    }
  }
}

while (puzzles.length < target) await playGame();
eng.quit();
process.exit(0);
