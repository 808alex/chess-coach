// A compact opening book: enough to recognise common openings and label "book" moves.
// Each entry is a named main line in SAN. A move sequence is "in book" if it is a prefix of some line.

export const BOOK: [string, string][] = [
  ['Ruy Lopez: Closed', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3'],
  ['Ruy Lopez: Open', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6'],
  ['Ruy Lopez: Morphy Defence, 5.Nc3', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 Nc3 b5 Bb3 Be7 d3 d6'],
  ['Ruy Lopez: Morphy Defence, 5.Nc3 Bc5', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 Nc3 b5 Bb3 Bc5 d3 d6'],
  ['Ruy Lopez: Morphy Defence, 5.d3', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 d3 b5 Bb3 Be7 O-O d6'],
  ['Ruy Lopez: Exchange Variation', 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5'],
  ['Ruy Lopez: Berlin Defence', 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5'],
  ['Ruy Lopez: Berlin, 4.d3', 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 c3 O-O O-O d6'],
  ['Ruy Lopez: Classical Defence', 'e4 e5 Nf3 Nc6 Bb5 Bc5 c3 Nf6 O-O O-O d4 Bb6'],
  ['Ruy Lopez: Steinitz Defence', 'e4 e5 Nf3 Nc6 Bb5 d6 d4 Bd7 Nc3 Nf6 O-O Be7'],
  ['Ruy Lopez: Schliemann', 'e4 e5 Nf3 Nc6 Bb5 f5 d3 fxe4 dxe4 Nf6 O-O d6'],
  ['Ruy Lopez: Bird Defence', 'e4 e5 Nf3 Nc6 Bb5 Nd4 Nxd4 exd4 O-O c6 Ba4 Nf6'],
  ['Four Knights: Spanish', 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6'],
  ['Four Knights: Scotch', 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nxd4 Bb4 Nxc6 bxc6 Bd3 d5'],
  ['Four Knights: Italian', 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bc4 Nxe4 Nxe4 d5'],
  ['Italian Game: Giuoco Piano', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O'],
  ['Italian Game: Main Line', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5'],
  ['Italian Game: 4.Ng5?? Qxg5', 'e4 e5 Nf3 Nc6 Bc4 Bc5 Ng5 Qxg5'],
  ['Italian Game: Evans Gambit', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5'],
  ['Two Knights Defence', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O'],
  ['Two Knights: Fried Liver line', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6'],
  ['Scotch Game', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7'],
  ['Scotch Game: Classical', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7'],
  ['Petrov Defence', 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3'],
  ['Philidor Defence', 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7'],
  ['Vienna Game', 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7'],
  ['Vienna Game: Bc4', 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5'],
  ["King's Gambit Declined: Falkbeer", 'e4 e5 f4 d5 exd5 exf4 Nf3 Nf6'],
  ["King's Gambit Accepted", 'e4 e5 f4 exf4 Nf3 g5'],
  ["Bishop's Opening", 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5'],
  ['Center Game', 'e4 e5 d4 exd4 Qxd4 Nc6 Qe3 Nf6 Nc3 Bb4 Bd2 O-O'],
  ["Wayward Queen Attack", 'e4 e5 Qh5 Nc6 Bc4 g6 Qf3 Nf6'],
  ['Sicilian: Alapin', 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Be2 Nc6 O-O'],
  ['Sicilian: Alapin, 2...Nf6', 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4'],
  ['Sicilian: Alapin, 2...Nc6', 'e4 c5 c3 Nc6 d4 d5 exd5 Qxd5 Nf3 cxd4 cxd4 e5'],
  ['Sicilian: Alapin, 2...e6', 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Qb6'],
  ['Sicilian: Alapin, 2...d6', 'e4 c5 c3 d6 d4 Nf6 Bd3 cxd4 cxd4'],
  ['Sicilian: Alapin, 2...g6', 'e4 c5 c3 g6 d4 cxd4 cxd4 d5 e5'],
  ['Sicilian: Najdorf', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'],
  ['Sicilian: Dragon', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6'],
  ['Sicilian: Open, 2...Nc6', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5'],
  ['Sicilian: Open, 2...e6', 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6'],
  ['Sicilian: Rossolimo', 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7'],
  ['Sicilian: Closed', 'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6'],
  ['French: Advance', 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2'],
  ['French: Winawer', 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7'],
  ['French: Classical', 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7'],
  ['French: Exchange', 'e4 e6 d4 d5 exd5 exd5'],
  ['French: Tarrasch', 'e4 e6 d4 d5 Nd2 c5'],
  ['Caro-Kann: Advance', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6'],
  ['Caro-Kann: Classical', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6'],
  ['Caro-Kann: Exchange', 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3'],
  ['Scandinavian: Main Line', 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2'],
  ['Scandinavian: Qd6', 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3'],
  ['Scandinavian: Modern', 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 Bg4 Be2'],
  ['Pirc Defence', 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2'],
  ['Modern Defence', 'e4 g6 d4 Bg7 Nc3 d6 Be3'],
  ['Alekhine Defence', 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O'],
  ['Nimzowitsch Defence', 'e4 Nc6 d4 d5 e5'],
  ["Owen's Defence", 'e4 b6 d4 Bb7 Bd3'],
  ["Queen's Gambit Declined", 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5'],
  ["Queen's Gambit Declined: Exchange", 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 c6 Bd3 O-O'],
  ["Queen's Gambit Declined: 4.Nf3", 'd4 d5 c4 e6 Nc3 Nf6 Nf3 Be7 Bf4 O-O e3 c5'],
  ["Queen's Gambit Accepted", 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5'],
  ['Slav Defence', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4'],
  ['Catalan', 'd4 d5 c4 e6 Nf3 Nf6 g3 Be7 Bg2 O-O O-O dxc4'],
  ['London System', 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3'],
  ['London System: 2.Nf3', 'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6'],
  ['Colle System', 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3 Nc6 Nbd2 Bd6 O-O O-O'],
  ['Nimzo-Indian', 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O'],
  ["Queen's Indian", 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7'],
  ["King's Indian", 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5'],
  ['Grünfeld', 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7'],
  ['Benoni', 'd4 Nf6 c4 c5 d5 e6'],
  ['Trompowsky', 'd4 Nf6 Bg5 Ne4'],
  ['Dutch Defence', 'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7'],
  ['English: Reversed Sicilian', 'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6'],
  ['English: 1...e6', 'c4 e6 Nc3 d5 d4 Nf6'],
  ['English: 1...e6 2.Nf3', 'c4 e6 Nf3 d5 g3 Nf6 Bg2 Be7 O-O O-O'],
  ['Réti Opening', 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7'],
  ["King's Indian Attack", 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O'],
  ['Bird Opening', 'f4 d5 Nf3 Nf6 e3 e6'],
  ['Larsen Opening', 'b3 e5 Bb2 Nc6'],
  ['Hungarian Opening', 'g3 d5 Bg2 Nf6'],
];

// The runtime book is built by tools/build-book.ts from the Lichess opening database (CC0) + the lines above.
import bookData from './book.json';
import { Chess } from 'chess.js';
import { posKey } from '../lib/posKey';

const BOOK_POS = (bookData as { names: string[]; pos: Record<string, number> }).pos;
const BOOK_NAMES = (bookData as { names: string[]; pos: Record<string, number> }).names;

/** Walk a SAN move list from the start. Returns how many plies stay in book and the last opening name seen. */
function walk(sans: string[]) {
  const c = new Chess();
  let inBook = 0;
  let name = '';
  for (let i = 0; i < sans.length; i++) {
    try {
      c.move(sans[i]);
    } catch {
      break;
    }
    const v = BOOK_POS[posKey(c.fen())];
    if (v === undefined) break;
    inBook = i + 1;
    if (v >= 0) name = BOOK_NAMES[v];
  }
  return { inBook, name };
}

/** Is every move of this SAN sequence book? Returns the opening name so far. */
export function bookInfo(sans: string[]): { name: string } | null {
  if (!sans.length) return { name: 'Starting position' };
  const w = walk(sans);
  return w.inBook === sans.length ? { name: w.name || 'Book' } : null;
}

/** Name of the opening a game went into (the last named book position it reached). */
export function openingName(sans: string[]): string {
  return walk(sans).name || 'Unknown opening';
}

/** Book check for any position (used for positions that didn't start from the initial setup). */
export function isBookFen(fen: string) {
  return BOOK_POS[posKey(fen)] !== undefined;
}
