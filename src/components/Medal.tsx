import type { Achievement } from '../lib/achievements';

const TIERS = {
  bronze: ['#e3a671', '#9a5b2e'],
  silver: ['#e8edf2', '#8c98a5'],
  gold: ['#ffe08a', '#c9921b'],
};

/** A round medal with the achievement's glyph. Locked medals are dim and grey. */
export function Medal({ a, unlocked, size = 56 }: { a: Achievement; unlocked: boolean; size?: number }) {
  const [hi, lo] = TIERS[a.tier];
  const id = `m-${a.id}-${unlocked ? 1 : 0}`;
  return (
    <svg className={`medal ${unlocked ? 'on' : 'off'}`} width={size} height={size} viewBox="0 0 56 56" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={unlocked ? hi : '#55524d'} />
          <stop offset="1" stopColor={unlocked ? lo : '#3a3835'} />
        </linearGradient>
      </defs>
      <circle cx="28" cy="28" r="26" fill={`url(#${id})`} />
      <circle cx="28" cy="28" r="21" fill="none" stroke={unlocked ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.08)'} strokeWidth="1.5" />
      <text
        x="28"
        y="29"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={a.glyph.length > 2 ? 14 : a.glyph.length > 1 ? 17 : 22}
        fontWeight="800"
        fill={unlocked ? 'rgba(40,25,5,.85)' : 'rgba(255,255,255,.25)'}
        fontFamily="Figtree, system-ui, sans-serif"
      >
        {a.glyph}
      </text>
    </svg>
  );
}
