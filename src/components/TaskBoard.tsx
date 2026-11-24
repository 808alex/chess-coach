import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from './Board';
import { Verdict } from './Bits';
import { getAnalysisEngine, isCancel } from '../engine/browserEngine';
import type { Analysis } from '../lib/engineTypes';
import { balance, playUci, sanOf } from '../lib/chessUtil';
import { flip, winPct } from '../lib/evalUtil';
import { judgeMove, type MoveReport } from '../lib/coach';

export type Task = {
  fen: string;
  goal: 'mate' | 'material' | 'best' | 'line';
  solution: string[]; // UCI, solver + replies
  minGain?: number;
  tolerance?: number;
  lastMove?: string;
  hint?: string;
};

type Props = {
  task: Task;
  prompt?: string;
  explain?: string;
  /** first = true if solved without any wrong attempt */
  onDone?: (result: { solved: boolean; first: boolean }) => void;
  onFirstMistake?: () => void;
  id?: string;
};

type State = 'thinking' | 'playing' | 'wrong' | 'solved' | 'shown';

export function TaskBoard({ task, prompt, explain, onDone, onFirstMistake, id = 'task' }: Props) {
  const [ucis, setUcis] = useState<string[]>([]);
  const [state, setState] = useState<State>('playing');
  const [feedback, setFeedback] = useState<{ text: string; report?: MoveReport } | null>(null);
  const [onScript, setOnScript] = useState(true);
  const [mistakes, setMistakes] = useState(0);
  const [hintOn, setHintOn] = useState(false);
  const cache = useRef(new Map<string, Promise<Analysis>>());
  const alive = useRef(true);
  const solver = new Chess(task.fen).turn();

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const fen = (() => {
    const c = new Chess(task.fen);
    for (const u of ucis) playUci(c, u);
    return c.fen();
  })();

  const analyse = (f: string, multipv = 3) => {
    const key = f + '|' + multipv;
    let p = cache.current.get(key);
    if (!p) {
      p = getAnalysisEngine().analyse(f, { depth: 15, movetime: 3000, multipv });
      p.catch(() => cache.current.delete(key));
      cache.current.set(key, p);
    }
    return p;
  };

  // Pre-analyse the starting position so grading is quick.
  useEffect(() => {
    analyse(task.fen).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.fen]);

  function finish(solved: boolean, text: string) {
    setState(solved ? 'solved' : 'shown');
    setFeedback({ text });
    onDone?.({ solved, first: solved && mistakes === 0 });
  }

  async function reply(after: Chess, nextUcis: string[], scripted: boolean) {
    setState('thinking');
    await new Promise((r) => setTimeout(r, 350));
    let mv: string | undefined;
    if (scripted && task.solution[nextUcis.length]) mv = task.solution[nextUcis.length];
    else {
      const a = await analyse(after.fen(), 1);
      mv = a.lines[0]?.move;
    }
    if (!alive.current || !mv) return;
    setUcis([...nextUcis, mv]);
    setState('playing');
  }

  async function onMove(uci: string) {
    if (state !== 'playing') return false;
    const before = new Chess(fen);
    const after = new Chess(fen);
    const m = playUci(after, uci);
    if (!m) return false;
    const nextUcis = [...ucis, uci];
    setUcis(nextUcis);
    setFeedback(null);
    setHintOn(false);
    const k = ucis.length;
    const expected = onScript ? task.solution[k] : undefined;

    // 1. Exactly the reference move.
    if (expected && expected === uci) {
      if (after.isCheckmate() || k + 1 >= task.solution.length) {
        finish(true, explain ?? 'Solved!');
        return true;
      }
      void reply(after, nextUcis, true);
      return true;
    }
    if (after.isCheckmate()) {
      finish(true, 'Checkmate — solved!');
      return true;
    }

    // 2. Not the reference move: ask the engine.
    setState('thinking');
    try {
      const a = await analyse(before.fen());
      const b = after.isGameOver() ? null : await analyse(after.fen(), 1);
      if (!alive.current) return true;
      const best = a.lines[0];
      const inA = a.lines.find((l) => l.move === uci);
      const playedScore = inA ? inA.score : b?.lines[0] ? flip(b.lines[0].score) : { cp: 0 };
      const loss = winPct(best.score) - winPct(playedScore);
      const winAfter = winPct(playedScore);
      const me = solver;
      const gain = balance(after, me) - balance(new Chess(task.fen), me);
      let accepted = false;
      let done = false;
      let msg = '';
      if (task.goal === 'mate') {
        accepted = playedScore.mate !== undefined && playedScore.mate > 0 && (best.score.mate === undefined || playedScore.mate <= best.score.mate + 1);
        msg = 'That keeps the mate going too.';
      } else if (task.goal === 'best') {
        accepted = loss <= (task.tolerance ?? 4);
        done = accepted;
        msg = 'Good move — that works as well as the main answer.';
      } else if (task.goal === 'material') {
        accepted = loss <= 3;
        done = accepted && gain >= (task.minGain ?? 2) && winAfter >= 70;
        msg = 'Different route, same result.';
      } else {
        accepted = loss <= 2 && winAfter >= 85;
        done = accepted;
        msg = 'That wins too — solved.';
      }
      if (accepted) {
        if (done) {
          finish(true, `${msg} ${explain ?? ''}`.trim());
        } else {
          setOnScript(false);
          setFeedback({ text: msg });
          void reply(after, nextUcis, false);
        }
        return true;
      }
      // Wrong: explain why using the coach.
      const report = judgeMove(before.fen(), uci, a, b, { ply: 20 });
      if (mistakes === 0) onFirstMistake?.();
      setMistakes((x) => x + 1);
      setFeedback({ text: 'Not quite.', report });
      setState('wrong');
    } catch (e) {
      if (!isCancel(e)) console.error(e);
      setState('playing');
    }
    return true;
  }

  function retry() {
    setUcis((u) => u.slice(0, -1));
    setFeedback(null);
    setState('playing');
  }

  async function showSolution() {
    setState('shown');
    setFeedback(null);
    setUcis([]);
    const line: string[] = [];
    for (const u of task.solution) {
      await new Promise((r) => setTimeout(r, 650));
      if (!alive.current) return;
      line.push(u);
      setUcis([...line]);
    }
    setFeedback({ text: explain ?? 'That was the solution.' });
    onDone?.({ solved: false, first: false });
  }

  const solutionSan = (() => {
    const c = new Chess(task.fen);
    const out: string[] = [];
    for (const u of task.solution) {
      const m = playUci(c, u);
      if (!m) break;
      out.push(m.san);
    }
    return out.join(' ');
  })();

  const lastMove = ucis.length ? ucis[ucis.length - 1] : task.lastMove;
  const firstMoveFrom = task.solution[0]?.slice(0, 2);

  return (
    <div className="taskboard">
      <div className="task-board">
        <Board
          fen={fen}
          orientation={solver === 'w' ? 'white' : 'black'}
          onMove={(u) => {
            void onMove(u);
            return true;
          }}
          interactive={state === 'playing'}
          lastMove={lastMove}
          highlights={hintOn && ucis.length === 0 && firstMoveFrom ? [firstMoveFrom] : []}
          arrows={state === 'wrong' && feedback?.report ? feedback.report.arrows.filter((a) => a.color.includes('230')) : []}
          id={id}
        />
      </div>
      <div className="task-side">
        {prompt && <p className="task-prompt">{prompt}</p>}
        <p className="muted small">{solver === 'w' ? 'White' : 'Black'} to move.</p>
        {state === 'thinking' && <p className="muted">Checking…</p>}
        {feedback && (
          <div className={`task-feedback ${state}`}>
            {state === 'solved' && <p className="ok-line">✓ Solved</p>}
            {state === 'wrong' && feedback.report ? (
              <>
                <Verdict r={feedback.report} />
              </>
            ) : (
              <p>{feedback.text}</p>
            )}
          </div>
        )}
        {state === 'shown' && <p className="muted small">Solution: {solutionSan}</p>}
        <div className="row wrap">
          {state === 'wrong' && (
            <button className="primary" onClick={retry}>
              Try again
            </button>
          )}
          {(state === 'playing' || state === 'wrong') && (
            <>
              {ucis.length === 0 && state === 'playing' && (
                <button onClick={() => setHintOn(true)} disabled={hintOn}>
                  Hint
                </button>
              )}
              <button className="ghost" onClick={showSolution}>
                Show solution
              </button>
            </>
          )}
          {(state === 'solved' || state === 'shown') && (
            <button
              className="ghost"
              onClick={() => {
                setUcis([]);
                setFeedback(null);
                setState('playing');
                setOnScript(true);
              }}
            >
              Reset
            </button>
          )}
        </div>
        {hintOn && <p className="muted small">{task.hint ?? `Move the piece on ${firstMoveFrom}.`}</p>}
      </div>
    </div>
  );
}

export function sansToUcis(fen: string, sans: string): string[] {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const s of sans.split(' ').filter(Boolean)) {
    const m = c.move(s);
    out.push(m.from + m.to + (m.promotion ?? ''));
  }
  return out;
}

export { sanOf };
