import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from '../components/Board';
import { EvalBar, MoveList, Verdict } from '../components/Bits';
import { getAnalysisEngine, getBotEngine, isCancel } from '../engine/browserEngine';
import { botMove, startFenPly } from '../engine/botPlayer';
import type { Analysis } from '../lib/engineTypes';
import { judgeMove, threatReport, type MoveReport } from '../lib/coach';
import { CLASS_INFO, flip, type MoveClass } from '../lib/evalUtil';
import { eloLabel } from '../lib/bot';
import { playUci, validateFen } from '../lib/chessUtil';
import { getSettings, saveGame, saveSettings } from '../lib/storage';
import { requestReview, takePlayRequest } from '../lib/nav';
import { summarize } from '../lib/review';
import { bookInfo, openingName } from '../data/openingBook';
import { REPERTOIRE } from '../data/repertoire';

const START = new Chess().fen();
const SCREENSHOT_FEN = 'r1bqkb1r/2pp1ppp/p1n2n2/1p2p3/4P3/1BN2N2/PPPP1PPP/R1BQK2R b KQkq - 1 6';

type Setup = { fen: string; elo: number; color: 'w' | 'b' | 'random'; coach: boolean; label: string };

function presetPositions() {
  const out: { label: string; fen: string; color: 'w' | 'b' }[] = [
    { label: 'Standard start', fen: START, color: 'w' },
    { label: 'Your Ruy Lopez (screenshot position)', fen: SCREENSHOT_FEN, color: 'w' },
  ];
  for (const ch of REPERTOIRE)
    for (const l of ch.lines) {
      const c = new Chess();
      for (const m of l.moves.split(' ')) c.move(m);
      out.push({ label: `${ch.side === 'w' ? 'White' : 'Black'} · ${l.name}`, fen: c.fen(), color: ch.side });
    }
  return out;
}

export function Play() {
  const settings = getSettings();
  const [req] = useState(() => takePlayRequest());
  const [setup, setSetup] = useState<Setup>(() => {
    return {
      fen: req?.fen ?? START,
      elo: req?.elo ?? settings.lastElo,
      color: req?.userColor ?? 'w',
      coach: req?.coach ?? true,
      label: req?.label ?? 'Standard start',
    };
  });
  const [game, setGame] = useState<GameConfig | null>(() =>
    req ? { id: Date.now(), startFen: req.fen, elo: req.elo ?? settings.lastElo, userColor: req.userColor ?? 'w', coach: req.coach ?? true, label: req.label ?? 'Custom position' } : null,
  );
  const [customFen, setCustomFen] = useState('');
  const [fenError, setFenError] = useState('');
  const presets = useMemo(presetPositions, []);

  if (game) return <GameView key={game.id} cfg={game} onExit={() => setGame(null)} onRematch={() => setGame({ ...game, id: Date.now() })} />;

  const start = () => {
    const userColor = setup.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : setup.color;
    saveSettings({ ...getSettings(), lastElo: setup.elo });
    setGame({ id: Date.now(), startFen: setup.fen, elo: setup.elo, userColor, coach: setup.coach, label: setup.label });
  };

  return (
    <div className="page">
      <h1>Play</h1>
      <p className="lede">Play the computer at any strength. With the coach on, every move gets graded and explained as you play.</p>
      <div className="setup">
        <section className="panel">
          <h2>Opponent strength</h2>
          <div className="elo-readout">
            <span className="elo-num">{setup.elo}</span>
            <span className="muted">{eloLabel(setup.elo)}</span>
          </div>
          <input
            type="range"
            min={100}
            max={3000}
            step={50}
            value={setup.elo}
            onChange={(e) => setSetup({ ...setup, elo: Number(e.target.value) })}
            aria-label="Opponent Elo"
          />
          <div className="chips">
            {[400, 800, 1000, 1200, 1400, 1600, 2000, 3000].map((e) => (
              <button key={e} className={`chip ${setup.elo === e ? 'on' : ''}`} onClick={() => setSetup({ ...setup, elo: e })}>
                {e}
              </button>
            ))}
          </div>
          <p className="muted small">
            Below 1320 the bot imitates human mistakes (it misses things and sometimes hangs pieces). From 1320 up it is Stockfish’s own strength limiter.
          </p>
        </section>
        <section className="panel">
          <h2>Mode</h2>
          <div className="seg">
            <button className={setup.coach ? 'on' : ''} onClick={() => setSetup({ ...setup, coach: true })}>
              Coach
            </button>
            <button className={!setup.coach ? 'on' : ''} onClick={() => setSetup({ ...setup, coach: false })}>
              Match
            </button>
          </div>
          <p className="muted small">
            {setup.coach
              ? 'Live grades and explanations, hints, a blunder check button, and a chance to take back mistakes.'
              : 'No help during the game. Review it afterwards.'}
          </p>
          <h2>Your colour</h2>
          <div className="seg">
            {(['w', 'b', 'random'] as const).map((c) => (
              <button key={c} className={setup.color === c ? 'on' : ''} onClick={() => setSetup({ ...setup, color: c })}>
                {c === 'w' ? 'White' : c === 'b' ? 'Black' : 'Random'}
              </button>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Starting position</h2>
          <select
            value={presets.find((p) => p.fen === setup.fen)?.label ?? 'custom'}
            onChange={(e) => {
              const p = presets.find((x) => x.label === e.target.value);
              if (p) setSetup({ ...setup, fen: p.fen, color: p.color, label: p.label });
            }}
            aria-label="Starting position"
          >
            {presets.map((p) => (
              <option key={p.label}>{p.label}</option>
            ))}
            {!presets.some((p) => p.fen === setup.fen) && <option value="custom">{setup.label}</option>}
          </select>
          <p className="muted small">Repertoire positions let you practise the middlegame plans from the Openings section.</p>
          <label className="small" htmlFor="fen">
            Or paste a FEN
          </label>
          <div className="row">
            <input id="fen" value={customFen} onChange={(e) => setCustomFen(e.target.value)} placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" />
            <button
              onClick={() => {
                const bad = validateFen(customFen.trim());
                if (bad) return setFenError(bad);
                setFenError('');
                setSetup({ ...setup, fen: customFen.trim(), label: 'Custom position' });
              }}
            >
              Use
            </button>
          </div>
          {fenError && <p className="error small">{fenError}</p>}
          <div className="mini-board">
            <Board fen={setup.fen} interactive={false} orientation={setup.color === 'b' ? 'black' : 'white'} id="setup-preview" />
          </div>
        </section>
      </div>
      <button className="primary big" onClick={start}>
        Start game
      </button>
    </div>
  );
}

type GameConfig = { id: number; startFen: string; elo: number; userColor: 'w' | 'b'; coach: boolean; label: string };

function GameView({ cfg, onExit, onRematch }: { cfg: GameConfig; onExit: () => void; onRematch: () => void }) {
  const settings = getSettings();
  const [ucis, setUcis] = useState<string[]>([]);
  const [reports, setReports] = useState<(MoveReport | undefined)[]>([]);
  const [viewPly, setViewPly] = useState<number | null>(null); // null = live
  const [thinking, setThinking] = useState(false);
  const [judging, setJudging] = useState(false);
  const [paused, setPaused] = useState<MoveReport | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [threats, setThreats] = useState<{ lines: string[]; squares: string[] } | null>(null);
  const [resigned, setResigned] = useState(false);
  const [showEval, setShowEval] = useState(settings.showEval && cfg.coach);
  const [oppNote, setOppNote] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const analyses = useRef(new Map<string, Promise<Analysis>>());
  const gen = useRef(0);
  const [curAnalysis, setCurAnalysis] = useState<Analysis | null>(null);

  const fens = useMemo(() => {
    const c = new Chess(cfg.startFen);
    const out = [c.fen()];
    for (const u of ucis) {
      playUci(c, u);
      out.push(c.fen());
    }
    return out;
  }, [ucis, cfg.startFen]);
  const sans = useMemo(() => {
    const c = new Chess(cfg.startFen);
    return ucis.map((u) => playUci(c, u)!.san);
  }, [ucis, cfg.startFen]);

  const liveFen = fens[fens.length - 1];
  const live = new Chess(liveFen);
  const shownPly = viewPly ?? ucis.length;
  const shownFen = fens[shownPly];
  const userTurn = live.turn() === cfg.userColor;
  const over = live.isGameOver() || resigned;
  const startPly = startFenPly(cfg.startFen);

  function analyse(fen: string) {
    let p = analyses.current.get(fen);
    if (!p) {
      p = getAnalysisEngine().analyse(fen, { depth: settings.depth, movetime: 2500, multipv: 3 });
      p.catch(() => analyses.current.delete(fen));
      analyses.current.set(fen, p);
    }
    return p;
  }

  // Engine cleanup when leaving the game.
  useEffect(() => {
    const eng = getAnalysisEngine();
    eng.newGame();
    return () => {
      gen.current++;
      eng.cancel();
    };
  }, []);

  // Keep an analysis of the live position (for eval bar, hints, grading).
  useEffect(() => {
    if (over && !live.isGameOver()) return;
    if (live.isGameOver()) return;
    const g = gen.current;
    if (cfg.coach || userTurn) {
      analyse(liveFen)
        .then((a) => g === gen.current && setCurAnalysis(a))
        .catch((e) => !isCancel(e) && console.error(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveFen]);

  // Computer's turn.
  useEffect(() => {
    if (over || userTurn || paused || judging) return;
    const g = gen.current;
    setThinking(true);
    const t0 = Date.now();
    botMove(liveFen, cfg.elo)
      .then(async (mv) => {
        const wait = Math.max(0, 450 - (Date.now() - t0));
        await new Promise((r) => setTimeout(r, wait));
        if (g !== gen.current) return;
        const fenBefore = liveFen;
        setUcis((u) => [...u, mv]);
        setThinking(false);
        if (cfg.coach) {
          // Grade the opponent's move too, so the coach can say "there's something to punish".
          const a = await analyse(fenBefore);
          const after = new Chess(fenBefore);
          playUci(after, mv);
          if (after.isGameOver()) return;
          const b = await analyse(after.fen());
          if (g !== gen.current) return;
          const r = judgeMove(fenBefore, mv, a, b, { ply: fens.length - 1 });
          setReports((rs) => {
            const copy = [...rs];
            copy[fens.length - 1] = r;
            return copy;
          });
          if (['mistake', 'blunder', 'miss'].includes(r.cls))
            setOppNote(
              r.tags.includes('hung-piece') || r.tags.includes('removed-defender') || r.tags.includes('ignored-threat')
                ? 'Your opponent just made a mistake — something is loose. Run your checks, captures and threats.'
                : 'Your opponent just made a mistake. Look for a tactic before you play a normal move.',
            );
        }
      })
      .catch((e) => {
        if (!isCancel(e)) console.error(e);
        if (g === gen.current) setThinking(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveFen, userTurn, over, paused, judging]);

  // Save the game when it ends.
  useEffect(() => {
    if (!over || savedId) return;
    const res = resultFor(live, cfg.userColor, resigned);
    const id = `g${cfg.id}`;
    const mine = reports.filter((r): r is MoveReport => !!r && r.color === cfg.userColor);
    saveGame({
      id,
      date: new Date().toISOString(),
      source: cfg.coach ? 'coach' : 'match',
      userColor: cfg.userColor,
      result: res,
      opponent: `Bot ${cfg.elo}`,
      startFen: cfg.startFen,
      ucis,
      opening: cfg.startFen === START ? openingName(sans) : cfg.label,
      summary: cfg.coach && mine.length ? summarize(mine, cfg.userColor) : undefined,
    });
    setSavedId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  async function onUserMove(uci: string) {
    if (!userTurn || over || thinking || judging || paused || viewPly !== null) return false;
    const fenBefore = liveFen;
    const c = new Chess(fenBefore);
    if (!playUci(c, uci)) return false;
    const g = gen.current;
    setHintLevel(0);
    setThreats(null);
    setOppNote(null);
    const ply = ucis.length;
    setUcis((u) => [...u, uci]);
    if (!cfg.coach) return true;
    setJudging(true);
    try {
      const a = await analyse(fenBefore);
      const b = c.isGameOver() ? null : await analyse(c.fen());
      if (g !== gen.current) return true;
      const sansNow = [...sans, c.history().at(-1)!];
      const isBook = cfg.startFen === START && !!bookInfo(sansNow) && sansNow.length <= 16;
      const r = judgeMove(fenBefore, uci, a, b, { ply, isBook });
      setReports((rs) => {
        const copy = [...rs];
        copy[ply] = r;
        return copy;
      });
      if ((['mistake', 'blunder', 'miss'] as MoveClass[]).includes(r.cls) && !c.isGameOver()) setPaused(r);
    } catch (e) {
      if (!isCancel(e)) console.error(e);
    } finally {
      if (g === gen.current) setJudging(false);
    }
    return true;
  }

  function takeBack() {
    gen.current++;
    getAnalysisEngine().cancel();
    getBotEngine().cancel();
    // Go back to the last position where it was the user's move (before their last move).
    let n = ucis.length;
    const startTurn = new Chess(cfg.startFen).turn();
    const turnAt = (k: number) => ((k % 2 === 0) === (startTurn === 'w') ? 'w' : 'b');
    if (n === 0) return;
    n--;
    while (n > 0 && turnAt(n) !== cfg.userColor) n--;
    if (turnAt(n) !== cfg.userColor) return;
    setUcis((u) => u.slice(0, n));
    setReports((r) => r.slice(0, n));
    setPaused(null);
    setThinking(false);
    setJudging(false);
    setResigned(false);
    setHintLevel(0);
    setThreats(null);
    setOppNote(null);
    setViewPly(null);
  }

  const lastReport = (() => {
    const i = shownPly - 1;
    if (i < 0) return undefined;
    return reports[i];
  })();
  const myLastReport = (() => {
    for (let i = ucis.length - 1; i >= 0; i--) if (reports[i]?.color === cfg.userColor) return reports[i];
    return undefined;
  })();

  const evalScore = curAnalysis && viewPly === null && curAnalysis.lines[0]
    ? live.turn() === 'w'
      ? curAnalysis.lines[0].score
      : flip(curAnalysis.lines[0].score)
    : lastReport?.evalAfterWhite ?? null;

  const arrows = (() => {
    if (viewPly !== null) return lastReport?.arrows ?? [];
    if (paused) return paused.arrows;
    if (hintLevel >= 2 && curAnalysis?.lines[0]) {
      const m = curAnalysis.lines[0].move;
      return [{ from: m.slice(0, 2), to: m.slice(2, 4), color: 'rgba(80,180,80,.85)' }];
    }
    return [];
  })();
  const highlights = viewPly === null
    ? [...(threats?.squares ?? []), ...(hintLevel === 1 && curAnalysis?.lines[0] ? [curAnalysis.lines[0].move.slice(0, 2)] : [])]
    : [];

  const status = over
    ? resultText(live, cfg.userColor, resigned)
    : paused
      ? 'Coach paused the game'
      : judging
        ? 'Coach is looking at your move…'
        : thinking
          ? `Bot ${cfg.elo} is thinking…`
          : userTurn
            ? 'Your move'
            : '…';

  const shownReport = viewPly !== null ? lastReport : myLastReport;

  return (
    <div className="game">
      <div className="game-board">
        <div className="player-tag">
          <span className={`dot ${cfg.userColor === 'w' ? 'black' : 'white'}`} /> Bot {cfg.elo} <span className="muted">· {eloLabel(cfg.elo)}</span>
        </div>
        <div className="board-row">
          {showEval && <EvalBar score={evalScore} orientation={cfg.userColor === 'w' ? 'white' : 'black'} />}
          <Board
            fen={shownFen}
            orientation={cfg.userColor === 'w' ? 'white' : 'black'}
            onMove={(u) => {
              void onUserMove(u);
              return true;
            }}
            interactive={!over && userTurn && !thinking && !judging && !paused && viewPly === null}
            lastMove={shownPly > 0 ? ucis[shownPly - 1] : undefined}
            arrows={arrows}
            highlights={highlights}
            markSquare={lastReport && cfg.coach ? { square: lastReport.uci.slice(2, 4), color: classColor(lastReport.cls), symbol: classSymbol(lastReport.cls) } : undefined}
            id="game-board"
          />
        </div>
        <div className="player-tag">
          <span className={`dot ${cfg.userColor === 'w' ? 'white' : 'black'}`} /> You
        </div>
      </div>

      <aside className="game-side">
        <div className="status-line">
          <strong>{status}</strong>
          <span className="muted small">{cfg.coach ? 'Coach mode' : 'Match'} · {cfg.label}</span>
        </div>

        {cfg.coach && (
          <div className="coach-box">
            {paused ? (
              <>
                <Verdict r={paused} />
                <div className="row">
                  <button className="primary" onClick={takeBack}>
                    Take back and try again
                  </button>
                  <button onClick={() => setPaused(null)}>Play on</button>
                </div>
              </>
            ) : shownReport ? (
              <Verdict r={shownReport} perspective={shownReport.color === cfg.userColor ? 'you' : 'neutral'} />
            ) : (
              <p className="muted">Make a move. The coach will grade it and tell you why.</p>
            )}
            {oppNote && !paused && viewPly === null && <p className="opp-note">{oppNote}</p>}
            {threats && viewPly === null && (
              <div className="threats">
                <h3>Blunder check</h3>
                <ul>
                  {threats.lines.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
            {!over && !paused && (
              <div className="row wrap">
                <button disabled={!userTurn || viewPly !== null} onClick={() => setThreats(threatReport(liveFen))}>
                  Blunder check
                </button>
                <button disabled={!userTurn || !curAnalysis || viewPly !== null} onClick={() => setHintLevel((h) => Math.min(2, h + 1))}>
                  {hintLevel === 0 ? 'Hint' : hintLevel === 1 ? 'Show the move' : 'Hint shown'}
                </button>
                <button disabled={ucis.length === 0 || thinking || judging} onClick={takeBack}>
                  Take back
                </button>
                <button onClick={() => setShowEval((s) => !s)}>{showEval ? 'Hide eval' : 'Show eval'}</button>
              </div>
            )}
            {hintLevel === 1 && <p className="muted small">The highlighted piece is the one to move.</p>}
          </div>
        )}

        <MoveList sans={sans} reports={cfg.coach ? reports : undefined} current={shownPly - 1} onPick={(i) => setViewPly(i + 1 === ucis.length ? null : i + 1)} startPly={startPly} />
        <div className="row">
          <button onClick={() => setViewPly(0)} aria-label="First move">⏮</button>
          <button onClick={() => setViewPly(Math.max(0, shownPly - 1))} aria-label="Previous move">◀</button>
          <button onClick={() => setViewPly(shownPly + 1 >= ucis.length ? null : shownPly + 1)} aria-label="Next move">▶</button>
          <button onClick={() => setViewPly(null)} aria-label="Live position">⏭</button>
        </div>

        <div className="row wrap">
          {!over && (
            <button
              className="danger"
              onClick={() => {
                gen.current++;
                setResigned(true);
                setThinking(false);
              }}
            >
              Resign
            </button>
          )}
          {over && savedId && (
            <button className="primary" onClick={() => requestReview({ gameId: savedId })}>
              Review this game
            </button>
          )}
          {over && <button onClick={onRematch}>Rematch</button>}
          <button onClick={onExit}>New setup</button>
        </div>
      </aside>
    </div>
  );
}

function resultFor(c: Chess, me: 'w' | 'b', resigned: boolean): 'win' | 'loss' | 'draw' | 'unfinished' {
  if (resigned) return 'loss';
  if (c.isCheckmate()) return c.turn() === me ? 'loss' : 'win';
  if (c.isDraw() || c.isStalemate()) return 'draw';
  return 'unfinished';
}
function resultText(c: Chess, me: 'w' | 'b', resigned: boolean) {
  if (resigned) return 'You resigned.';
  if (c.isCheckmate()) return c.turn() === me ? 'Checkmate — you lost.' : 'Checkmate — you won!';
  if (c.isStalemate()) return 'Stalemate — draw.';
  if (c.isThreefoldRepetition()) return 'Draw by repetition.';
  if (c.isInsufficientMaterial()) return 'Draw — insufficient material.';
  if (c.isDraw()) return 'Draw.';
  return '';
}

const classColor = (c: MoveClass) => CLASS_INFO[c].color;
const classSymbol = (c: MoveClass) => CLASS_INFO[c].symbol;
