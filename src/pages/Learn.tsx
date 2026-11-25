import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { LESSONS, LESSON_BY_ID, type Lesson, type LessonStep, type Start } from '../data/lessons';
import { Md } from '../components/Md';
import { Board } from '../components/Board';
import { TaskBoard, sansToUcis } from '../components/TaskBoard';
import { Progress } from '../components/Bits';
import { getLessonProgress, getPuzzleStats, markStep, recordPuzzle } from '../lib/storage';
import { go, requestPlay } from '../lib/nav';
import { pickPuzzles, THEME_LABELS } from '../data/puzzles';
import { playUci } from '../lib/chessUtil';

export function startToFen(s: Start) {
  if ('fen' in s) return s.fen;
  const c = new Chess();
  for (const m of s.moves.split(' ').filter(Boolean)) c.move(m);
  return c.fen();
}

const isTask = (s: LessonStep) => s.kind === 'exercise' || s.kind === 'practice';

export function lessonCompletion(l: Lesson, prog = getLessonProgress()) {
  const tasks = l.steps.map((s, i) => (isTask(s) ? i : -1)).filter((i) => i >= 0);
  const done = tasks.filter((i) => prog[l.id]?.includes(i)).length;
  return { done, total: tasks.length };
}

export function Learn({ arg }: { arg?: string }) {
  if (arg && LESSON_BY_ID[arg]) return <LessonView lesson={LESSON_BY_ID[arg]} />;
  const prog = getLessonProgress();
  const groups = ['Thinking', 'Tactics', 'Middlegame', 'Endgame'] as const;
  return (
    <div className="page">
      <h1>Learn</h1>
      <p className="lede">
        Theory for the part of the game where you get stuck: what to look for, how to pick a plan, and how to turn an advantage into a win. Every
        exercise is checked by the engine, so other good moves count too.
      </p>
      {groups.map((g) => (
        <section key={g} className="lesson-group">
          <h2>{g}</h2>
          <div className="lesson-list">
            {LESSONS.filter((l) => l.group === g).map((l) => {
              const c = lessonCompletion(l, prog);
              return (
                <button key={l.id} className="lesson-item" onClick={() => go('learn', l.id)}>
                  <span className="li-icon" aria-hidden>
                    {{ Thinking: '♔', Tactics: '♘', Middlegame: '♖', Endgame: '♙' }[l.group]}
                  </span>
                  <span className="li-title">{l.title}</span>
                  <span className="li-summary">{l.summary}</span>
                  {c.total > 0 && (
                    <span className="li-progress">
                      <Progress value={c.done} max={c.total} label={`${l.title} progress`} />
                      <span className="small muted">
                        {c.done}/{c.total}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function LessonView({ lesson }: { lesson: Lesson }) {
  const [, force] = useState(0);
  const prog = getLessonProgress();
  const idx = LESSONS.findIndex((l) => l.id === lesson.id);
  const next = LESSONS[idx + 1];
  const done = (i: number) => prog[lesson.id]?.includes(i);
  let exNo = 0;
  return (
    <div className="page lesson">
      <button className="back" onClick={() => go('learn')}>
        ← All lessons
      </button>
      <h1>{lesson.title}</h1>
      <p className="lede">{lesson.summary}</p>
      {lesson.steps.map((s, i) => {
        if (s.kind === 'text') return <Md key={i} text={s.md} />;
        if (s.kind === 'board') return <LineViewer key={i} step={s} />;
        if (s.kind === 'exercise') {
          exNo++;
          const fen = startToFen(s.start);
          return (
            <section key={i} className={`exercise ${done(i) ? 'done' : ''}`}>
              <h3>
                Exercise {exNo} {done(i) && <span className="ok-line">✓</span>}
              </h3>
              <TaskBoard
                id={`ex-${lesson.id}-${i}`}
                task={{ fen, goal: s.goal, solution: sansToUcis(fen, s.solution), minGain: s.minGain, tolerance: s.tolerance, hint: s.hint }}
                prompt={s.prompt}
                explain={s.explain}
                onDone={(r) => {
                  if (r.solved) {
                    markStep(lesson.id, i);
                    force((x) => x + 1);
                  }
                }}
              />
            </section>
          );
        }
        if (s.kind === 'practice')
          return (
            <PracticeBlock
              key={i}
              theme={s.theme}
              count={s.count}
              text={s.text}
              done={!!done(i)}
              onComplete={() => {
                markStep(lesson.id, i);
                force((x) => x + 1);
              }}
            />
          );
        if (s.kind === 'play')
          return (
            <section key={i} className="play-step">
              <h3>{s.label}</h3>
              <p>{s.text}</p>
              <button className="primary" onClick={() => requestPlay({ fen: startToFen(s.start), elo: s.elo, userColor: s.userColor, coach: true, label: s.label })}>
                Play it vs the bot
              </button>
            </section>
          );
        return null;
      })}
      <div className="lesson-foot">
        {next ? (
          <button className="primary" onClick={() => go('learn', next.id)}>
            Next lesson: {next.title}
          </button>
        ) : (
          <button onClick={() => go('learn')}>Back to lessons</button>
        )}
      </div>
    </div>
  );
}

function LineViewer({ step }: { step: Extract<LessonStep, { kind: 'board' }> }) {
  const start = startToFen(step.start);
  const ucis = useMemo(() => (step.line ? sansToUcis(start, step.line) : []), [start, step.line]);
  const [k, setK] = useState(0);
  const fen = useMemo(() => {
    const c = new Chess(start);
    for (const u of ucis.slice(0, k)) playUci(c, u);
    return c.fen();
  }, [start, ucis, k]);
  const sans = step.line ? step.line.split(' ') : [];
  const orientation = new Chess(start).turn() === 'w' ? 'white' : 'black';
  return (
    <figure className="line-viewer">
      <div className="lv-board">
        <Board
          fen={fen}
          interactive={false}
          orientation={step.line ? 'white' : orientation}
          arrows={k === 0 ? (step.arrows ?? []).map(([from, to]) => ({ from, to, color: 'rgba(214,166,72,.9)' })) : []}
          lastMove={k > 0 ? ucis[k - 1] : undefined}
          highlights={k === 0 ? step.highlight : []}
          id={'lv-' + start.slice(0, 20)}
        />
      </div>
      <figcaption>
        <p>{step.caption}</p>
        {ucis.length > 0 && (
          <>
            <p className="line-sans">
              {sans.map((s, i) => (
                <button key={i} className={`chip ${i < k ? 'on' : ''}`} onClick={() => setK(i + 1)}>
                  {s}
                </button>
              ))}
            </p>
            <div className="row">
              <button onClick={() => setK(0)}>Start</button>
              <button onClick={() => setK(Math.max(0, k - 1))}>◀ Back</button>
              <button className="primary" onClick={() => setK(Math.min(ucis.length, k + 1))} disabled={k >= ucis.length}>
                Next move ▶
              </button>
            </div>
          </>
        )}
      </figcaption>
    </figure>
  );
}

export function PracticeBlock({ theme, count, text, done, onComplete }: { theme: string; count: number; text: string; done: boolean; onComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const puzzles = useMemo(() => {
    const s = getPuzzleStats();
    return pickPuzzles(theme, s.rating, count, s.seen);
  }, [theme, count]);
  const p = puzzles[i];
  return (
    <section className={`exercise practice ${done ? 'done' : ''}`}>
      <h3>
        Practice: {THEME_LABELS[theme] ?? theme} {done && <span className="ok-line">✓</span>}
      </h3>
      <p>{text}</p>
      {!open ? (
        <button className="primary" onClick={() => setOpen(true)}>
          Start {puzzles.length} puzzles
        </button>
      ) : i >= puzzles.length ? (
        <div>
          <p>
            You solved {score} of {puzzles.length} first time.
          </p>
          <button
            onClick={() => {
              setI(0);
              setScore(0);
            }}
          >
            Again
          </button>
        </div>
      ) : (
        <>
          <p className="muted small">
            Puzzle {i + 1} of {puzzles.length} · rating {p.rating}
          </p>
          <TaskBoard
            key={p.id}
            id={'pr-' + p.id}
            task={{ fen: p.fen, goal: p.themes.includes('mate') ? 'mate' : 'line', solution: p.solution, lastMove: p.lastMove }}
            onFirstMistake={() => recordPuzzle(p.id, p.rating, p.themes, false)}
            onDone={(r) => {
              if (r.first) {
                recordPuzzle(p.id, p.rating, p.themes, true);
                setScore((s) => s + 1);
              }
            }}
          />
          <button className="primary" onClick={() => {
            if (i + 1 >= puzzles.length) onComplete();
            setI(i + 1);
          }}>
            {i + 1 >= puzzles.length ? 'Finish' : 'Next puzzle'}
          </button>
        </>
      )}
    </section>
  );
}
