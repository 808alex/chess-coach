import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';
import type { Arrow } from '../lib/coach';
import { getSettings } from '../lib/storage';
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
  highlights?: string[]; // squares to mark in red (threats)
  hintSquares?: string[]; // squares to mark in green (hints)
  markSquare?: { square: string; cls: MoveClass };
  id?: string;
  sound?: boolean;
  flash?: 'good' | 'bad' | null; // brief border flash (puzzle solved / wrong)
};

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
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [shake, setShake] = useState(0);
  const theme = themeById(getSettings().boardTheme);
  const prevFen = useRef(fen);
  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  // Play the right sound whenever the position changes by one move.
  useEffect(() => {
    const before = prevFen.current;
    prevFen.current = fen;
    if (!sound || before === fen || !lastMove) return;
    try {
      const c = new Chess(before);
      const m = playUci(c, lastMove);
      if (m && c.fen() === fen) moveSound(m);
    } catch {
      /* jump, not a single move — no sound */
    }
    setSelected(null);
  }, [fen, lastMove, sound]);

  const legalFrom = (sq: string) => (interactive ? chess.moves({ square: sq as Square, verbose: true }) : []);

  function attempt(from: string, to: string): boolean {
    if (!interactive || !onMove || from === to) return false;
    const moves = chess.moves({ verbose: true }).filter((m) => m.from === from && m.to === to);
    if (!moves.length) {
      const p = chess.get(from as Square);
      if (p && p.color === chess.turn()) {
        if (sound) play('illegal');
        setShake((s) => s + 1);
      }
      return false;
    }
    if (moves.some((m) => m.promotion)) {
      setPromo({ from, to });
      return true;
    }
    setSelected(null);
    const ok = onMove(from + to);
    return ok !== false;
  }

  const styles: Record<string, CSSProperties> = {};
  if (lastMove) {
    styles[lastMove.slice(0, 2)] = { background: theme.highlight };
    styles[lastMove.slice(2, 4)] = { background: theme.highlight };
  }
  for (const h of highlights) styles[h] = { ...styles[h], boxShadow: 'inset 0 0 0 4px rgba(235, 75, 60, 0.9)' };
  for (const h of hintSquares)
    styles[h] = { ...styles[h], boxShadow: 'inset 0 0 0 4px rgba(129, 182, 76, 0.95)', animation: 'hintPulse 1.2s ease-in-out infinite' };
  if (chess.inCheck()) {
    const k = chess.findPiece({ type: 'k', color: chess.turn() })[0];
    if (k)
      styles[k] = {
        ...styles[k],
        background: 'radial-gradient(circle, rgba(255,40,30,.95) 0%, rgba(230,40,30,.55) 45%, transparent 75%)',
      };
  }
  if (selected) {
    styles[selected] = { ...styles[selected], background: theme.highlight };
    for (const m of legalFrom(selected)) {
      styles[m.to] = {
        ...styles[m.to],
        background: m.captured
          ? 'radial-gradient(circle, transparent 60%, rgba(0,0,0,.2) 62%)'
          : 'radial-gradient(circle, rgba(0,0,0,.2) 22%, transparent 24%)',
        cursor: 'pointer',
      };
    }
  }

  const options = {
    id,
    position: fen,
    boardOrientation: orientation,
    allowDragging: interactive,
    darkSquareStyle: { backgroundColor: theme.dark },
    lightSquareStyle: { backgroundColor: theme.light },
    darkSquareNotationStyle: { color: theme.light, fontWeight: 700, fontSize: 12 },
    lightSquareNotationStyle: { color: theme.dark, fontWeight: 700, fontSize: 12 },
    squareStyles: styles,
    arrows: arrows.map((a) => ({ startSquare: a.from, endSquare: a.to, color: a.color })),
    allowDrawingArrows: true,
    clearArrowsOnPositionChange: true,
    animationDurationInMs: 230,
    squareStyle: { transition: 'background 0.16s ease, box-shadow 0.16s ease' },
    onPieceDrag: ({ square }: { square: string | null }) => {
      if (!interactive || !square) return;
      const p = chess.get(square as Square);
      if (p && p.color === chess.turn()) setSelected(square);
    },
    dropSquareStyle: { boxShadow: 'inset 0 0 0 4px rgba(255,255,255,.75)' },
    canDragPiece: ({ piece }: { piece: { pieceType: string } }) => interactive && piece.pieceType[0] === chess.turn(),
    onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) =>
      targetSquare ? attempt(sourceSquare, targetSquare) : false,
    onSquareClick: ({ square, piece }: { square: string; piece: { pieceType: string } | null }) => {
      if (!interactive) return;
      if (selected && selected !== square) {
        const isOwn = piece && piece.pieceType[0] === chess.turn();
        if (!isOwn) {
          attempt(selected, square);
          setSelected(null);
          return;
        }
      }
      if (piece && piece.pieceType[0] === chess.turn()) setSelected(square === selected ? null : square);
      else setSelected(null);
    },
  };

  return (
    <div className={`board-wrap ${flash ? 'flash-' + flash : ''} ${shake ? `shake-${shake % 2}` : ''}`}>
      <Chessboard options={options as never} />
      {markSquare && <SquareMark key={markSquare.square + markSquare.cls + fen} {...markSquare} orientation={orientation} />}
      {promo && (
        <div className="promo" role="dialog" aria-label="Choose promotion piece">
          {(['q', 'r', 'b', 'n'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                onMove?.(promo.from + promo.to + p);
                setPromo(null);
                setSelected(null);
              }}
              aria-label={{ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[p]}
            >
              {chess.turn() === 'w' ? { q: '♕', r: '♖', b: '♗', n: '♘' }[p] : { q: '♛', r: '♜', b: '♝', n: '♞' }[p]}
            </button>
          ))}
          <button className="ghost" onClick={() => setPromo(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
});

function SquareMark({ square, cls, orientation }: { square: string; cls: MoveClass; orientation: 'white' | 'black' }) {
  const f = square.charCodeAt(0) - 97;
  const r = Number(square[1]) - 1;
  const x = orientation === 'white' ? f : 7 - f;
  const y = orientation === 'white' ? 7 - r : r;
  return (
    <div className="square-mark" style={{ left: `calc(${(x + 1) * 12.5}% - 1.15em)`, top: `calc(${y * 12.5}% - 0.55em)`, background: CLASS_INFO[cls].color }} aria-hidden>
      <ClassIcon cls={cls} />
    </div>
  );
}
