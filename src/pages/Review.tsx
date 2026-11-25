import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from '../components/Board';
import { ClassGlyph, EvalBar, EvalGraph, MoveList, Progress } from '../components/Bits';
import { CoachBubble } from '../components/GameBits';
import { TaskBoard } from '../components/TaskBoard';
import { getAnalysisEngine, isCancel } from '../engine/browserEngine';
import { startFenPly } from '../engine/botPlayer';
import type { MoveReport } from '../lib/coach';
import { CLASS_INFO, type MoveClass } from '../lib/evalUtil';
import { reviewGame, summarize, type GameSummary } from '../lib/review';
import { getGames, getSettings, saveGame, saveSettings, type GameRecord } from '../lib/storage';
import { chesscomArchives, chesscomMonth, parsePgn, type RemoteGame } from '../lib/remote';
import { openingName } from '../data/openingBook';
import { go, requestPlay } from '../lib/nav';
import { playUci } from '../lib/chessUtil';

type Loaded = { record: GameRecord; whiteName: string; blackName: string };

export function Review({ arg }: { arg?: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(() => {
    if (!arg) return null;
    const g = getGames().find((x) => x.id === arg);
    return g ? fromRecord(g) : null;
  });
  useEffect(() => {
    if (!arg) setLoaded(null);
    else {
      const g = getGames().find((x) => x.id === arg);
      if (g) setLoaded(fromRecord(g));
    }
  }, [arg]);
  if (loaded) return <Analysis key={loaded.record.id} loaded={loaded} />;
  return <Picker onPick={(l) => { saveGame(l.record); go('review', l.record.id); }} />;
}

function fromRecord(g: GameRecord): Loaded {
  const me = 'You';
  return {
    record: g,
    whiteName: g.userColor === 'w' ? me : g.opponent,
    blackName: g.userColor === 'b' ? me : g.opponent,
  };
}

function Picker({ onPick }: { onPick: (l: Loaded) => void }) {
  const settings = getSettings();
  const [user, setUser] = useState(settings.chesscomUser);
  const [archives, setArchives] = useState<string[]>([]);
  const [month, setMonth] = useState('');
  const [games, setGames] = useState<RemoteGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pgn, setPgn] = useState('');
  const [pgnColor, setPgnColor] = useState<'w' | 'b'>('w');
  const local = getGames();

  async function loadUser() {
    setError('');
    setLoading(true);
    try {
      saveSettings({ ...getSettings(), chesscomUser: user.trim() });
      const a = await chesscomArchives(user.trim());
      setArchives(a);
      if (a[0]) await loadMonth(a[0]);
      else setError('No games found for that account.');
    } catch (e) {
      setError(e instanceof TypeError ? 'Couldn’t reach chess.com. Check your connection, or paste a PGN below.' : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function loadMonth(url: string) {
    setMonth(url);
    setLoading(true);
    try {
      setGames(await chesscomMonth(url));
    } catch (e) {
      setError(e instanceof TypeError ? 'Couldn’t reach chess.com.' : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function pickRemote(g: RemoteGame) {
    try {
      const { startFen, ucis } = parsePgn(g.pgn);
      const meWhite = g.white.username.toLowerCase() === user.trim().toLowerCase();
      const mine = meWhite ? g.white : g.black;
      const opp = meWhite ? g.black : g.white;
      const result = mine.result === 'win' ? 'win' : ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(mine.result) ? 'draw' : 'loss';
      const sans = (() => {
        const c = new Chess(startFen);
        return ucis.map((u) => playUci(c, u)!.san);
      })();
      onPick({
        record: {
          id: 'cc' + g.url.split('/').pop(),
          date: new Date(g.endTime * 1000).toISOString(),
          source: 'chesscom',
          userColor: meWhite ? 'w' : 'b',
          result,
          opponent: `${opp.username} (${opp.rating})`,
          startFen,
          ucis,
          opening: openingName(sans),
        },
        whiteName: meWhite ? 'You' : `${opp.username} (${opp.rating})`,
        blackName: meWhite ? `${opp.username} (${opp.rating})` : 'You',
      });
    } catch {
      setError('Couldn’t read that game’s moves.');
    }
  }

  function pickPgn() {
    try {
      const { startFen, ucis, headers } = parsePgn(pgn);
      if (!ucis.length) throw new Error('no moves');
      const c = new Chess(startFen);
      const sans = ucis.map((u) => playUci(c, u)!.san);
      const oppRaw = pgnColor === 'w' ? headers.Black : headers.White;
      const opp = oppRaw && oppRaw !== '?' ? oppRaw : 'Opponent';
      const res = headers.Result;
      const result = res === '1/2-1/2' ? 'draw' : res === '1-0' ? (pgnColor === 'w' ? 'win' : 'loss') : res === '0-1' ? (pgnColor === 'b' ? 'win' : 'loss') : 'unfinished';
      onPick({
        record: {
          id: 'pgn' + Date.now(),
          date: new Date().toISOString(),
          source: 'pgn',
          userColor: pgnColor,
          result,
          opponent: opp || 'Opponent',
          startFen,
          ucis,
          opening: openingName(sans),
        },
        whiteName: '',
        blackName: '',
      });
    } catch {
      setError('That doesn’t look like a valid PGN. Copy it from chess.com via Share → PGN.');
    }
  }

  return (
    <div className="page">
      <h1>Review</h1>
      <p className="lede">Run the engine over a whole game. Every move gets graded and explained, and your mistakes become puzzles you can retry.</p>
      <section className="panel">
        <h2>Your chess.com games</h2>
        <div className="row">
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="chess.com username" aria-label="chess.com username" />
          <button className="primary" onClick={loadUser} disabled={!user.trim() || loading}>
            Load games
          </button>
        </div>
        {archives.length > 0 && (
          <select value={month} onChange={(e) => loadMonth(e.target.value)} aria-label="Month">
            {archives.map((a) => (
              <option key={a} value={a}>
                {a.split('/').slice(-2).join('-')}
              </option>
            ))}
          </select>
        )}
        {loading && <p className="muted">Loading…</p>}
        {error && <p className="error">{error}</p>}
        {games.length > 0 && (
          <div className="game-table">
            {games.slice(0, 40).map((g) => {
              const meWhite = g.white.username.toLowerCase() === user.trim().toLowerCase();
              const mine = meWhite ? g.white : g.black;
              const opp = meWhite ? g.black : g.white;
              const res = mine.result === 'win' ? 'W' : ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(mine.result) ? 'D' : 'L';
              return (
                <button key={g.url} className="game-row" onClick={() => pickRemote(g)}>
                  <span className={`res res-${res}`}>{res}</span>
                  <span>{meWhite ? '♔' : '♚'} vs {opp.username} ({opp.rating})</span>
                  <span className="muted small">{g.timeClass}</span>
                  <span className="muted small">{new Date(g.endTime * 1000).toLocaleDateString()}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
      <section className="panel">
        <h2>Paste a PGN</h2>
        <textarea value={pgn} onChange={(e) => setPgn(e.target.value)} rows={5} placeholder='[Event "Live Chess"] 1. e4 e5 2. Nf3 …' aria-label="PGN" />
        <div className="row">
          <div className="seg">
            <button className={pgnColor === 'w' ? 'on' : ''} onClick={() => setPgnColor('w')}>
              I was White
            </button>
            <button className={pgnColor === 'b' ? 'on' : ''} onClick={() => setPgnColor('b')}>
              I was Black
            </button>
          </div>
          <button className="primary" onClick={pickPgn} disabled={!pgn.trim()}>
            Review
          </button>
        </div>
      </section>
      {local.length > 0 && (
        <section className="panel">
          <h2>Games in this app</h2>
          <div className="game-table">
            {local.slice(0, 30).map((g) => (
              <button key={g.id} className="game-row" onClick={() => go('review', g.id)}>
                <span className={`res res-${g.result === 'win' ? 'W' : g.result === 'draw' ? 'D' : g.result === 'loss' ? 'L' : 'U'}`}>
                  {g.result === 'win' ? 'W' : g.result === 'draw' ? 'D' : g.result === 'loss' ? 'L' : '–'}
                </span>
                <span>
                  {g.userColor === 'w' ? '♔' : '♚'} vs {g.opponent}
                </span>
                <span className="muted small">{g.opening}</span>
                <span className="muted small">{g.summary ? `${g.summary.accuracy}% · ${g.summary.counts.blunder ?? 0} blunders` : 'not reviewed'}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Analysis({ loaded }: { loaded: Loaded }) {
  const g = loaded.record;
  const settings = getSettings();
  const [reports, setReports] = useState<MoveReport[] | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: g.ucis.length + 1 });
  const [cur, setCur] = useState(-1); // index into moves; -1 = start
  const [retry, setRetry] = useState<MoveReport | null>(null);
  const [onlyMine, setOnlyMine] = useState(true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const eng = getAnalysisEngine();
    eng.newGame();
    reviewGame(g.startFen, g.ucis, eng, { depth: Math.min(settings.depth, 14), multipv: 3 }, (d, t) => alive.current && setProgress({ done: d, total: t }))
      .then((r) => {
        if (!alive.current) return;
        setReports(r);
        saveGame({ ...g, summary: summarize(r, g.userColor) });
      })
      .catch((e) => !isCancel(e) && console.error(e));
    return () => {
      alive.current = false;
      eng.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.id]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') setCur((c) => Math.min(g.ucis.length - 1, c + 1));
      if (e.key === 'ArrowLeft') setCur((c) => Math.max(-1, c - 1));
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [g.ucis.length]);

  const fens = useMemo(() => {
    const c = new Chess(g.startFen);
    const out = [c.fen()];
    for (const u of g.ucis) {
      playUci(c, u);
      out.push(c.fen());
    }
    return out;
  }, [g]);
  const sans = useMemo(() => {
    const c = new Chess(g.startFen);
    return g.ucis.map((u) => playUci(c, u)!.san);
  }, [g]);

  if (!reports) {
    return (
      <div className="page">
        <button className="back" onClick={() => go('review')}>
          ← Review
        </button>
        <h1>Analysing…</h1>
        <p className="lede">
          vs {g.opponent} · {g.opening}
        </p>
        <Progress value={progress.done} max={progress.total} label="Analysis progress" />
        <p className="muted small">
          Position {progress.done} of {progress.total}. The engine runs in your browser, so this takes about a second per move.
        </p>
      </div>
    );
  }

  const mineSum = summarize(reports, g.userColor);
  const oppSum = summarize(reports, g.userColor === 'w' ? 'b' : 'w');
  const r = cur >= 0 ? reports[cur] : undefined;
  const key = reports.filter((x) => (onlyMine ? x.color === g.userColor : true) && ['blunder', 'mistake', 'miss'].includes(x.cls));
  const orientation = g.userColor === 'w' ? 'white' : 'black';

  return (
    <div className="page review">
      <button className="back" onClick={() => go('review')}>
        ← Review
      </button>
      <h1>
        {g.result === 'win' ? 'Win' : g.result === 'loss' ? 'Loss' : g.result === 'draw' ? 'Draw' : 'Game'} vs {g.opponent}
      </h1>
      <p className="lede">{g.opening}</p>
      <div className="sum-row">
        <SummaryCard title="You" s={mineSum} />
        <SummaryCard title="Opponent" s={oppSum} />
      </div>
      <div className="game">
        <div className="game-board">
          <div className="board-row">
            {settings.showEval && <EvalBar score={r?.evalAfterWhite ?? { cp: 0 }} orientation={orientation} />}
            <Board
              fen={fens[cur + 1]}
              interactive={false}
              orientation={orientation}
              lastMove={r?.uci}
              arrows={r && r.cls !== 'best' && r.cls !== 'book' ? r.arrows : []}
              markSquare={r ? { square: r.uci.slice(2, 4), color: CLASS_INFO[r.cls].color, symbol: CLASS_INFO[r.cls].symbol } : undefined}
              id="review-board"
            />
          </div>
          <EvalGraph reports={reports} current={cur} onPick={setCur} />
        </div>
        <aside className="game-side">
          {r ? (
            <>
              <CoachBubble report={r.color === g.userColor ? r : { ...r, headline: r.headline.replace(/\byour\b/gi, 'their') }} />
              {r.color === g.userColor && ['blunder', 'mistake', 'miss', 'inaccuracy'].includes(r.cls) && (
                <div className="row wrap">
                  <button className="primary" onClick={() => setRetry(r)}>
                    Retry this moment
                  </button>
                  <button onClick={() => requestPlay({ fen: r.fenBefore, elo: 1400, userColor: g.userColor, coach: true, label: 'From your game' })}>
                    Play on from here
                  </button>
                </div>
              )}
            </>
          ) : (
            <CoachBubble text="Step through with ← →, click a move, or click the graph. The coloured dots are the big moments." />
          )}
          <div className="key-moments">
            <div className="row between">
              <h3>Key moments</h3>
              <label className="small">
                <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> only mine
              </label>
            </div>
            {key.length ? (
              key.map((k) => (
                <button key={k.ply} className="moment" onClick={() => setCur(k.ply)}>
                  <ClassGlyph cls={k.cls} size="sm" />
                  <span>
                    {Math.floor((startFenPly(g.startFen) + k.ply) / 2) + 1}
                    {k.color === 'w' ? '.' : '...'} {k.san}
                  </span>
                  <span className="muted small">{k.headline}</span>
                </button>
              ))
            ) : (
              <p className="muted small">No mistakes or blunders. Clean game.</p>
            )}
          </div>
          <MoveList sans={sans} reports={reports} current={cur} onPick={setCur} startPly={startFenPly(g.startFen)} />
          <div className="row">
            <button onClick={() => setCur(-1)} aria-label="Start">⏮</button>
            <button onClick={() => setCur(Math.max(-1, cur - 1))} aria-label="Previous">◀</button>
            <button onClick={() => setCur(Math.min(g.ucis.length - 1, cur + 1))} aria-label="Next">▶</button>
            <button onClick={() => setCur(g.ucis.length - 1)} aria-label="End">⏭</button>
          </div>
        </aside>
      </div>
      {retry && (
        <div className="modal" role="dialog" aria-label="Retry this moment">
          <div className="modal-body">
            <div className="row between">
              <h2>Find a better move than {retry.san}</h2>
              <button className="ghost" onClick={() => setRetry(null)}>
                Close
              </button>
            </div>
            <TaskBoard
              id="retry"
              task={{ fen: retry.fenBefore, goal: 'best', solution: [retry.bestUci], tolerance: 4, lastMove: retry.ply > 0 ? g.ucis[retry.ply - 1] : undefined }}
              prompt="You went wrong here in the game. What should you have played?"
              explain={`The engine's choice was ${retry.bestSan}. Line: ${retry.bestLine}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const SHOW: MoveClass[] = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];
function SummaryCard({ title, s }: { title: string; s: GameSummary }) {
  return (
    <div className="sum-card">
      <div className="row between">
        <h3>{title}</h3>
        <span className="acc">{s.accuracy}%</span>
      </div>
      <div className="class-counts">
        {SHOW.filter((c) => s.counts[c]).map((c) => (
          <span key={c} className="cc">
            <ClassGlyph cls={c} size="sm" /> {s.counts[c]} <span className="muted small">{CLASS_INFO[c].label.toLowerCase()}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
