import { Chess } from 'chess.js';
import type { Puzzle } from '../data/puzzles';
import { playUci } from './chessUtil';

/** Fetch a puzzle from Lichess (runs in the browser; needs internet). */
export async function fetchLichessPuzzle(angle: string | undefined, difficulty: string): Promise<Puzzle> {
  const params = new URLSearchParams({ difficulty });
  if (angle && angle !== 'mix') params.set('angle', angle);
  const r = await fetch(`https://lichess.org/api/puzzle/next?${params}`, { headers: { Accept: 'application/json' } });
  if (r.status === 429) throw new Error('Lichess is rate-limiting requests. Wait a minute, or use the offline pack.');
  if (!r.ok) throw new Error(`Lichess answered ${r.status}. Try the offline pack.`);
  const j = await r.json();
  const c = new Chess();
  c.loadPgn(j.game.pgn);
  const solution: string[] = j.puzzle.solution;
  // The PGN normally ends just before the solution. Be defensive about off-by-one.
  let tries = 0;
  while (!playUci(new Chess(c.fen()), solution[0]) && tries++ < 2) c.undo();
  const hist = c.history({ verbose: true });
  const last = hist[hist.length - 1];
  return {
    id: 'li' + j.puzzle.id,
    fen: c.fen(),
    lastMove: last ? last.from + last.to + (last.promotion ?? '') : undefined,
    solution,
    themes: j.puzzle.themes,
    rating: j.puzzle.rating,
    source: 'lichess',
  };
}

export type RemoteGame = {
  url: string;
  pgn: string;
  timeClass: string;
  endTime: number;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
};

export async function chesscomArchives(user: string): Promise<string[]> {
  const r = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}/games/archives`);
  if (r.status === 404) throw new Error(`No chess.com player called "${user}".`);
  if (!r.ok) throw new Error(`chess.com answered ${r.status}. Try again in a moment, or paste a PGN instead.`);
  const j = await r.json();
  return (j.archives as string[]).reverse();
}

export async function chesscomMonth(url: string): Promise<RemoteGame[]> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`chess.com answered ${r.status}. Try again in a moment, or paste a PGN instead.`);
  const j = await r.json();
  return (j.games as Record<string, unknown>[])
    .filter((g) => g.rules === 'chess' && typeof g.pgn === 'string')
    .map((g) => ({
      url: g.url as string,
      pgn: g.pgn as string,
      timeClass: g.time_class as string,
      endTime: g.end_time as number,
      white: g.white as RemoteGame['white'],
      black: g.black as RemoteGame['black'],
    }))
    .reverse();
}

/** Parse a PGN into a start FEN + UCI moves. */
export function parsePgn(pgn: string): { startFen: string; ucis: string[]; headers: Record<string, string> } {
  const c = new Chess();
  c.loadPgn(pgn);
  const headers = c.getHeaders() as Record<string, string>;
  const moves = c.history({ verbose: true });
  const startFen = moves.length ? moves[0].before : c.fen();
  return { startFen, ucis: moves.map((m) => m.from + m.to + (m.promotion ?? '')), headers };
}
