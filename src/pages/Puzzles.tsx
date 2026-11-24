import { useEffect, useMemo, useState } from 'react';
import { TaskBoard } from '../components/TaskBoard';
import { PACK, THEME_LABELS, pickPuzzles, themeCounts, type Puzzle } from '../data/puzzles';
import { getPuzzleStats, recordPuzzle, getGames } from '../lib/storage';
import { fetchLichessPuzzle } from '../lib/remote';
import { TAG_INFO, type Tag } from '../lib/coach';

type Source = 'pack' | 'lichess';
const DIFFS = ['easiest', 'easier', 'normal', 'harder', 'hardest'];

export function weakThemes(): string[] {
  const tags: Record<string, number> = {};
  for (const g of getGames().slice(0, 20)) for (const [t, n] of Object.entries(g.summary?.tags ?? {})) tags[t] = (tags[t] ?? 0) + (n ?? 0);
  const themes = Object.entries(tags)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => TAG_INFO[t as Tag]?.puzzleTheme)
    .filter((x): x is string => !!x);
  return [...new Set(themes)];
}

export function Puzzles({ arg }: { arg?: string }) {
  const [stats, setStats] = useState(getPuzzleStats());
  const [source, setSource] = useState<Source>('pack');
  const [theme, setTheme] = useState(arg && THEME_LABELS[arg] ? arg : 'mix');
  const [diff, setDiff] = useState('normal');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<'ok' | 'fail' | null>(null);
  const counts = useMemo(themeCounts, []);
  const weak = useMemo(weakThemes, []);

  async function next(t = theme) {
    setError('');
    setResult(null);
    if (source === 'pack') {
      const s = getPuzzleStats();
      const theme2 = t === 'weak' ? weak[Math.floor(Math.random() * Math.max(1, weak.length))] ?? 'mix' : t;
      setPuzzle(pickPuzzles(theme2, s.rating, 1, s.seen)[0]);
      return;
    }
    setLoading(true);
    try {
      const angle = t === 'weak' ? weak[0] : t;
      setPuzzle(await fetchLichessPuzzle(angle, diff));
    } catch (e) {
      setError(
        e instanceof TypeError
          ? 'Couldn’t reach Lichess (no internet, or the request was blocked). Switch to the offline pack.'
          : (e as Error).message,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const themes = ['mix', ...Object.keys(THEME_LABELS).filter((t) => t !== 'mix' && (source === 'lichess' || (counts[t] ?? 0) >= 3))];
  const today = stats.daily[new Date().toISOString().slice(0, 10)] ?? 0;

  return (
    <div className="page">
      <h1>Puzzles</h1>
      <div className="stat-strip">
        <div>
          <span className="stat-num">{stats.rating}</span>
          <span className="muted small">puzzle rating</span>
        </div>
        <div>
          <span className="stat-num">{stats.streak}</span>
          <span className="muted small">streak (best {stats.bestStreak})</span>
        </div>
        <div>
          <span className="stat-num">{today}</span>
          <span className="muted small">solved today</span>
        </div>
      </div>
      <div className="puzzle-controls">
        <div className="seg">
          <button className={source === 'pack' ? 'on' : ''} onClick={() => setSource('pack')}>
            Offline pack ({PACK.length})
          </button>
          <button className={source === 'lichess' ? 'on' : ''} onClick={() => setSource('lichess')}>
            Lichess (online)
          </button>
        </div>
        <select value={theme} onChange={(e) => { setTheme(e.target.value); void next(e.target.value); }} aria-label="Puzzle theme">
          {weak.length > 0 && <option value="weak">Your weak spots</option>}
          {themes.map((t) => (
            <option key={t} value={t}>
              {THEME_LABELS[t] ?? t}
              {source === 'pack' && t !== 'mix' ? ` (${counts[t] ?? 0})` : ''}
            </option>
          ))}
        </select>
        {source === 'lichess' && (
          <select value={diff} onChange={(e) => setDiff(e.target.value)} aria-label="Difficulty">
            {DIFFS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Fetching a puzzle from Lichess…</p>}
      {puzzle && !loading && (
        <section className="puzzle">
          <p className="muted small">
            {puzzle.source === 'lichess' ? 'Lichess puzzle' : 'Pack puzzle'} · rating {puzzle.rating} ·{' '}
            {result ? puzzle.themes.map((t) => THEME_LABELS[t] ?? t).join(', ') : 'themes hidden until you finish'}
          </p>
          <TaskBoard
            key={puzzle.id}
            id={'pz-' + puzzle.id}
            task={{ fen: puzzle.fen, goal: puzzle.themes.some((t) => t.startsWith('mate')) ? 'mate' : 'line', solution: puzzle.solution, lastMove: puzzle.lastMove }}
            prompt="Find the best move."
            onFirstMistake={() => {
              setStats(recordPuzzle(puzzle.id, puzzle.rating, puzzle.themes, false));
              setResult('fail');
            }}
            onDone={(r) => {
              if (r.first) {
                setStats(recordPuzzle(puzzle.id, puzzle.rating, puzzle.themes, true));
                setResult('ok');
              } else if (!result) {
                setStats(recordPuzzle(puzzle.id, puzzle.rating, puzzle.themes, false));
                setResult('fail');
              }
            }}
          />
          <button className="primary" onClick={() => next()}>
            Next puzzle
          </button>
        </section>
      )}
      <p className="muted small credits">
        Offline puzzles were generated for this app with Stockfish from engine games. Online puzzles come from the free Lichess puzzle database.
      </p>
    </div>
  );
}
