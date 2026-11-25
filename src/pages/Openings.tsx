import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { REPERTOIRE, type Chapter, type RepLine } from '../data/repertoire';
import { Board } from '../components/Board';
import { getOpeningStats, recordOpening } from '../lib/storage';
import { go, requestPlay } from '../lib/nav';
import { play } from '../lib/sound';
import { confetti } from '../lib/confetti';

function fenAt(moves: string[], n: number) {
  const c = new Chess();
  for (const m of moves.slice(0, n)) c.move(m);
  return c;
}
function lastUci(moves: string[], n: number) {
  if (n === 0) return undefined;
  const c = fenAt(moves, n - 1);
  const m = c.move(moves[n - 1]);
  return m.from + m.to;
}

export function Openings({ arg }: { arg?: string }) {
  const [chId, mode] = (arg ?? '').split('/');
  const ch = REPERTOIRE.find((c) => c.id === chId);
  if (ch && mode === 'drill') return <Drill chapter={ch} />;
  if (ch) return <ChapterView chapter={ch} />;
  const stats = getOpeningStats();
  return (
    <div className="page">
      <h1>Openings</h1>
      <p className="lede">
        Your White repertoire built around what you already play (1.e4 and the Ruy Lopez), plus a simple Black setup: 1...e5 against 1.e4, and
        ...d5 + ...e6 against everything else. Learn the ideas first, then drill until you can play the moves without thinking.
      </p>
      {(['w', 'b'] as const).map((side) => (
        <section key={side} className="lesson-group">
          <h2>{side === 'w' ? 'As White' : 'As Black'}</h2>
          <div className="lesson-list">
            {REPERTOIRE.filter((c) => c.side === side).map((c) => {
              const s = c.lines.reduce((a, l) => ({ ok: a.ok + (stats[l.id]?.ok ?? 0), fail: a.fail + (stats[l.id]?.fail ?? 0) }), { ok: 0, fail: 0 });
              return (
                <button key={c.id} className="lesson-item" onClick={() => go('openings', c.id)}>
                  <span className="li-icon" aria-hidden>
                    {side === 'w' ? '♔' : '♚'}
                  </span>
                  <span className="li-title">{c.title}</span>
                  <span className="li-summary">{c.intro}</span>
                  <span className="small muted">
                    {c.lines.length} lines{s.ok + s.fail > 0 ? ` · drilled ${s.ok + s.fail}× · ${Math.round((s.ok / (s.ok + s.fail)) * 100)}% clean` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ChapterView({ chapter }: { chapter: Chapter }) {
  const [lineId, setLineId] = useState(chapter.lines[0].id);
  const line = chapter.lines.find((l) => l.id === lineId)!;
  return (
    <div className="page">
      <button className="back" onClick={() => go('openings')}>
        ← All openings
      </button>
      <h1>{chapter.title}</h1>
      <p className="lede">{chapter.intro}</p>
      <div className="row wrap">
        <button className="primary" onClick={() => go('openings', chapter.id + '/drill')}>
          Drill this chapter
        </button>
      </div>
      <div className="chips line-tabs">
        {chapter.lines.map((l) => (
          <button key={l.id} className={`chip ${l.id === lineId ? 'on' : ''}`} onClick={() => setLineId(l.id)}>
            {l.name}
          </button>
        ))}
      </div>
      <LineStudy key={line.id} line={line} side={chapter.side} />
    </div>
  );
}

function LineStudy({ line, side }: { line: RepLine; side: 'w' | 'b' }) {
  const moves = line.moves.split(' ');
  const [k, setK] = useState(0);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setK((x) => Math.min(moves.length, x + 1));
      if (e.key === 'ArrowLeft') setK((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [moves.length]);
  const c = fenAt(moves, k);
  const note = k > 0 ? line.notes[k - 1] : undefined;
  return (
    <div className="study">
      <div className="study-board">
        <Board fen={c.fen()} interactive={false} orientation={side === 'w' ? 'white' : 'black'} lastMove={lastUci(moves, k)} id="study" />
      </div>
      <div className="study-side">
        <div className="line-sans">
          {moves.map((m, i) => (
            <button key={i} className={`chip ${i < k ? 'on' : ''} ${line.notes[i] ? 'has-note' : ''}`} onClick={() => setK(i + 1)}>
              {i % 2 === 0 ? `${i / 2 + 1}.` : ''}
              {m}
            </button>
          ))}
        </div>
        <div className="note-box">
          {k === 0 ? (
            <p className="muted">Step through with the arrows (or ← → keys). Moves with a dot have a note.</p>
          ) : note ? (
            <p>
              <strong>{moves[k - 1]}</strong> — {note}
            </p>
          ) : (
            <p className="muted">{moves[k - 1]}</p>
          )}
        </div>
        {k === moves.length && (
          <div className="plan-box">
            <h3>The plan from here</h3>
            <p>{line.plan}</p>
            <button className="primary" onClick={() => requestPlay({ fen: c.fen(), elo: 1300, userColor: side, coach: true, label: line.name })}>
              Play this position vs the bot
            </button>
          </div>
        )}
        <div className="row">
          <button onClick={() => setK(0)}>Start</button>
          <button onClick={() => setK(Math.max(0, k - 1))}>◀</button>
          <button className="primary" onClick={() => setK(Math.min(moves.length, k + 1))} disabled={k >= moves.length}>
            ▶
          </button>
          <button onClick={() => setK(moves.length)}>End</button>
        </div>
      </div>
    </div>
  );
}

function Drill({ chapter }: { chapter: Chapter }) {
  const lines = useMemo(() => chapter.lines.map((l) => ({ l, moves: l.moves.split(' ') })), [chapter]);
  const [played, setPlayed] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'done'; text: string } | null>(null);
  const [mistake, setMistake] = useState(false);
  const [finished, setFinished] = useState<RepLine | null>(null);
  const [round, setRound] = useState(0);
  const side = chapter.side;

  const candidates = lines.filter((x) => played.every((m, i) => x.moves[i] === m));
  const c = fenAt(played, played.length);
  const turn = c.turn();

  // Opponent's move (and the very first move if we're Black).
  useEffect(() => {
    if (finished) return;
    const ended = candidates.find((x) => x.moves.length === played.length);
    if (ended || !candidates.length) {
      if (ended) {
        setFinished(ended.l);
        recordOpening(ended.l.id, !mistake);
        setTimeout(() => {
          play(mistake ? 'notify' : 'correct');
          if (!mistake) confetti({ count: 70 });
        }, 300);
      }
      return;
    }
    if (turn === side) return;
    // Weight by how often you've failed a line, so weak lines come up more.
    const stats = getOpeningStats();
    const weights = candidates.map((x) => 1 + (stats[x.l.id]?.fail ?? 0) * 2);
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let pick = candidates[0];
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        pick = candidates[i];
        break;
      }
    }
    const t = setTimeout(() => setPlayed((p) => [...p, pick.moves[p.length]]), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [played, finished, round]);

  function onMove(uci: string) {
    if (finished || turn !== side) return false;
    const t = new Chess(c.fen());
    const m = t.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? 'q' });
    const ok = candidates.filter((x) => x.moves[played.length] === m.san);
    if (!ok.length) {
      const expected = [...new Set(candidates.map((x) => x.moves[played.length]))];
      const noteLine = candidates.find((x) => x.l.notes[played.length]);
      setMsg({
        kind: 'bad',
        text: `Not in your repertoire. Play ${expected.join(' or ')}.${noteLine ? ' ' + noteLine.l.notes[played.length] : ''}`,
      });
      setMistake(true);
      play('wrong');
      return false;
    }
    const note = ok[0].l.notes[played.length];
    setMsg({ kind: 'ok', text: note ? `${m.san} — ${note}` : `${m.san} ✓` });
    setPlayed([...played, m.san]);
    return true;
  }

  function restart() {
    setPlayed([]);
    setMsg(null);
    setMistake(false);
    setFinished(null);
    setRound((r) => r + 1);
  }

  return (
    <div className="page">
      <button className="back" onClick={() => go('openings', chapter.id)}>
        ← {chapter.title}
      </button>
      <h1>Drill</h1>
      <p className="lede">Play your moves from memory. The bot picks a random line from this chapter, and lines you get wrong come up more often.</p>
      <div className="study">
        <div className="study-board">
          <Board
            fen={c.fen()}
            orientation={side === 'w' ? 'white' : 'black'}
            onMove={onMove}
            interactive={!finished && turn === side}
            lastMove={lastUci(played, played.length)}
            id="drill"
          />
        </div>
        <div className="study-side">
          <p className="line-sans small">{played.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}.${m}` : m)).join(' ')}</p>
          {msg && <div className={`note-box ${msg.kind}`}>{msg.text}</div>}
          {finished && (
            <div className="plan-box">
              <h3>
                {mistake ? 'Line finished (with a slip)' : 'Clean!'} — {finished.name}
              </h3>
              <p>{finished.plan}</p>
              <div className="row wrap">
                <button className="primary" onClick={restart}>
                  Next line
                </button>
                <button onClick={() => requestPlay({ fen: c.fen(), elo: 1300, userColor: side, coach: true, label: finished.name })}>
                  Play on from here
                </button>
              </div>
            </div>
          )}
          {!finished && (
            <button className="ghost" onClick={restart}>
              Restart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
