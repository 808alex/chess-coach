import type { MoveClass } from '../lib/evalUtil';

const TEXT: Partial<Record<MoveClass, string>> = {
  brilliant: '!!',
  great: '!',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

/** White glyph for a move grade — drawn as SVG so it looks the same everywhere (no emoji). */
export function ClassIcon({ cls }: { cls: MoveClass }) {
  const t = TEXT[cls];
  if (t) return <span className="ci-text">{t}</span>;
  const common = { width: '62%', height: '62%', viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: 3.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (cls === 'best')
    return (
      <svg {...common} stroke="none" fill="#fff">
        <path d="M12 2.8l2.75 5.86 6.4.78-4.72 4.42 1.22 6.34L12 17.1l-5.65 3.1 1.22-6.34L2.85 9.44l6.4-.78z" />
      </svg>
    );
  if (cls === 'excellent' || cls === 'good')
    return (
      <svg {...common}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    );
  if (cls === 'miss')
    return (
      <svg {...common}>
        <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
      </svg>
    );
  // book
  return (
    <svg {...common} strokeWidth={2.4}>
      <path d="M12 6.5C10 5 7 4.6 4 5.2v12.6c3-.6 6-.2 8 1.3 2-1.5 5-1.9 8-1.3V5.2c-3-.6-6-.2-8 1.3z" />
      <path d="M12 6.5v12.6" />
    </svg>
  );
}
