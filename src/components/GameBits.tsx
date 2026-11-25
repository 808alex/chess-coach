import type { PieceSymbol } from 'chess.js';
import type { MoveReport } from '../lib/coach';
import { CLASS_INFO } from '../lib/evalUtil';

const GLYPH: Record<string, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' };

export function BotAvatar({ color, size = 44, label }: { color: string; size?: number; label?: string }) {
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 44 44" role="img" aria-label={label ?? 'Bot'}>
      <defs>
        <linearGradient id={`g${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="42" height="42" rx="9" fill={`url(#g${color.slice(1)})`} />
      <rect x="9" y="12" width="26" height="20" rx="7" fill="#1d1c1a" opacity="0.85" />
      <circle cx="17" cy="21" r="3.2" fill="#fff" />
      <circle cx="27" cy="21" r="3.2" fill="#fff" />
      <rect x="17" y="27" width="10" height="2.2" rx="1.1" fill="#fff" opacity="0.8" />
      <rect x="20.5" y="5" width="3" height="7" rx="1.5" fill="#1d1c1a" opacity="0.85" />
      <circle cx="22" cy="5" r="2.6" fill="#fff" />
    </svg>
  );
}

export function YouAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 44 44" role="img" aria-label="You">
      <rect x="1" y="1" width="42" height="42" rx="9" fill="#4a4743" />
      <circle cx="22" cy="17" r="7.5" fill="#a8a29a" />
      <path d="M8 40c1.5-8 7-12 14-12s12.5 4 14 12" fill="#a8a29a" />
    </svg>
  );
}

export function CoachAvatar({ size = 52 }: { size?: number }) {
  return (
    <svg className="avatar coach-avatar" width={size} height={size} viewBox="0 0 52 52" role="img" aria-label="Coach">
      <circle cx="26" cy="27" r="24" fill="#81b64c" />
      <circle cx="26" cy="27" r="24" fill="url(#coachShine)" />
      <defs>
        <radialGradient id="coachShine" cx="0.35" cy="0.25" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <text x="26" y="39" textAnchor="middle" fontSize="30" fill="#fff">♞</text>
      <path d="M10 13 L26 6 L42 13 L26 20 Z" fill="#2b2926" />
      <rect x="23" y="13" width="6" height="5" fill="#2b2926" />
      <path d="M40 13 v8" stroke="#f5c542" strokeWidth="1.8" />
      <circle cx="40" cy="22" r="1.8" fill="#f5c542" />
    </svg>
  );
}

export function Captured({ pieces, lead, capturedColor }: { pieces: PieceSymbol[]; lead: number; capturedColor: 'w' | 'b' }) {
  const order: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q'];
  return (
    <span className="captured" aria-label={`Captured: ${pieces.join(', ') || 'nothing'}`}>
      {order.map((t) => {
        const n = pieces.filter((x) => x === t).length;
        if (!n) return null;
        return (
          <span key={t} className={`cap-group cap-${capturedColor}`}>
            {Array.from({ length: n }, (_, i) => (
              <span key={i} className="cap-piece">
                {GLYPH[t]}
              </span>
            ))}
          </span>
        );
      })}
      {lead > 0 && <span className="cap-lead">+{lead}</span>}
    </span>
  );
}

export function formatClock(ms: number) {
  const s = Math.max(0, ms) / 1000;
  if (s < 20) return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function Clock({ ms, active }: { ms: number; active: boolean }) {
  const low = ms < 30000;
  return <div className={`clock ${active ? 'active' : ''} ${low && active ? 'low' : ''}`}>{formatClock(ms)}</div>;
}

export function PlayerCard({
  avatar,
  name,
  rating,
  captured,
  lead,
  capturedColor,
  clockMs,
  clockActive,
  thinking,
  isTurn,
}: {
  avatar: React.ReactNode;
  name: string;
  rating?: string;
  captured: PieceSymbol[];
  lead: number;
  capturedColor: 'w' | 'b';
  clockMs?: number;
  clockActive?: boolean;
  thinking?: boolean;
  isTurn?: boolean;
}) {
  return (
    <div className={`player-card ${isTurn ? 'turn' : ''}`}>
      {avatar}
      <div className="pc-info">
        <div className="pc-name">
          {name} {rating && <span className="pc-rating">({rating})</span>}
          {thinking && (
            <span className="thinking" aria-label="thinking">
              <i />
              <i />
              <i />
            </span>
          )}
        </div>
        <Captured pieces={captured} lead={lead} capturedColor={capturedColor} />
      </div>
      {clockMs !== undefined && <Clock ms={clockMs} active={!!clockActive} />}
    </div>
  );
}

/** The coach talking: avatar + speech bubble. */
export function CoachBubble({ report, text, children }: { report?: MoveReport; text?: string; children?: React.ReactNode }) {
  const info = report ? CLASS_INFO[report.cls] : null;
  return (
    <div className="coach-bubble">
      <CoachAvatar />
      <div className="bubble" key={report ? report.ply + report.uci : text} style={info ? { ['--cls' as string]: info.color } : undefined}>
        {report && info ? (
          <>
            <div className="bubble-head">
              <span className="bubble-glyph">{info.symbol}</span>
              <span className="bubble-title">
                <b>{report.san}</b> is {articleFor(info.label)}
              </span>
            </div>
            <p className="bubble-headline">{report.headline}</p>
            {report.details.length > 0 && (
              <ul className="bubble-details">
                {report.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="bubble-headline">{text}</p>
        )}
        {children}
      </div>
    </div>
  );
}

function articleFor(label: string) {
  if (label === 'Best' || label === 'Book') return `the ${label.toLowerCase()} move`;
  if (label === 'Missed win') return 'a missed win';
  return `${/^[AEIOU]/.test(label) ? 'an' : 'a'} ${label.toLowerCase()}`;
}
