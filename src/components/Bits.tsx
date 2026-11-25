import { useEffect, useRef } from 'react';
import type { Score } from '../lib/engineTypes';
import { CLASS_INFO, formatScore, winPct, type MoveClass } from '../lib/evalUtil';
import type { MoveReport } from '../lib/coach';
import { ClassIcon } from './ClassIcon';

/** Vertical evaluation bar, White's point of view. */
export function EvalBar({ score, orientation }: { score: Score | null; orientation: 'white' | 'black' }) {
  const w = score ? winPct(score) : 50;
  const label = score ? formatScore(score) : '…';
  return (
    <div className={`evalbar ${orientation === 'black' ? 'flipped' : ''}`} aria-label={`Evaluation ${label}`}>
      <div className="evalbar-white" style={{ height: `${w}%` }} />
      <span className={`evalbar-label ${w >= 50 ? 'on-white' : 'on-black'}`}>{label}</span>
    </div>
  );
}

export function ClassGlyph({ cls, size = 'md' }: { cls: MoveClass; size?: 'sm' | 'md' | 'lg' }) {
  const i = CLASS_INFO[cls];
  return (
    <span className={`glyph glyph-${size}`} style={{ background: i.color }} title={i.label}>
      <ClassIcon cls={cls} />
    </span>
  );
}

/** The coach's verdict on a move. */
export function Verdict({ r, perspective = 'you' }: { r: MoveReport; perspective?: 'you' | 'neutral' }) {
  const i = CLASS_INFO[r.cls];
  return (
    <div className="verdict" style={{ ['--cls' as string]: i.color }}>
      <div className="verdict-head">
        <span className="verdict-symbol" style={{ background: i.color }}>
          <ClassIcon cls={r.cls} />
        </span>
        <div>
          <div className="verdict-label">
            {r.san} is {i.label === 'Best' || i.label === 'Book' ? `the ${i.label.toLowerCase()} move` : i.label === 'Missed win' ? 'a missed win' : `${/^[AEIOU]/.test(i.label) ? 'an' : 'a'} ${i.label.toLowerCase()}`}
          </div>
          <div className="verdict-headline">{perspective === 'you' ? r.headline : r.headline.replace(/\byour\b/gi, 'the')}</div>
        </div>
      </div>
      {r.details.length > 0 && (
        <ul className="verdict-details">
          {r.details.map((d, k) => (
            <li key={k}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Win-probability graph for a reviewed game. */
export function EvalGraph({ reports, current, onPick }: { reports: MoveReport[]; current: number; onPick: (i: number) => void }) {
  const W = 600;
  const H = 110;
  if (!reports.length) return null;
  const pts = reports.map((r, i) => {
    const x = ((i + 1) / reports.length) * W;
    const y = H - (winPct(r.evalAfterWhite) / 100) * H;
    return [x, y] as const;
  });
  const path = `M0,${H / 2} ` + pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg className="evalgraph" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Evaluation graph">
      <rect x="0" y="0" width={W} height={H} className="eg-black" />
      <path d={`${path} L${W},${H} L0,${H} Z`} className="eg-white" />
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="eg-mid" />
      {reports.map((r, i) =>
        ['blunder', 'mistake', 'miss', 'brilliant', 'great'].includes(r.cls) ? (
          <circle key={i} cx={pts[i][0]} cy={pts[i][1]} r="4.5" fill={CLASS_INFO[r.cls].color} stroke="#1d2433" strokeWidth="1.5" />
        ) : null,
      )}
      {current >= 0 && current < pts.length && <line x1={pts[current][0]} x2={pts[current][0]} y1="0" y2={H} className="eg-cursor" />}
      {reports.map((_, i) => (
        <rect
          key={'h' + i}
          x={i === 0 ? 0 : (pts[i - 1][0] + pts[i][0]) / 2}
          width={W / reports.length}
          y="0"
          height={H}
          fill="transparent"
          onClick={() => onPick(i)}
          style={{ cursor: 'pointer' }}
        />
      ))}
    </svg>
  );
}

/** Two-column move list with classification glyphs. */
export function MoveList({ sans, reports, current, onPick, startPly = 0 }: { sans: string[]; reports?: (MoveReport | undefined)[]; current: number; onPick: (i: number) => void; startPly?: number }) {
  const rows: { no: number; w?: number; b?: number }[] = [];
  const offset = startPly % 2; // 1 if the game started with Black to move
  for (let i = 0; i < sans.length; i++) {
    const ply = i + offset;
    const no = Math.floor((startPly + i) / 2) + 1;
    if (ply % 2 === 0) rows.push({ no, w: i });
    else {
      if (!rows.length || rows[rows.length - 1].b !== undefined || i === 0) rows.push({ no, b: i });
      else rows[rows.length - 1].b = i;
    }
  }
  const cell = (i?: number) => {
    if (i === undefined) return <span className="ml-cell empty">…</span>;
    const r = reports?.[i];
    return (
      <button className={`ml-cell ${i === current ? 'active' : ''}`} onClick={() => onPick(i)}>
        {sans[i]}
        {r && !['best', 'excellent', 'good', 'book'].includes(r.cls) && <ClassGlyph cls={r.cls} size="sm" />}
        {r && r.cls === 'book' && <span className="ml-book">book</span>}
      </button>
    );
  };
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (el && current >= sans.length - 2) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [sans.length, current]);
  return (
    <div className="movelist" ref={box}>
      {rows.map((row, k) => (
        <div className="ml-row" key={k}>
          <span className="ml-no">{row.no}.</span>
          {cell(row.w)}
          {cell(row.b)}
        </div>
      ))}
      {!sans.length && <p className="muted small">No moves yet.</p>}
    </div>
  );
}

export function Progress({ value, max, label }: { value: number; max: number; label?: string }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
      <div style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}
