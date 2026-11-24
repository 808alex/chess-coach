import { useMemo, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';
import type { Arrow } from '../lib/coach';

type Props = {
  fen: string;
  orientation?: 'white' | 'black';
  /** Called with a legal UCI move. Return false to reject it. */
  onMove?: (uci: string) => boolean | void;
  interactive?: boolean;
  arrows?: Arrow[];
  lastMove?: string; // uci
  highlights?: string[]; // squares to mark (e.g. threats)
  markSquare?: { square: string; color: string; symbol?: string };
  id?: string;
};

const LIGHT = '#e8d5b0';
const DARK = '#a67b55';

export function Board({ fen, orientation = 'white', onMove, interactive = true, arrows = [], lastMove, highlights = [], markSquare, id = 'board' }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const legalFrom = (sq: string) =>
    interactive ? chess.moves({ square: sq as Square, verbose: true }) : [];

  function attempt(from: string, to: string): boolean {
    if (!interactive || !onMove) return false;
    const moves = chess.moves({ verbose: true }).filter((m) => m.from === from && m.to === to);
    if (!moves.length) return false;
    if (moves.some((m) => m.promotion)) {
      setPromo({ from, to });
      return true;
    }
    const ok = onMove(from + to);
    setSelected(null);
    return ok !== false;
  }

  const styles: Record<string, CSSProperties> = {};
  if (lastMove) {
    styles[lastMove.slice(0, 2)] = { background: 'rgba(214, 170, 70, 0.42)' };
    styles[lastMove.slice(2, 4)] = { background: 'rgba(214, 170, 70, 0.55)' };
  }
  for (const h of highlights) styles[h] = { ...styles[h], boxShadow: 'inset 0 0 0 4px rgba(230, 70, 60, 0.85)' };
  if (chess.inCheck()) {
    const k = chess.findPiece({ type: 'k', color: chess.turn() })[0];
    if (k) styles[k] = { ...styles[k], background: 'radial-gradient(circle, rgba(230,60,50,.85) 0%, rgba(230,60,50,.35) 55%, transparent 75%)' };
  }
  if (selected) {
    styles[selected] = { ...styles[selected], background: 'rgba(90, 150, 220, 0.5)' };
    for (const m of legalFrom(selected)) {
      styles[m.to] = {
        ...styles[m.to],
        background: m.captured
          ? 'radial-gradient(circle, transparent 58%, rgba(30,40,60,.35) 60%)'
          : 'radial-gradient(circle, rgba(30,40,60,.35) 18%, transparent 20%)',
      };
    }
  }

  const options = {
    id,
    position: fen,
    boardOrientation: orientation,
    allowDragging: interactive,
    darkSquareStyle: { backgroundColor: DARK },
    lightSquareStyle: { backgroundColor: LIGHT },
    squareStyles: styles,
    arrows: arrows.map((a) => ({ startSquare: a.from, endSquare: a.to, color: a.color })),
    allowDrawingArrows: true,
    clearArrowsOnPositionChange: true,
    animationDurationInMs: 180,
    canDragPiece: ({ piece }: { piece: { pieceType: string } }) => interactive && piece.pieceType[0] === chess.turn(),
    onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) =>
      targetSquare ? attempt(sourceSquare, targetSquare) : false,
    onSquareClick: ({ square, piece }: { square: string; piece: { pieceType: string } | null }) => {
      if (!interactive) return;
      if (selected && selected !== square) {
        if (attempt(selected, square)) return;
      }
      if (piece && piece.pieceType[0] === chess.turn()) setSelected(square === selected ? null : square);
      else setSelected(null);
    },
  };

  return (
    <div className="board-wrap">
      <Chessboard options={options as never} />
      {markSquare && <SquareMark {...markSquare} orientation={orientation} />}
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
            >
              {{ q: '♛', r: '♜', b: '♝', n: '♞' }[p]}
            </button>
          ))}
          <button className="ghost" onClick={() => setPromo(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function SquareMark({ square, color, symbol, orientation }: { square: string; color: string; symbol?: string; orientation: 'white' | 'black' }) {
  const f = square.charCodeAt(0) - 97;
  const r = Number(square[1]) - 1;
  const x = orientation === 'white' ? f : 7 - f;
  const y = orientation === 'white' ? 7 - r : r;
  return (
    <div
      className="square-mark"
      style={{ left: `calc(${(x + 1) * 12.5}% - 1.1em)`, top: `calc(${y * 12.5}% - 0.4em)`, background: color }}
      aria-hidden
    >
      {symbol}
    </div>
  );
}
