import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { defaultPieces } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';
import type { Arrow } from '../lib/coach';
import { useSettings, ANIM_MS } from '../lib/useSettings';
import { themeById } from '../lib/themes';
import { moveSound, play } from '../lib/sound';
import { playUci } from '../lib/chessUtil';
import { CLASS_INFO, type MoveClass } from '../lib/evalUtil';
import { ClassIcon } from './ClassIcon';

type Props = {
  fen: string;
  orientation?: 'white' | 'black';
  /** Called with a legal UCI move. Return false to reject it. */
  onMove?: (uci: string) => boolean | void;
  interactive?: boolean;
  arrows?: Arrow[];
  lastMove?: string; // uci
  highlights?: string[]; // red (threats)
  hintSquares?: string[]; // green pulse (hints)
  markSquare?: { square: string; cls: MoveClass };
  id?: string;
  sound?: boolean;
  flash?: 'good' | 'bad' | null;
  /** Premoves: while it's not your turn, you may queue one move for `color`. */
  premove?: { color: 'w' | 'b'; queued: string | null; onQueue: (uci: string | null) => void };
};

type PieceItem = { id: number; type: string; sq: string; dying?: boolean; instant?: boolean; born?: boolean };

const FILES = 'abcdefgh';
let nextId = 1;

function parseFen(fen: string): Map<string, string> {
  const out = new Map<string, string>();
  const rows = fen.split(' ')[0].split('/');
  rows.forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) f += Number(ch);
      else {
        out.set(`${FILES[f]}${8 - r}`, (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase());
        f++;
      }
    }
  });
  return out;
}

const sqDist = (a: string, b: string) => Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) + Math.abs(Number(a[1]) - Number(b[1]));

/** Match the new position's pieces to the old ones so the right pieces glide. */
function diffPieces(prev: PieceItem[], fen: string, lastMove: string | undefined, dropped: string | null): PieceItem[] {
  const next = parseFen(fen);
  const alive = prev.filter((p) => !p.dying);
  const used = new Set<number>();
  const placed = new Map<string, PieceItem>();
  const take = (p: PieceItem, sq: string, type: string, instant = false) => {
    used.add(p.id);
    placed.set(sq, { id: p.id, type, sq, instant });
  };
  // 1. The move we know about (including castling's rook and promotions).
  if (lastMove) {
    const from = lastMove.slice(0, 2);
    const to = lastMove.slice(2, 4);
    const mover = alive.find((p) => p.sq === from);
    const nt = next.get(to);
    if (mover && nt && (nt === mover.type || (mover.type[1] === 'P' && lastMove.length > 4))) {
      take(mover, to, nt, dropped === from + to);
      if (mover.type[1] === 'K' && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2) {
        const rank = from[1];
        const [rf, rt] = to[0] === 'g' ? ['h', 'f'] : ['a', 'd'];
        const rook = alive.find((p) => p.sq === `${rf}${rank}`);
        if (rook && next.get(`${rt}${rank}`) === rook.type) take(rook, `${rt}${rank}`, rook.type);
      }
    }
  }
  // 2. Pieces that didn't move.
  for (const p of alive) {
    if (used.has(p.id) || placed.has(p.sq)) continue;
    if (next.get(p.sq) === p.type) take(p, p.sq, p.type);
  }
  // 3. Other squares: slide the nearest unmatched piece of the same type (takebacks, jumps), else fade in.
  for (const [sq, type] of next) {
    if (placed.has(sq)) continue;
    const cands = alive.filter((p) => !used.has(p.id) && p.type === type).sort((a, b) => sqDist(a.sq, sq) - sqDist(b.sq, sq));
    if (cands[0]) take(cands[0], sq, type);
    else placed.set(sq, { id: nextId++, type, sq, born: prev.length > 0 });
  }
  // 4. Everything left was captured: keep it briefly so it can fade out under the attacker.
  const dying = alive.filter((p) => !used.has(p.id)).map((p) => ({ ...p, dying: true, instant: !!dropped }));
  return [...placed.values(), ...dying];
}

export const Board = memo(function Board({
  fen,
  orientation = 'white',
  onMove,
  interactive = true,
  arrows = [],
  lastMove,
  highlights = [],
  hintSquares = [],
  markSquare,
  id = 'board',
  sound = true,
  flash = null,
  premove,
}: Props) {
  const settings = useSettings();
  const theme = themeById(settings.boardTheme);
  const anim = ANIM_MS[settings.animSpeed] ?? 280;
  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);
  // Premove mode: not our turn, but we can queue a move for our colour.
  const preMode = !!premove && settings.premoves && !interactive && chess.turn() !== premove.color && !chess.isGameOver();
  const canAct = interactive || preMode;
  const myColor = preMode ? premove!.color : chess.turn();
  const preChess = useMemo(() => {
    if (!preMode) return null;
    const parts = fen.split(' ');
    parts[1] = premove!.color;
    parts[3] = '-';
    try {
      return new Chess(parts.join(' '), { skipValidation: true });
    } catch {
      return null;
    }
  }, [preMode, fen, premove]);
  const moveSource = preMode ? preChess : chess;
  const [pieces, setPieces] = useState<PieceItem[]>(() => diffPieces([], fen, undefined, null));
  const [selected, setSelected] = useState<string | null>(null);
  const [overSq, setOverSq] = useState<string | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [shake, setShake] = useState(0);
  const [userArrows, setUserArrows] = useState<{ from: string; to: string }[]>([]);
  const [userMarks, setUserMarks] = useState<string[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragEl = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ from: string; id: number; x0: number; y0: number; moved: boolean; wasSelected: boolean } | null>(null);
  const rightFrom = useRef<string | null>(null);
  const dropped = useRef<string | null>(null);
  const prevFen = useRef(fen);
  const flipped = orientation === 'black';

  // New position: match pieces so they glide, and play the right sound.
  useLayoutEffect(() => {
    if (prevFen.current === fen) return;
    const before = prevFen.current;
    prevFen.current = fen;
    setPieces((prev) => diffPieces(prev, fen, lastMove, dropped.current));
    if (sound && lastMove) {
      try {
        const c = new Chess(before);
        const m = playUci(c, lastMove);
        if (m && c.fen().split(' ')[0] === fen.split(' ')[0]) moveSound(m);
      } catch {
        /* not a single move */
      }
    }
    dropped.current = null;
    setSelected(null);
    setUserArrows([]);
    setUserMarks([]);
  }, [fen, lastMove, sound]);

  // Remove captured pieces once their fade is done.
  useEffect(() => {
    if (!pieces.some((p) => p.dying || p.born || p.instant)) return;
    const t = setTimeout(
      () => setPieces((ps) => ps.filter((p) => !p.dying).map((p) => (p.born || p.instant ? { ...p, born: false, instant: false } : p))),
      anim + 120,
    );
    return () => clearTimeout(t);
  }, [pieces, anim]);

  const toXY = (sq: string) => {
    const f = sq.charCodeAt(0) - 97;
    const r = Number(sq[1]) - 1;
    return flipped ? { x: 7 - f, y: r } : { x: f, y: 7 - r };
  };
  const squareAt = (clientX: number, clientY: number) => {
    const rect = boardRef.current!.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * 8);
    const y = Math.floor(((clientY - rect.top) / rect.height) * 8);
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    const f = flipped ? 7 - x : x;
    const r = flipped ? y : 7 - y;
    return `${FILES[f]}${r + 1}`;
  };
  const ownAt = (sq: string | null) => {
    if (!sq) return false;
    const p = chess.get(sq as Square);
    return !!p && p.color === myColor;
  };

  function attempt(from: string, to: string, byDrop: boolean): boolean {
    if (preMode && preChess && premove) {
      if (from === to) return false;
      const m = preChess.moves({ verbose: true }).find((x) => x.from === from && x.to === to);
      if (m) {
        premove.onQueue(from + to + (m.promotion ? 'q' : ''));
        if (sound) play('tick');
      }
      setSelected(null);
      return false; // the piece goes home; the queued move is shown as highlighted squares
    }
    if (!interactive || !onMove || from === to) return false;
    const moves = chess.moves({ verbose: true }).filter((m) => m.from === from && m.to === to);
    if (!moves.length) {
      if (byDrop) {
        if (sound) play('illegal');
        setShake((s) => s + 1);
      }
      return false;
    }
    if (moves.some((m) => m.promotion)) {
      setPromo({ from, to });
      return true;
    }
    dropped.current = byDrop ? from + to : null;
    setSelected(null);
    const ok = onMove(from + to);
    if (ok === false) dropped.current = null;
    return ok !== false;
  }

  // ---------- pointer handling: drag, click-click, right-click arrows ----------
  function onPointerDown(e: React.PointerEvent) {
    const sq = squareAt(e.clientX, e.clientY);
    if (!sq) return;
    if (e.button === 2) {
      rightFrom.current = sq;
      if (premove?.queued) premove.onQueue(null);
      return;
    }
    if (e.button !== 0) return;
    setUserArrows([]);
    setUserMarks([]);
    if (!canAct) return;
    if (preMode && premove?.queued && !ownAt(sq) && !selected) {
      premove.onQueue(null);
      return;
    }
    if (ownAt(sq)) {
      const piece = pieces.find((p) => p.sq === sq && !p.dying);
      if (!piece) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { from: sq, id: piece.id, x0: e.clientX, y0: e.clientY, moved: false, wasSelected: selected === sq };
      setSelected(sq);
      return;
    }
    if (selected) attempt(selected, sq, false);
    setSelected(null);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 4) return;
    const rect = boardRef.current!.getBoundingClientRect();
    const size = rect.width / 8;
    if (!d.moved) {
      d.moved = true;
      setDragId(d.id);
    }
    const el = dragEl.current ?? (boardRef.current!.querySelector(`[data-piece-id="${d.id}"]`) as HTMLDivElement | null);
    dragEl.current = el;
    if (el) el.style.transform = `translate(${e.clientX - rect.left - size / 2}px, ${e.clientY - rect.top - size / 2}px) scale(1.12)`;
    const over = squareAt(e.clientX, e.clientY);
    setOverSq((o) => (o === over ? o : over));
  }

  function onPointerUp(e: React.PointerEvent) {
    if (e.button === 2) {
      const to = squareAt(e.clientX, e.clientY);
      const from = rightFrom.current;
      rightFrom.current = null;
      if (!from || !to) return;
      if (from === to) setUserMarks((m) => (m.includes(to) ? m.filter((x) => x !== to) : [...m, to]));
      else
        setUserArrows((a) =>
          a.some((x) => x.from === from && x.to === to) ? a.filter((x) => !(x.from === from && x.to === to)) : [...a, { from, to }],
        );
      return;
    }
    const d = drag.current;
    drag.current = null;
    const el = dragEl.current;
    dragEl.current = null;
    setOverSq(null);
    if (!d) return;
    if (d.moved) {
      const to = squareAt(e.clientX, e.clientY);
      const ok = to && to !== d.from ? attempt(d.from, to, true) : false;
      // On a legal drop the new position marks this piece "instant" (no glide — the hand put it there).
      // Otherwise it glides home.
      if (el && !ok) el.style.transform = `translate(${toXY(d.from).x * 100}%, ${toXY(d.from).y * 100}%)`;
      setDragId(null);
      if (!ok) setSelected(d.from);
    } else if (d.wasSelected) setSelected(null);
  }

  // ---------- squares ----------
  const legal = useMemo(
    () => (selected && canAct && moveSource ? moveSource.moves({ square: selected as Square, verbose: true }) : []),
    [selected, canAct, moveSource],
  );
  const checkSq = chess.inCheck() ? chess.findPiece({ type: 'k', color: chess.turn() })[0] : null;

  const squares = [];
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const f = flipped ? 7 - x : x;
      const r = flipped ? y : 7 - y;
      const sq = `${FILES[f]}${r + 1}`;
      const light = (f + r) % 2 === 1;
      const style: CSSProperties = { background: light ? theme.light : theme.dark };
      const lm = lastMove && (lastMove.slice(0, 2) === sq || lastMove.slice(2, 4) === sq);
      const target = legal.find((m) => m.to === sq);
      squares.push(
        <div key={sq} id={`${id}-square-${sq}`} data-square={sq} className="sq" style={style}>
          <span className={`sq-hl ${lm || selected === sq ? 'on' : ''}`} style={{ background: theme.highlight }} />
          {checkSq === sq && <span className="sq-check" />}
          {highlights.includes(sq) && <span className="sq-threat" />}
          {userMarks.includes(sq) && <span className="sq-user" />}
          {hintSquares.includes(sq) && <span className="sq-hint" />}
          {premove?.queued && (premove.queued.slice(0, 2) === sq || premove.queued.slice(2, 4) === sq) && <span className="sq-pre" />}
          {overSq === sq && dragId !== null && <span className="sq-over" />}
          {target && <span className={target.captured ? 'sq-ring' : 'sq-dot'} />}
          {x === 0 && (
            <span className="coord coord-rank" style={{ color: light ? theme.dark : theme.light }}>
              {r + 1}
            </span>
          )}
          {y === 7 && (
            <span className="coord coord-file" style={{ color: light ? theme.dark : theme.light }}>
              {FILES[f]}
            </span>
          )}
        </div>,
      );
    }

  const allArrows = [...arrows, ...userArrows.map((a) => ({ ...a, color: 'rgba(255, 170, 0, 0.85)' }))];

  return (
    <div className={`board-wrap ${flash ? 'flash-' + flash : ''} ${shake ? `shake-${shake % 2}` : ''}`}>
      <div
        ref={boardRef}
        id={`${id}-board`}
        className={`board ${canAct ? 'is-interactive' : ''} ${dragId !== null ? 'is-dragging' : ''}`}
        style={{ ['--anim' as string]: `${anim}ms` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="squares">{squares}</div>
        <div className="pieces" aria-hidden>
          {pieces.map((p) => {
            const { x, y } = toXY(p.sq);
            const render = (defaultPieces as Record<string, () => React.ReactNode>)[p.type];
            const cls = ['piece'];
            if (p.dying) cls.push(p.instant ? 'dying-now' : 'dying');
            else if (p.instant) cls.push('instant');
            if (p.born) cls.push('born');
            if (p.id === dragId) cls.push('dragging');
            if (canAct && !p.dying && ownAt(p.sq)) cls.push('grabbable');
            return (
              <div
                key={p.id}
                data-piece-id={p.id}
                data-piece={p.type}
                className={cls.join(' ')}
                style={p.id === dragId ? undefined : { transform: `translate(${x * 100}%, ${y * 100}%)` }}
              >
                {render ? render() : null}
              </div>
            );
          })}
        </div>
        {allArrows.length > 0 && <ArrowLayer arrows={allArrows} toXY={toXY} />}
        {markSquare && <SquareMark key={markSquare.square + markSquare.cls + fen} {...markSquare} toXY={toXY} />}
      </div>
      {promo && (
        <div className="promo" role="dialog" aria-label="Choose promotion piece">
          {(['q', 'r', 'b', 'n'] as const).map((p) => {
            const render = (defaultPieces as Record<string, () => React.ReactNode>)[chess.turn() + p.toUpperCase()];
            return (
              <button
                key={p}
                onClick={() => {
                  onMove?.(promo.from + promo.to + p);
                  setPromo(null);
                  setSelected(null);
                }}
                aria-label={{ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[p]}
              >
                {render?.()}
              </button>
            );
          })}
          <button className="ghost" onClick={() => setPromo(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
});

function ArrowLayer({ arrows, toXY }: { arrows: { from: string; to: string; color: string }[]; toXY: (s: string) => { x: number; y: number } }) {
  return (
    <svg className="arrows" viewBox="0 0 8 8" aria-hidden>
      {arrows.map((a, i) => {
        const p0 = toXY(a.from);
        const p1 = toXY(a.to);
        const x0 = p0.x + 0.5;
        const y0 = p0.y + 0.5;
        const x1 = p1.x + 0.5;
        const y1 = p1.y + 0.5;
        const pt = (px: number, py: number) => `${px.toFixed(3)},${py.toFixed(3)}`;
        const w = 0.08;
        const hw = 0.28;
        const adx = Math.abs(x1 - x0);
        const ady = Math.abs(y1 - y0);
        if ((adx === 1 && ady === 2) || (adx === 2 && ady === 1)) {
          // Knight move: two squares along the long side, then one square across, like the knight actually goes.
          const cx = ady === 2 ? x0 : x1;
          const cy = ady === 2 ? y1 : y0;
          const u1x = Math.sign(cx - x0);
          const u1y = Math.sign(cy - y0);
          const u2x = Math.sign(x1 - cx);
          const u2y = Math.sign(y1 - cy);
          const sx = x0 + u1x * 0.22;
          const sy = y0 + u1y * 0.22;
          const ex = x1 - u2x * 0.4;
          const ey = y1 - u2y * 0.4;
          const head = ['M' + pt(ex - u2y * hw, ey + u2x * hw), 'L' + pt(x1 - u2x * 0.06, y1 - u2y * 0.06), 'L' + pt(ex + u2y * hw, ey - u2x * hw), 'Z'].join(' ');
          return (
            <g key={i} className="arrow" fill={a.color} stroke={a.color}>
              <path d={`M${pt(sx, sy)} L${pt(cx, cy)} L${pt(ex, ey)}`} fill="none" strokeWidth={w * 2} strokeLinejoin="miter" strokeLinecap="butt" />
              <path d={head} stroke="none" />
            </g>
          );
        }
        const len = Math.hypot(x1 - x0, y1 - y0) || 1;
        const ux = (x1 - x0) / len;
        const uy = (y1 - y0) / len;
        const sx = x0 + ux * 0.22;
        const sy = y0 + uy * 0.22;
        const ex = x1 - ux * 0.4;
        const ey = y1 - uy * 0.4;
        const d = [
          'M' + pt(sx - uy * w, sy + ux * w),
          'L' + pt(ex - uy * w, ey + ux * w),
          'L' + pt(ex - uy * hw, ey + ux * hw),
          'L' + pt(x1 - ux * 0.06, y1 - uy * 0.06),
          'L' + pt(ex + uy * hw, ey - ux * hw),
          'L' + pt(ex + uy * w, ey - ux * w),
          'L' + pt(sx + uy * w, sy - ux * w),
          'Z',
        ].join(' ');
        return <path key={i} d={d} fill={a.color} className="arrow" />;
      })}
    </svg>
  );
}

function SquareMark({ square, cls, toXY }: { square: string; cls: MoveClass; toXY: (s: string) => { x: number; y: number } }) {
  const { x, y } = toXY(square);
  return (
    <div className="square-mark" style={{ left: `calc(${(x + 1) * 12.5}% - 1.15em)`, top: `calc(${y * 12.5}% - 0.55em)`, background: CLASS_INFO[cls].color }} aria-hidden>
      <ClassIcon cls={cls} />
    </div>
  );
}
