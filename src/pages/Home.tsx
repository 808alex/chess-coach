import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from '../components/Board';
import { CLASS_INFO, type MoveClass } from '../lib/evalUtil';
import { botFor, BOARD_THEMES } from '../lib/themes';
import { play } from '../lib/sound';
import { getGames, getLessonProgress, getPuzzleStats, getSettings, saveSettings, resetAll } from '../lib/storage';
import { TAG_INFO, type Tag } from '../lib/coach';
import { LESSONS, LESSON_BY_ID } from '../data/lessons';
import { lessonCompletion } from './Learn';
import { go, requestPlay } from '../lib/nav';
import { THEME_LABELS } from '../data/puzzles';

const HERO_LINE = 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#'.split(' ');
const HERO_NOTES: Record<number, { cls: MoveClass; text: string }> = {
  8: { cls: 'brilliant', text: 'Nxe5!! offers the queen' },
  9: { cls: 'blunder', text: 'Bxd1?? takes the bait' },
  10: { cls: 'great', text: 'Bxf7+ — the hunt begins' },
  12: { cls: 'best', text: 'Nd5# — Légal’s mate' },
};

function HeroBoard() {
  const [k, setK] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setK((x) => (x >= HERO_LINE.length + 3 ? 0 : x + 1)), k === 0 ? 1400 : 1100);
    return () => clearTimeout(t);
  }, [k]);
  const n = Math.min(k, HERO_LINE.length);
  const c = new Chess();
  let last: string | undefined;
  for (const m of HERO_LINE.slice(0, n)) {
    const mv = c.move(m);
    last = mv.from + mv.to;
  }
  const note = n > 0 ? HERO_NOTES[n - 1] : undefined;
  return (
    <div className="hero-board">
      <Board
        fen={c.fen()}
        interactive={false}
        lastMove={last}
        sound={false}
        id="hero"
        markSquare={note && last ? { square: last.slice(2, 4), color: CLASS_INFO[note.cls].color, symbol: CLASS_INFO[note.cls].symbol } : undefined}
      />
      {note && (
        <div className="hero-tag" key={n} style={{ color: CLASS_INFO[note.cls].color }}>
          {note.text}
        </div>
      )}
      <div className="hero-caption">{n === 0 ? 'Watch a classic trap…' : c.history().length > 8 ? 'The coach grades every move like this.' : `${Math.ceil(n / 2)}. ${HERO_LINE[n - 1]}`}</div>
    </div>
  );
}

function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      setV(value * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{v.toFixed(decimals)}</>;
}

export function Home() {
  const games = getGames().filter((g) => g.summary);
  const recent = games.slice(0, 10);
  const blunders = recent.map((g) => (g.summary!.counts.blunder ?? 0) + (g.summary!.counts.miss ?? 0));
  const mistakes = recent.map((g) => g.summary!.counts.mistake ?? 0);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const tags: Record<string, number> = {};
  for (const g of games.slice(0, 20)) for (const [t, n] of Object.entries(g.summary!.tags)) tags[t] = (tags[t] ?? 0) + (n ?? 0);
  const weak = Object.entries(tags)
    .filter(([t]) => TAG_INFO[t as Tag])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const phases = recent.reduce(
    (a, g) => ({
      opening: a.opening + g.summary!.blundersByPhase.opening,
      middlegame: a.middlegame + g.summary!.blundersByPhase.middlegame,
      endgame: a.endgame + g.summary!.blundersByPhase.endgame,
    }),
    { opening: 0, middlegame: 0, endgame: 0 },
  );
  const phaseTotal = phases.opening + phases.middlegame + phases.endgame;
  const ps = getPuzzleStats();
  const prog = getLessonProgress();
  const lessonDone = LESSONS.filter((l) => {
    const c = lessonCompletion(l, prog);
    return c.total > 0 && c.done >= c.total;
  }).length;
  const nextLesson = LESSONS.find((l) => {
    const c = lessonCompletion(l, prog);
    return c.done < c.total;
  });
  const elo = getSettings().lastElo;
  const bot = botFor(elo);

  return (
    <div className="page home">
      <section className="home-hero">
        <div>
          <h1>Stop giving games away.</h1>
          <p className="lede">
            At 1000–1500, games are lost to one or two blunders, not to bad openings. Play with a coach that grades every move, learn what to do after
            the opening, and track exactly what keeps costing you.
          </p>
          <div className="row wrap">
            <button className="primary big" onClick={() => requestPlay({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', elo, coach: true, userColor: 'w' })}>
              Play {bot.name} with the coach
            </button>
            <button className="big" onClick={() => go('review')}>
              Review a chess.com game
            </button>
          </div>
        </div>
        <HeroBoard />
      </section>

      <section className="home-stats">
        <div className="stat-card">
          <span className={`stat-big ${recent.length ? 'bad' : ''}`}>{recent.length ? <CountUp value={avg(blunders)} decimals={1} /> : '–'}</span>
          <span className="stat-label">blunders per game</span>
          <span className="muted small">
            {recent.length
              ? `plus ${avg(mistakes).toFixed(1)} mistakes, last ${recent.length} reviewed game${recent.length > 1 ? 's' : ''}. Aim: under 1.`
              : 'Play a coached game or review one to start tracking. Aim: under 1.'}
          </span>
          {recent.length > 0 && (
            <div className="bm-bars" aria-label="Blunders in recent games, oldest to newest">
              {[...blunders].reverse().map((b, i) => (
                <span key={i} style={{ height: `${Math.min(100, 12 + b * 22)}%`, animationDelay: `${i * 50}ms` }} title={`${b} blunders`} />
              ))}
            </div>
          )}
        </div>
        <div className="stat-card">
          <span className="stat-big gold">
            <CountUp value={ps.rating} />
          </span>
          <span className="stat-label">puzzle rating</span>
          <span className="muted small">
            {ps.solved} solved · streak {ps.streak} (best {ps.bestStreak})
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-big good">
            <CountUp value={lessonDone} />/{LESSONS.filter((l) => lessonCompletion(l, prog).total > 0).length}
          </span>
          <span className="stat-label">lessons finished</span>
          <span className="muted small">{nextLesson ? `Next up: ${nextLesson.title}` : 'All done. Time to play.'}</span>
        </div>
      </section>

      <div className="home-grid">
        <section className="panel">
          <h2>What keeps costing you</h2>
          {weak.length ? (
            <ul className="weak-list">
              {weak.map(([t, n]) => {
                const info = TAG_INFO[t as Tag]!;
                return (
                  <li key={t}>
                    <span className="weak-name">{info.label}</span>
                    <span className="muted small">{n}×</span>
                    <span className="row">
                      {info.lesson && (
                        <button className="chip" onClick={() => go('learn', info.lesson)}>
                          Lesson: {LESSON_BY_ID[info.lesson]?.title}
                        </button>
                      )}
                      {info.puzzleTheme && (
                        <button className="chip" onClick={() => go('puzzles', info.puzzleTheme)}>
                          Puzzles: {THEME_LABELS[info.puzzleTheme] ?? info.puzzleTheme}
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Nothing yet. After a few reviewed games this shows your most common type of mistake, with the lesson and puzzles that fix it.</p>
          )}
          {phaseTotal > 0 && (
            <p className="small">
              Where they happen: opening {Math.round((phases.opening / phaseTotal) * 100)}%, middlegame {Math.round((phases.middlegame / phaseTotal) * 100)}%, endgame{' '}
              {Math.round((phases.endgame / phaseTotal) * 100)}%.
            </p>
          )}
        </section>

        <section className="panel checklist">
          <h2>Before every move</h2>
          <ol>
            <li>What did his last move attack, and what did it stop defending?</li>
            <li>His checks, captures and threats.</li>
            <li>My checks, captures and threats.</li>
            <li>After my move: his checks and captures again.</li>
          </ol>
          <button className="chip" onClick={() => go('learn', 'blunder-check')}>
            Read the lesson
          </button>
        </section>

        <section className="panel wide">
          <h2>Keep going</h2>
          <div className="keep">
            {nextLesson && (
              <button className="keep-item" onClick={() => go('learn', nextLesson.id)}>
                <span className="keep-ico">♗</span>
                <span className="muted small">Next lesson</span>
                <span>{nextLesson.title}</span>
              </button>
            )}
            <button className="keep-item" onClick={() => go('puzzles')}>
              <span className="keep-ico">♖</span>
              <span className="muted small">Puzzles · rating {ps.rating}</span>
              <span>{ps.daily[new Date().toISOString().slice(0, 10)] ?? 0} solved today</span>
            </button>
            <button className="keep-item" onClick={() => go('openings')}>
              <span className="keep-ico">♙</span>
              <span className="muted small">Openings</span>
              <span>Drill your Ruy Lopez</span>
            </button>
            <button className="keep-item" onClick={() => go('play')}>
              <span className="keep-ico">♘</span>
              <span className="muted small">Play</span>
              <span>Pick a bot, 100–3000</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export function Settings() {
  const [s, setS] = useState(getSettings());
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const update = (p: Partial<typeof s>) => {
    const n = { ...s, ...p };
    setS(n);
    saveSettings(n);
    setSaved(true);
  };
  return (
    <div className="page">
      <h1>Settings</h1>
      <section className="panel">
        <h2>Board</h2>
        <div className="theme-grid">
          {BOARD_THEMES.map((t) => (
            <button key={t.id} className={`theme-opt ${s.boardTheme === t.id ? 'on' : ''}`} onClick={() => update({ boardTheme: t.id })}>
              <span className="theme-swatch" aria-hidden>
                <i style={{ background: t.light }} />
                <i style={{ background: t.dark }} />
                <i style={{ background: t.dark }} />
                <i style={{ background: t.light }} />
              </span>
              {t.name}
            </button>
          ))}
        </div>
        <div className="settings-preview">
          <Board fen="r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4" interactive={false} lastMove="g8f6" sound={false} id="settings-preview" />
        </div>
      </section>
      <section className="panel">
        <h2>Sound</h2>
        <label className="check">
          <input type="checkbox" checked={s.sound} onChange={(e) => update({ sound: e.target.checked })} /> Sound effects
        </label>
        <label htmlFor="vol">Volume</label>
        <input id="vol" type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => update({ volume: Number(e.target.value) })} disabled={!s.sound} />
        <div className="row wrap" style={{ marginTop: 12 }}>
          {(['move', 'capture', 'castle', 'check', 'promote', 'correct', 'wrong', 'win'] as const).map((n) => (
            <button key={n} className="chip" onClick={() => play(n)} disabled={!s.sound}>
              ▶ {n}
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Analysis</h2>
        <label htmlFor="cc-user">chess.com username</label>
        <input id="cc-user" value={s.chesscomUser} onChange={(e) => update({ chesscomUser: e.target.value })} />
        <label>Analysis depth</label>
        <div className="seg">
          {[
            [11, 'Fast'],
            [13, 'Normal'],
            [16, 'Deep'],
          ].map(([d, l]) => (
            <button key={d} className={`pill ${s.depth === d ? 'on' : ''}`} onClick={() => update({ depth: d as number })}>
              {l}
            </button>
          ))}
        </div>
        <p className="muted small">Deeper is more accurate but slower to grade each move. Normal is plenty for club games.</p>
        <label className="check">
          <input type="checkbox" checked={s.showEval} onChange={(e) => update({ showEval: e.target.checked })} /> Show the evaluation bar by default
        </label>
        {saved && <p className="muted small">Saved.</p>}
      </section>
      <section className="panel">
        <h2>Your data</h2>
        <p className="muted small">Everything is stored in this browser only. Nothing is uploaded.</p>
        {!confirmReset ? (
          <button className="danger" onClick={() => setConfirmReset(true)}>
            Reset all progress
          </button>
        ) : (
          <div className="row wrap">
            <span>Delete all games, puzzle stats and lesson progress?</span>
            <button
              className="danger"
              onClick={() => {
                resetAll();
                location.reload();
              }}
            >
              Yes, delete everything
            </button>
            <button onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        )}
      </section>
      <section className="panel">
        <h2>Credits</h2>
        <p className="small">
          Engine: Stockfish 19 (GPLv3) via stockfish.js by Nathan Rugg. Online puzzles: the Lichess puzzle database (CC0). Board: react-chessboard. Rules:
          chess.js.
        </p>
      </section>
    </div>
  );
}
