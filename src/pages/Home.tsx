import { useState } from 'react';
import { getGames, getLessonProgress, getPuzzleStats, getSettings, saveSettings, resetAll } from '../lib/storage';
import { TAG_INFO, type Tag } from '../lib/coach';
import { LESSONS, LESSON_BY_ID } from '../data/lessons';
import { lessonCompletion } from './Learn';
import { go, requestPlay } from '../lib/nav';
import { THEME_LABELS } from '../data/puzzles';

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
  const nextLesson = LESSONS.find((l) => {
    const c = lessonCompletion(l, prog);
    return c.done < c.total;
  });
  const elo = getSettings().lastElo;

  return (
    <div className="page home">
      <section className="home-hero">
        <div>
          <h1>Stop giving games away.</h1>
          <p className="lede">
            At 1000–1500, games are lost to one or two blunders, not to bad openings. This trainer tracks exactly that, and points you at the fix.
          </p>
          <div className="row wrap">
            <button className="primary big" onClick={() => requestPlay({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', elo, coach: true, userColor: 'w' })}>
              Play a coached game at {elo}
            </button>
            <button className="big" onClick={() => go('review')}>
              Review a chess.com game
            </button>
          </div>
        </div>
        <div className="blunder-meter">
          {recent.length ? (
            <>
              <span className="bm-num">{avg(blunders).toFixed(1)}</span>
              <span className="bm-label">blunders per game</span>
              <span className="muted small">
                plus {avg(mistakes).toFixed(1)} mistakes, over your last {recent.length} reviewed game{recent.length > 1 ? 's' : ''}
              </span>
              <div className="bm-bars" aria-label="Blunders in recent games, oldest to newest">
                {[...blunders].reverse().map((b, i) => (
                  <span key={i} style={{ height: `${Math.min(100, 12 + b * 22)}%` }} title={`${b} blunders`} />
                ))}
              </div>
            </>
          ) : (
            <>
              <span className="bm-num">–</span>
              <span className="bm-label">blunders per game</span>
              <span className="muted small">Play a coached game or review a chess.com game to start tracking. Aim: under 1.</span>
            </>
          )}
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

        <section className="panel">
          <h2>Keep going</h2>
          <div className="keep">
            {nextLesson && (
              <button className="keep-item" onClick={() => go('learn', nextLesson.id)}>
                <span className="muted small">Next lesson</span>
                <span>{nextLesson.title}</span>
              </button>
            )}
            <button className="keep-item" onClick={() => go('puzzles')}>
              <span className="muted small">Puzzles · rating {ps.rating}</span>
              <span>{ps.daily[new Date().toISOString().slice(0, 10)] ?? 0} solved today</span>
            </button>
            <button className="keep-item" onClick={() => go('openings')}>
              <span className="muted small">Openings</span>
              <span>Drill your Ruy Lopez</span>
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
        <label htmlFor="cc-user">chess.com username</label>
        <input id="cc-user" value={s.chesscomUser} onChange={(e) => update({ chesscomUser: e.target.value })} />
        <label>Analysis depth</label>
        <div className="seg">
          {[
            [11, 'Fast'],
            [13, 'Normal'],
            [16, 'Deep'],
          ].map(([d, l]) => (
            <button key={d} className={s.depth === d ? 'on' : ''} onClick={() => update({ depth: d as number })}>
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
