// Builds src/data/book.json from the Lichess chess-openings database (CC0) plus this app's repertoire.
// Every position along every named line counts as "book"; named end positions carry the opening name.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { posKey } from '../src/lib/posKey';
import { REPERTOIRE } from '../src/data/repertoire';
import { BOOK } from '../src/data/openingBook';

const names: string[] = [];
const nameIdx = new Map<string, number>();
const pos: Record<string, number> = {}; // key -> name index, or -1 for "in book, no own name"
const seenKeyFen = new Map<string, string>();
let collisions = 0;

function add(name: string | null, sans: string[]) {
  const c = new Chess();
  for (let i = 0; i < sans.length; i++) {
    c.move(sans[i]);
    const fen = c.fen();
    const k = posKey(fen);
    const short = fen.split(' ').slice(0, 3).join(' ');
    const prev = seenKeyFen.get(k);
    if (prev && prev !== short) collisions++;
    seenKeyFen.set(k, short);
    if (i === sans.length - 1 && name) {
      if (!nameIdx.has(name)) {
        nameIdx.set(name, names.length);
        names.push(name);
      }
      // Prefer the first (most general) name for a position.
      if (pos[k] === undefined || pos[k] === -1) pos[k] = nameIdx.get(name)!;
    } else if (pos[k] === undefined) pos[k] = -1;
  }
}

let lines = 0;
for (const f of readdirSync('tools/openings').filter((x) => x.endsWith('.tsv')).sort()) {
  const rows = readFileSync(`tools/openings/${f}`, 'utf8').trim().split('\n').slice(1);
  for (const row of rows) {
    const [, name, pgn] = row.split('\t');
    const sans = pgn.replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/).filter(Boolean);
    add(name, sans);
    lines++;
  }
}
for (const [name, line] of BOOK) add(name, line.split(' '));
// Repertoire lines count as book (they are mainstream theory) but don't rename positions.
for (const ch of REPERTOIRE) for (const l of ch.lines) add(null, l.moves.split(' '));

writeFileSync('src/data/book.json', JSON.stringify({ names, pos }));
console.log(`${lines} Lichess lines, ${names.length} names, ${Object.keys(pos).length} positions, ${collisions} hash collisions`);
