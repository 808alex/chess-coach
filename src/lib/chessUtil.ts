import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';

export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
export const NAME: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
export const colorName = (c: Color) => (c === 'w' ? 'White' : 'Black');

const FILES = 'abcdefgh';
export const ALL_SQUARES: Square[] = (() => {
  const out: Square[] = [];
  for (let r = 8; r >= 1; r--) for (const f of FILES) out.push(`${f}${r}` as Square);
  return out;
})();

export function parseUci(uci: string) {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: (uci.length > 4 ? uci[4] : undefined) as PieceSymbol | undefined,
  };
}

export function moveToUci(m: { from: string; to: string; promotion?: string }) {
  return m.from + m.to + (m.promotion ?? '');
}

/** Play a UCI move on a chess instance. Returns the Move or null if illegal. */
export function playUci(chess: Chess, uci: string): Move | null {
  try {
    return chess.move(parseUci(uci));
  } catch {
    return null;
  }
}

export function sanOf(fen: string, uci: string): string {
  const c = new Chess(fen);
  const m = playUci(c, uci);
  return m ? m.san : uci;
}

/** Format a list of UCI moves as SAN with move numbers, e.g. "12. Nxe5 dxe5 13. Qh5". */
export function pvToSan(fen: string, pv: string[], max = 8): string {
  const c = new Chess(fen);
  const parts: string[] = [];
  let moveNo = c.moveNumber();
  let first = true;
  for (const uci of pv.slice(0, max)) {
    const turn = c.turn();
    const m = playUci(c, uci);
    if (!m) break;
    if (turn === 'w') parts.push(`${moveNo}. ${m.san}`);
    else parts.push(first ? `${moveNo}... ${m.san}` : m.san);
    if (turn === 'b') moveNo++;
    first = false;
  }
  return parts.join(' ');
}

export function pieceList(chess: Chess, color: Color) {
  const out: { square: Square; type: PieceSymbol }[] = [];
  for (const row of chess.board())
    for (const p of row) if (p && p.color === color) out.push({ square: p.square, type: p.type });
  return out;
}

export function material(chess: Chess, color: Color): number {
  return pieceList(chess, color)
    .filter((p) => p.type !== 'k')
    .reduce((s, p) => s + VALUE[p.type], 0);
}

export function balance(chess: Chess, color: Color) {
  return material(chess, color) - material(chess, other(color));
}

export type Loose = {
  square: Square;
  type: PieceSymbol;
  attackers: Square[];
  defenders: Square[];
  cheapest: PieceSymbol;
  undefended: boolean;
};

/** Pieces of `color` that are attacked and either undefended or attacked by something cheaper. */
export function loosePieces(chess: Chess, color: Color): Loose[] {
  const out: Loose[] = [];
  const enemy = other(color);
  for (const p of pieceList(chess, color)) {
    if (p.type === 'k') continue;
    const attackers = chess.attackers(p.square, enemy);
    if (!attackers.length) continue;
    const defenders = chess.attackers(p.square, color);
    const types = attackers.map((s) => chess.get(s)!.type);
    // A king can only take an undefended piece.
    const usable = defenders.length ? types.filter((t) => t !== 'k') : types;
    if (!usable.length) continue;
    const cheapest = usable.reduce((a, b) => (VALUE[a] <= VALUE[b] ? a : b));
    if (!defenders.length || VALUE[cheapest] < VALUE[p.type]) {
      out.push({ square: p.square, type: p.type, attackers, defenders, cheapest, undefended: !defenders.length });
    }
  }
  return out.sort((a, b) => VALUE[b.type] - VALUE[a.type]);
}

/** Enemy pieces attacked by the piece standing on `sq`. */
export function targetsOf(chess: Chess, sq: Square) {
  const piece = chess.get(sq);
  if (!piece) return [];
  const enemy = other(piece.color);
  return pieceList(chess, enemy).filter((t) => chess.attackers(t.square, piece.color).includes(sq));
}

/** If the piece on `sq` attacks two or more worthwhile targets, return them. */
export function forkTargets(chess: Chess, sq: Square) {
  const piece = chess.get(sq);
  if (!piece) return [];
  const enemy = other(piece.color);
  const worthwhile = targetsOf(chess, sq).filter(
    (t) => t.type === 'k' || VALUE[t.type] > VALUE[piece.type] || chess.attackers(t.square, enemy).length === 0,
  );
  return worthwhile.length >= 2 ? worthwhile : [];
}

const DIRS: Record<string, [number, number][]> = {
  b: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
  r: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
};
DIRS.q = [...DIRS.b, ...DIRS.r];

function sqAt(f: number, r: number): Square | null {
  if (f < 0 || f > 7 || r < 0 || r > 7) return null;
  return `${FILES[f]}${r + 1}` as Square;
}

export type LineTactic = {
  kind: 'pin' | 'skewer';
  front: { square: Square; type: PieceSymbol };
  back: { square: Square; type: PieceSymbol };
};

/** Pins and skewers created by a sliding piece on `sq`. */
export function lineTactics(chess: Chess, sq: Square): LineTactic[] {
  const piece = chess.get(sq);
  if (!piece || !DIRS[piece.type]) return [];
  const out: LineTactic[] = [];
  const f0 = FILES.indexOf(sq[0]);
  const r0 = Number(sq[1]) - 1;
  for (const [df, dr] of DIRS[piece.type]) {
    const found: { square: Square; type: PieceSymbol; color: Color }[] = [];
    let f = f0 + df;
    let r = r0 + dr;
    while (found.length < 2) {
      const s = sqAt(f, r);
      if (!s) break;
      const p = chess.get(s);
      if (p) found.push({ square: s, type: p.type, color: p.color });
      f += df;
      r += dr;
    }
    if (found.length < 2) continue;
    const [a, b] = found;
    if (a.color === piece.color || b.color === piece.color) continue;
    if (VALUE[b.type] > VALUE[a.type]) {
      // Pin: the front piece can't move without exposing something bigger behind it.
      if (a.type !== 'p' || b.type === 'k' || b.type === 'q') out.push({ kind: 'pin', front: a, back: b });
    } else if (VALUE[a.type] > VALUE[b.type] && (a.type === 'k' || VALUE[a.type] > VALUE[piece.type])) {
      // Skewer: the big piece in front has to move and the one behind falls.
      if (b.type !== 'p') out.push({ kind: 'skewer', front: a, back: b });
    }
  }
  return out;
}

/** Enemy pieces that pieces of `color` (other than the one on `except`) attack. */
function attackSet(chess: Chess, color: Color, except?: Square) {
  const set = new Set<string>();
  for (const t of pieceList(chess, other(color))) {
    const att = chess.attackers(t.square, color).filter((s) => s !== except);
    if (att.length) set.add(t.square);
  }
  return set;
}

/** New attacks opened up by a move (discovered attacks), excluding the moved piece's own attacks. */
export function discoveredTargets(before: Chess, after: Chess, move: Move) {
  const color = move.color;
  const pre = attackSet(before, color, move.from);
  const post = attackSet(after, color, move.to);
  const out: { square: Square; type: PieceSymbol }[] = [];
  for (const s of post) {
    if (pre.has(s)) continue;
    const p = after.get(s as Square)!;
    // Only count attacks that are not just by the moved piece itself.
    const att = after.attackers(s as Square, color).filter((a) => a !== move.to);
    if (!att.length) continue;
    const defended = after.attackers(s as Square, other(color)).length > 0;
    const cheapest = Math.min(...att.map((a) => VALUE[after.get(a)!.type]));
    if (p.type === 'k' || !defended || cheapest < VALUE[p.type]) out.push({ square: s as Square, type: p.type });
  }
  return out;
}

export type Swing = {
  delta: number; // material change for the side to move at the start
  gained: PieceSymbol[]; // pieces captured by the side to move
  lost: PieceSymbol[]; // pieces captured from the side to move
  mate: boolean;
};

/** Play out a PV and measure the material swing at the last quiet point. */
export function pvSwing(fen: string, pv: string[], maxPlies = 10): Swing {
  const c = new Chess(fen);
  const me = c.turn();
  const base = balance(c, me);
  let best: Swing = { delta: 0, gained: [], lost: [], mate: false };
  const gained: PieceSymbol[] = [];
  const lost: PieceSymbol[] = [];
  for (let i = 0; i < Math.min(pv.length, maxPlies); i++) {
    const mover = c.turn();
    const m = playUci(c, pv[i]);
    if (!m) break;
    if (m.captured) (mover === me ? gained : lost).push(m.captured);
    if (m.promotion) (mover === me ? gained : lost).push('p'); // promotion counted via balance anyway
    if (c.isCheckmate()) return { delta: mover === me ? 99 : -99, gained: [...gained], lost: [...lost], mate: true };
    const next = pv[i + 1];
    let nextIsCapture = false;
    if (next) {
      const { to } = parseUci(next);
      nextIsCapture = !!c.get(to) || c.inCheck();
    }
    if (!nextIsCapture) best = { delta: balance(c, me) - base, gained: [...gained], lost: [...lost], mate: false };
  }
  return best;
}

export function describeNet(s: Swing): string {
  const g = [...s.gained];
  const l = [...s.lost];
  // Cancel out equal trades.
  for (let i = g.length - 1; i >= 0; i--) {
    const j = l.indexOf(g[i]);
    if (j >= 0) {
      g.splice(i, 1);
      l.splice(j, 1);
    }
  }
  const big = (arr: PieceSymbol[]) => [...arr].sort((a, b) => VALUE[b] - VALUE[a]);
  const name = (arr: PieceSymbol[]) => {
    const s = big(arr);
    if (!s.length) return '';
    if (s.every((t) => t === 'p')) return s.length === 1 ? 'a pawn' : `${s.length} pawns`;
    const main = s.filter((t) => t !== 'p').map((t) => `a ${NAME[t]}`);
    const pawns = s.filter((t) => t === 'p').length;
    return main.join(' and ') + (pawns ? ` and ${pawns === 1 ? 'a pawn' : pawns + ' pawns'}` : '');
  };
  if (g.length && l.length) return `${name(g)} for ${name(l)}`;
  if (g.length) return name(g);
  if (s.delta > 0) return `about ${s.delta} pawn${s.delta > 1 ? 's' : ''} of material`;
  return 'material';
}

/** FEN with the side to move switched (for "what does my opponent threaten?"). */
export function nullMoveFen(fen: string): string | null {
  const parts = fen.split(' ');
  const c = new Chess(fen);
  if (c.inCheck()) return null;
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  try {
    const flipped = parts.join(' ');
    new Chess(flipped);
    return flipped;
  } catch {
    return null;
  }
}

/** A FEN that chess.js accepts AND where the side not to move isn't in check (Stockfish crashes on those). */
export function validateFen(fen: string): string | null {
  try {
    const c = new Chess(fen);
    for (const color of ['w', 'b'] as const)
      if (c.findPiece({ type: 'k', color }).length !== 1) return 'Each side needs exactly one king.';
    const parts = c.fen().split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    parts[3] = '-';
    const flipped = new Chess(parts.join(' '), { skipValidation: true });
    if (flipped.inCheck()) return 'The side not to move is in check, which is impossible.';
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

export function isDevelopingMove(m: Move) {
  const backRank = m.color === 'w' ? '1' : '8';
  return (m.piece === 'n' || m.piece === 'b') && m.from[1] === backRank;
}

export function phaseOf(chess: Chess): 'opening' | 'middlegame' | 'endgame' {
  const nonPawn = pieceList(chess, 'w')
    .concat(pieceList(chess, 'b'))
    .filter((p) => p.type !== 'k' && p.type !== 'p')
    .reduce((s, p) => s + VALUE[p.type], 0);
  if (chess.moveNumber() <= 12 && nonPawn >= 50) return 'opening';
  if (nonPawn <= 26) return 'endgame';
  return 'middlegame';
}
