import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from '../components/Board';
import { EvalBar, MoveList } from '../components/Bits';
import { BotAvatar, CoachBubble, PlayerCard, YouAvatar } from '../components/GameBits';
import { Icon } from '../components/Icon';
import { getAnalysisEngine, getBotEngine, isCancel } from '../engine/browserEngine';
import { botMove, startFenPly, thinkTimeMs } from '../engine/botPlayer';
import type { Analysis } from '../lib/engineTypes';
import { judgeMove, threatReport, type MoveReport } from '../lib/coach';
import { flip, type MoveClass } from '../lib/evalUtil';
import { eloLabel } from '../lib/bot';
import { capturedSince, playUci, validateFen } from '../lib/chessUtil';
import { getSettings, saveGame, saveSettings } from '../lib/storage';
import { go, requestReview, takePlayRequest } from '../lib/nav';
import { summarize } from '../lib/review';
import { bookInfo, openingName } from '../data/openingBook';
import { REPERTOIRE } from '../data/repertoire';
import { BOTS, TIME_CONTROLS, botFor } from '../lib/themes';
import { play } from '../lib/sound';
import { confetti, confettiFrom } from '../lib/confetti';

const START = new Chess().fen();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SCREENSHOT_FEN = 'r1bqkb1r/2pp1ppp/p1n2n2/1p2p3/4P3/1BN2N2/PPPP1PPP/R1BQK2R b KQkq - 1 6';

type Setup = { fen: string; elo: number; color: 'w' | 'b' | 'random'; coach: boolean; label: string; tc: string };

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
  const [setup, setSetup] = useState<Setup>(() => ({
    fen: req?.fen ?? START,
    elo: req?.elo ?? settings.lastElo,
    color: req?.userColor ?? 'w',
    coach: req?.coach ?? true,
    label: req?.label ?? 'Standard start',
    tc: settings.timeControl,
  }));
  const [game, setGame] = useState<GameConfig | null>(() =>
    req
      ? { id: Date.now(), startFen: req.fen, elo: req.elo ?? settings.lastElo, userColor: req.userColor ?? 'w', coach: req.coach ?? true, label: req.label ?? 'Custom position', tc: 'none' }
      : null,
  );
  const [customFen, setCustomFen] = useState('');
  const [fenError, setFenError] = useState('');
  const presets = useMemo(presetPositions, []);

  if (game) return <GameView key={game.id} cfg={game} onExit={() => setGame(null)} onRematch={() => setGame({ ...game, id: Date.now() })} />;

  const start = () => {
    const userColor = setup.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : setup.color;
    saveSettings({ ...getSettings(), lastElo: setup.elo, timeControl: setup.tc });
    setGame({ id: Date.now(), startFen: setup.fen, elo: setup.elo, userColor, coach: setup.coach, label: setup.label, tc: setup.tc });
  };
  const bot = botFor(setup.elo);

  return (
    <div className="page play-setup">
      <header className="page-head">
        <h1>Play</h1>
        <p className="lede">Pick an opponent. With the coach on, every move gets graded and explained while you play.</p>
      </header>
      <div className="setup-grid">
        <section className="setup-bots">
          <h2>Opponent</h2>
          <div className="bot-grid">
            {BOTS.map((b, i) => (
              <button
                key={b.id}
                className={`bot-card ${setup.elo === b.elo ? 'on' : ''}`}
                style={{ ['--bot' as string]: b.color, animationDelay: `${i * 35}ms` }}
                onClick={() => setSetup({ ...setup, elo: b.elo })}
              >
                <BotAvatar color={b.color} size={48} label={b.name} />
                <span className="bot-name">{b.name}</span>
                <span className="bot-elo">{b.elo}</span>
              </button>
            ))}
          </div>
          <div className="bot-detail" key={bot.name + setup.elo}>
            <BotAvatar color={bot.color} size={64} label={bot.name} />
            <div>
              <div className="bot-detail-name">
                {bot.name} <span className="muted">· {eloLabel(setup.elo)}</span>
              </div>
              <p className="muted">{bot.blurb || 'Your own strength setting.'}</p>
            </div>
            <div className="elo-big">{setup.elo}</div>
          </div>
          <label className="slider-label" htmlFor="elo">
            Fine-tune strength: 100 to 3000
          </label>
          <input id="elo" type="range" min={100} max={3000} step={50} value={setup.elo} onChange={(e) => setSetup({ ...setup, elo: Number(e.target.value) })} />
          <p className="muted small">Below 1320 the bot plays like a human and makes human mistakes. From 1320 up it uses Stockfish’s own strength limiter.</p>
        </section>

        <section className="setup-side">
          <div className="mode-cards">
            <button className={`mode-card ${setup.coach ? 'on' : ''}`} onClick={() => setSetup({ ...setup, coach: true })}>
              <span className="mode-title">Coach</span>
              <span className="muted small">Grades, explanations, hints and takebacks as you play.</span>
            </button>
            <button className={`mode-card ${!setup.coach ? 'on' : ''}`} onClick={() => setSetup({ ...setup, coach: false })}>
              <span className="mode-title">Match</span>
              <span className="muted small">No help. Review the game afterwards.</span>
            </button>
          </div>

          <h3>Time</h3>
          <div className="pill-row">
            {TIME_CONTROLS.map((t) => (
              <button key={t.id} className={`pill ${setup.tc === t.id ? 'on' : ''}`} onClick={() => setSetup({ ...setup, tc: t.id })}>
                {t.label}
              </button>
            ))}
          </div>

          <h3>Play as</h3>
          <div className="pill-row">
            {(['w', 'random', 'b'] as const).map((c) => (
              <button key={c} className={`pill color-pill ${setup.color === c ? 'on' : ''}`} onClick={() => setSetup({ ...setup, color: c })}>
                <span className="color-ico">{c === 'w' ? '♔' : c === 'b' ? '♚' : '⚄'}</span>
                {c === 'w' ? 'White' : c === 'b' ? 'Black' : 'Random'}
              </button>
            ))}
          </div>

          <h3>Starting position</h3>
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
          <details className="fen-details">
            <summary>Paste a FEN</summary>
            <div className="row">
              <input value={customFen} onChange={(e) => setCustomFen(e.target.value)} placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" aria-label="FEN" />
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
          </details>
          <button className="primary huge setup-go" onClick={start}>
            Play {bot.name}
          </button>
          {setup.fen !== START && (
            <div className="setup-preview">
              <Board fen={setup.fen} interactive={false} orientation={setup.color === 'b' ? 'black' : 'white'} id="setup-preview" sound={false} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type GameConfig = { id: number; startFen: string; elo: number; userColor: 'w' | 'b'; coach: boolean; label: string; tc: string };

function GameView({ cfg, onExit, onRematch }: { cfg: GameConfig; onExit: () => void; onRematch: () => void }) {
  const settings = getSettings();
  const tc = TIME_CONTROLS.find((t) => t.id === cfg.tc) ?? TIME_CONTROLS[0];
  const timed = tc.base > 0;
  const bot = botFor(cfg.elo);
  const [ucis, setUcis] = useState<string[]>([]);
  const [reports, setReports] = useState<(MoveReport | undefined)[]>([]);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);
  const [judging, setJudging] = useState(false);
  const [paused, setPaused] = useState<MoveReport | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [threats, setThreats] = useState<{ lines: string[]; squares: string[] } | null>(null);
  const [resigned, setResigned] = useState(false);
  const [flagged, setFlagged] = useState<'w' | 'b' | null>(null);
  const [showEval, setShowEval] = useState(settings.showEval && cfg.coach);
  const [oppNote, setOppNote] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [clock, setClock] = useState({ w: tc.base * 1000, b: tc.base * 1000, since: Date.now() });
  // Refs so async bot code always sees the latest state (prevents double moves and stale timing).
  const judgingRef = useRef(false);
  const pausedRef = useRef(false);
  const liveFenRef = useRef('');
  const verdictRef = useRef<{ at: number; cls: MoveClass | null }>({ at: 0, cls: null });
  const botToken = useRef(0);
  const analyses = useRef(new Map<string, Promise<Analysis>>());
  const gen = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);
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

  const sansRef = useRef<string[]>([]);
  sansRef.current = sans;
  const ucisRef = useRef<string[]>([]);
  ucisRef.current = ucis;
  const clockRef = useRef(clock);
  clockRef.current = clock;
  const liveFen = fens[fens.length - 1];
  const live = useMemo(() => new Chess(liveFen), [liveFen]);
  const shownPly = viewPly ?? ucis.length;
  const shownFen = fens[shownPly];
  const userTurn = live.turn() === cfg.userColor;
  const over = live.isGameOver() || resigned || !!flagged;
  const startPly = startFenPly(cfg.startFen);
  const clockRunning = timed && !over && !paused && ucis.length > 0;

  judgingRef.current = judging;
  pausedRef.current = !!paused;
  liveFenRef.current = liveFen;

  function analyse(fen: string) {
    let p = analyses.current.get(fen);
    if (!p) {
      p = getAnalysisEngine().analyse(fen, { depth: settings.depth, movetime: 2500, multipv: 3 });
      p.catch(() => analyses.current.delete(fen));
      analyses.current.set(fen, p);
    }
    return p;
  }

  useEffect(() => {
    const eng = getAnalysisEngine();
    eng.newGame();
    play('start');
    window.scrollTo({ top: 0 });
    return () => {
      gen.current++;
      eng.cancel();
      getBotEngine().cancel();
    };
  }, []);

  // Clock: charge the time used to the side that just moved, add increment.
  useEffect(() => {
    if (!timed || ucis.length === 0) return;
    const mover = live.turn() === 'w' ? 'b' : 'w';
    setClock((c) => ({ ...c, [mover]: c[mover] - (Date.now() - c.since) + tc.inc * 1000, since: Date.now() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ucis.length]);
  // Pausing (coach) freezes the clock: charge time up to the pause, restart on resume.
  const prevRunning = useRef(false);
  useEffect(() => {
    const was = prevRunning.current;
    prevRunning.current = clockRunning;
    if (!timed || was === clockRunning) return;
    setClock((c) => {
      if (!was) return { ...c, since: Date.now() };
      const side = live.turn();
      return { ...c, [side]: c[side] - (Date.now() - c.since), since: Date.now() };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clockRunning]);
  const onFlag = useCallback((side: 'w' | 'b') => {
    gen.current++;
    setClock((c) => ({ ...c, [side]: 0 }));
    setFlagged(side);
    setThinking(false);
  }, []);

  // Keep an analysis of the live position.
  useEffect(() => {
    if (over) return;
    const g = gen.current;
    if (cfg.coach || userTurn) {
      analyse(liveFen)
        .then((a) => g === gen.current && setCurAnalysis(a))
        .catch((e) => !isCancel(e) && console.error(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveFen]);

  // Computer's turn. The bot starts thinking straight away (in parallel with the coach),
  // but only plays once the coach has spoken and you've had a moment to read it.
  useEffect(() => {
    if (over || userTurn || paused) return;
    const g = gen.current;
    const token = ++botToken.current;
    const fenAtStart = liveFen;
    const ply = fens.length - 1;
    const t0 = Date.now();
    setThinking(true);
    const stale = () => g !== gen.current || token !== botToken.current || pausedRef.current || liveFenRef.current !== fenAtStart;
    botMove(liveFen, cfg.elo)
      .then(async (mv) => {
        while (judgingRef.current && !stale()) await sleep(40);
        if (stale()) return;
        const v = verdictRef.current;
        const read = !cfg.coach ? 0 : v.cls === 'brilliant' ? 1800 : v.cls === 'great' ? 1300 : v.cls === 'book' ? 650 : 950;
        const clockLeft = timed ? clockRef.current[live.turn()] : undefined;
        const humanThink = thinkTimeMs(fenAtStart, mv, ply, ucisRef.current[ply - 1], clockLeft);
        await sleep(Math.max(read - (Date.now() - v.at), humanThink - (Date.now() - t0), 0));
        if (stale()) return;
        const fenBefore = fenAtStart;
        const after = new Chess(fenBefore);
        const m = playUci(after, mv);
        setUcis((u) => [...u, mv]);
        setThinking(false);
        if (!cfg.coach || !m) return;
        const a = await analyse(fenBefore);
        if (after.isGameOver()) return;
        const b = await analyse(after.fen());
        if (g !== gen.current) return;
        const sansNow = [...sansRef.current.slice(0, ply), m.san];
        const isBook = cfg.startFen === START && !!bookInfo(sansNow) && sansNow.length <= 30;
        const r = judgeMove(fenBefore, mv, a, b, { ply, isBook });
        setReports((rs) => {
          const copy = [...rs];
          copy[ply] = r;
          return copy;
        });
        if (['mistake', 'blunder', 'miss'].includes(r.cls)) {
          setTimeout(() => play('notify'), 250);
          setOppNote(
            r.tags.includes('hung-piece') || r.tags.includes('removed-defender') || r.tags.includes('ignored-threat')
              ? `${bot.name} just slipped — something is loose. Check captures first.`
              : `${bot.name} just made a mistake. Look for a tactic before you play a normal move.`,
          );
        }
      })
      .catch((e) => {
        if (!isCancel(e)) console.error(e);
        if (g === gen.current && token === botToken.current) setThinking(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveFen, userTurn, over, paused]);

  // Game over: save, sound, confetti, modal.
  useEffect(() => {
    if (!over || savedId) return;
    const res = resultFor(live, cfg.userColor, resigned, flagged);
    const id = `g${cfg.id}`;
    const mine = reports.filter((r): r is MoveReport => !!r && r.color === cfg.userColor);
    saveGame({
      id,
      date: new Date().toISOString(),
      source: cfg.coach ? 'coach' : 'match',
      userColor: cfg.userColor,
      result: res,
      opponent: `${bot.name} (${cfg.elo})`,
      startFen: cfg.startFen,
      ucis,
      opening: cfg.startFen === START ? openingName(sans) : cfg.label,
      summary: cfg.coach && mine.length ? summarize(mine, cfg.userColor) : undefined,
    });
    setSavedId(id);
    setTimeout(() => {
      play(res === 'win' ? 'win' : res === 'loss' ? 'lose' : 'draw');
      if (res === 'win') confetti({ count: 200 });
      setModal(true);
    }, 500);
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
    verdictRef.current = { at: Date.now(), cls: null };
    if (!cfg.coach) return true;
    judgingRef.current = true;
    setJudging(true);
    try {
      const a = await analyse(fenBefore);
      const b = c.isGameOver() ? null : await analyse(c.fen());
      if (g !== gen.current) return true;
      const sansNow = [...sans, c.history().at(-1)!];
      const isBook = cfg.startFen === START && !!bookInfo(sansNow) && sansNow.length <= 30;
      const r = judgeMove(fenBefore, uci, a, b, { ply, isBook });
      setReports((rs) => {
        const copy = [...rs];
        copy[ply] = r;
        return copy;
      });
      verdictRef.current = { at: Date.now(), cls: r.cls };
      // Stagger the feedback: the piece lands, then the grade pops, then any sound/celebration.
      if (r.cls === 'brilliant') {
        setTimeout(() => play('brilliant'), 180);
        setTimeout(() => confettiFrom(boardRef.current, 45), 380);
      } else if (r.cls === 'great') setTimeout(() => play('correct'), 180);
      else if (r.cls === 'blunder') setTimeout(() => play('blunder'), 180);
      if ((['mistake', 'blunder', 'miss'] as MoveClass[]).includes(r.cls) && !c.isGameOver()) {
        pausedRef.current = true;
        setPaused(r);
      }
    } catch (e) {
      if (!isCancel(e)) console.error(e);
    } finally {
      if (g === gen.current) {
        judgingRef.current = false;
        setJudging(false);
      }
    }
    return true;
  }

  function takeBack() {
    gen.current++;
    getAnalysisEngine().cancel();
    getBotEngine().cancel();
    const startTurn = new Chess(cfg.startFen).turn();
    const turnAt = (k: number) => ((k % 2 === 0) === (startTurn === 'w') ? 'w' : 'b');
    let n = ucis.length;
    if (n === 0) return;
    n--;
    while (n > 0 && turnAt(n) !== cfg.userColor) n--;
    if (turnAt(n) !== cfg.userColor) return;
    setUcis((u) => u.slice(0, n));
    setReports((r) => r.slice(0, n));
    setPaused(null);
    pausedRef.current = false;
    judgingRef.current = false;
    setThinking(false);
    setJudging(false);
    setHintLevel(0);
    setThreats(null);
    setOppNote(null);
    setViewPly(null);
    setClock((c) => ({ ...c, since: Date.now() }));
  }

  const lastReport = shownPly > 0 ? reports[shownPly - 1] : undefined;
  const myLastReport = (() => {
    for (let i = ucis.length - 1; i >= 0; i--) if (reports[i]?.color === cfg.userColor) return reports[i];
    return undefined;
  })();

  const evalScore =
    curAnalysis && viewPly === null && curAnalysis.lines[0]
      ? live.turn() === 'w'
        ? curAnalysis.lines[0].score
        : flip(curAnalysis.lines[0].score)
      : lastReport?.evalAfterWhite ?? null;

  const arrows = useMemo(() => {
    if (viewPly !== null) return lastReport?.arrows ?? [];
    if (paused) return paused.arrows;
    if (hintLevel >= 2 && curAnalysis?.lines[0]) {
      const m = curAnalysis.lines[0].move;
      return [{ from: m.slice(0, 2), to: m.slice(2, 4), color: 'rgba(129,182,76,.9)' }];
    }
    return [];
  }, [viewPly, lastReport, paused, hintLevel, curAnalysis]);
  const threatSquares = useMemo(() => (viewPly === null ? threats?.squares ?? [] : []), [viewPly, threats]);
  const hintSquares = useMemo(
    () => (viewPly === null && hintLevel === 1 && curAnalysis?.lines[0] ? [curAnalysis.lines[0].move.slice(0, 2)] : []),
    [viewPly, hintLevel, curAnalysis],
  );
  const markSquare = useMemo(() => (lastReport && cfg.coach ? { square: lastReport.uci.slice(2, 4), cls: lastReport.cls } : undefined), [lastReport, cfg.coach]);
  const moveRef = useRef(onUserMove);
  moveRef.current = onUserMove;
  const handleMove = useCallback((u: string) => {
    void moveRef.current(u);
    return true;
  }, []);

  const cap = capturedSince(cfg.startFen, shownFen);
  const userIsWhite = cfg.userColor === 'w';
  const oppColor = userIsWhite ? 'b' : 'w';
  const res = over ? resultFor(live, cfg.userColor, resigned, flagged) : null;
  const shownReport = viewPly !== null ? lastReport : myLastReport;
  const mineSummary = useMemo(() => {
    const mine = reports.filter((r): r is MoveReport => !!r && r.color === cfg.userColor);
    return mine.length ? summarize(mine, cfg.userColor) : null;
  }, [reports, cfg.userColor]);

  const coachText = over
    ? resultText(live, cfg.userColor, resigned, flagged)
    : shownReport
        ? undefined
        : ucis.length === 0
          ? userTurn
            ? 'Your move. I’ll grade every move and tell you why.'
            : `${bot.name} is opening the game.`
          : 'Your move.';

  return (
    <div className="game-page">
      <div className="game-layout">
        <div className="board-col" ref={boardRef}>
          <PlayerCard
            avatar={<BotAvatar color={bot.color} size={40} label={bot.name} />}
            name={bot.name}
            rating={String(cfg.elo)}
            captured={oppColor === 'w' ? cap.byWhite : cap.byBlack}
            lead={oppColor === 'w' ? cap.whiteLead : -cap.whiteLead}
            capturedColor={userIsWhite ? 'w' : 'b'}
            clock={timed ? { ms: clock[oppColor], since: clock.since, running: clockRunning && live.turn() === oppColor, onFlag: () => onFlag(oppColor) } : undefined}
            thinking={thinking && !judging}
            isTurn={!over && !userTurn}
          />
          <div className="board-row">
            {showEval && <EvalBar score={evalScore} orientation={userIsWhite ? 'white' : 'black'} />}
            <div className="board-holder">
              <Board
                fen={shownFen}
                orientation={userIsWhite ? 'white' : 'black'}
                onMove={handleMove}
                interactive={!over && userTurn && !judging && !paused && viewPly === null}
                lastMove={shownPly > 0 ? ucis[shownPly - 1] : undefined}
                arrows={arrows}
                highlights={threatSquares}
                hintSquares={hintSquares}
                markSquare={markSquare}
                id="game-board"
              />
              {modal && res && (
                <div className="gameover" role="dialog" aria-label="Game over">
                  <div className={`go-card go-${res}`}>
                    <div className="go-title">{res === 'win' ? 'You won!' : res === 'loss' ? `${bot.name} won` : res === 'draw' ? 'Draw' : 'Game over'}</div>
                    <div className="go-reason">{resultText(live, cfg.userColor, resigned, flagged)}</div>
                    <div className="go-avatars">
                      <YouAvatar size={56} />
                      <span className="go-vs">vs</span>
                      <BotAvatar color={bot.color} size={56} label={bot.name} />
                    </div>
                    {mineSummary && (
                      <div className="go-stats">
                        <div>
                          <b>{mineSummary.rating?.estimate ?? '–'}</b>
                          <span>game rating</span>
                        </div>
                        <div>
                          <b>{mineSummary.accuracy}%</b>
                          <span>accuracy</span>
                        </div>
                        <div>
                          <b>{mineSummary.counts.blunder ?? 0}</b>
                          <span>blunders</span>
                        </div>
                        <div>
                          <b>{mineSummary.counts.mistake ?? 0}</b>
                          <span>mistakes</span>
                        </div>
                      </div>
                    )}
                    {savedId && (
                      <button className="primary huge" onClick={() => requestReview({ gameId: savedId })}>
                        Game review
                      </button>
                    )}
                    <div className="row">
                      <button onClick={onRematch}>Rematch</button>
                      <button onClick={onExit}>New bot</button>
                      <button className="ghost" onClick={() => setModal(false)}>
                        Look at the board
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <PlayerCard
            avatar={<YouAvatar size={40} />}
            name="You"
            captured={cfg.userColor === 'w' ? cap.byWhite : cap.byBlack}
            lead={cfg.userColor === 'w' ? cap.whiteLead : -cap.whiteLead}
            capturedColor={oppColor}
            clock={timed ? { ms: clock[cfg.userColor], since: clock.since, running: clockRunning && live.turn() === cfg.userColor, onFlag: () => onFlag(cfg.userColor) } : undefined}
            isTurn={!over && userTurn}
          />
        </div>

        <aside className="side-panel">
          <div className="side-tabs">
            <span className="side-title">{cfg.coach ? 'Coach' : 'Match'}</span>
            <span className="muted small">{cfg.label}</span>
          </div>

          {cfg.coach ? (
            <div className="coach-area">
              {paused && !over ? (
                <CoachBubble report={paused}>
                  <div className="row wrap bubble-actions">
                    <button className="primary" onClick={takeBack}>
                      Take back
                    </button>
                    <button onClick={() => setPaused(null)}>Play on anyway</button>
                  </div>
                </CoachBubble>
              ) : shownReport && !over ? (
                <CoachBubble report={shownReport} thinking={judging} />
              ) : (
                <CoachBubble text={coachText} thinking={judging} />
              )}
              {oppNote && !paused && viewPly === null && <div className="opp-note">{oppNote}</div>}
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
                <div className="tool-row">
                  <button className="tool-btn" disabled={!userTurn || viewPly !== null} onClick={() => setThreats(threatReport(liveFen))}>
                    <Icon name="shield" />
                    <span>Blunder check</span>
                  </button>
                  <button className="tool-btn" disabled={!userTurn || !curAnalysis || viewPly !== null || hintLevel >= 2} onClick={() => setHintLevel((h) => Math.min(2, h + 1))}>
                    <Icon name="bulb" />
                    <span>{hintLevel === 0 ? 'Hint' : 'Show move'}</span>
                  </button>
                  <button className="tool-btn" disabled={ucis.length === 0 || judging} onClick={takeBack}>
                    <Icon name="undo" />
                    <span>Take back</span>
                  </button>
                  <button className={`tool-btn ${showEval ? 'is-on' : ''}`} onClick={() => setShowEval((s) => !s)}>
                    <Icon name="eval" />
                    <span>Eval bar</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="coach-area">
              <p className="muted">{over ? resultText(live, cfg.userColor, resigned, flagged) : thinking ? `${bot.name} is thinking…` : userTurn ? 'Your move.' : ''}</p>
            </div>
          )}

          <MoveList sans={sans} reports={cfg.coach ? reports : undefined} current={shownPly - 1} onPick={(i) => setViewPly(i + 1 === ucis.length ? null : i + 1)} startPly={startPly} />
          <div className="nav-row">
            <button className="nav-btn" onClick={() => setViewPly(0)} aria-label="First move">
              <Icon name="first" />
            </button>
            <button className="nav-btn" onClick={() => setViewPly(Math.max(0, shownPly - 1))} aria-label="Previous move">
              <Icon name="prev" />
            </button>
            <button className="nav-btn" onClick={() => setViewPly(shownPly + 1 >= ucis.length ? null : shownPly + 1)} aria-label="Next move">
              <Icon name="next" />
            </button>
            <button className="nav-btn" onClick={() => setViewPly(null)} aria-label="Live position">
              <Icon name="last" />
            </button>
          </div>
          <div className="foot-row">
            {!over && (
              <button
                className="text-btn danger-text"
                onClick={() => {
                  gen.current++;
                  setResigned(true);
                  setThinking(false);
                }}
              >
                <Icon name="flag" size="1.1em" /> Resign
              </button>
            )}
            {over && savedId && (
              <button className="primary" onClick={() => requestReview({ gameId: savedId })}>
                Game review
              </button>
            )}
            {over && (
              <button className="text-btn" onClick={onRematch}>
                <Icon name="rematch" size="1.1em" /> Rematch
              </button>
            )}
            <button className="text-btn" onClick={() => (over ? onExit() : go('home'))}>
              <Icon name="exit" size="1.1em" /> {over ? 'New bot' : 'Leave'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function resultFor(c: Chess, me: 'w' | 'b', resigned: boolean, flagged: 'w' | 'b' | null): 'win' | 'loss' | 'draw' | 'unfinished' {
  if (resigned) return 'loss';
  if (flagged) return flagged === me ? 'loss' : 'win';
  if (c.isCheckmate()) return c.turn() === me ? 'loss' : 'win';
  if (c.isDraw() || c.isStalemate()) return 'draw';
  return 'unfinished';
}
function resultText(c: Chess, me: 'w' | 'b', resigned: boolean, flagged: 'w' | 'b' | null) {
  if (resigned) return 'You resigned.';
  if (flagged) return flagged === me ? 'You ran out of time.' : 'Your opponent ran out of time.';
  if (c.isCheckmate()) return c.turn() === me ? 'Checkmate. Let’s review where it went wrong.' : 'Checkmate. Nicely done!';
  if (c.isStalemate()) return 'Stalemate — draw.';
  if (c.isThreefoldRepetition()) return 'Draw by repetition.';
  if (c.isInsufficientMaterial()) return 'Draw — insufficient material.';
  if (c.isDraw()) return 'Draw.';
  return '';
}
