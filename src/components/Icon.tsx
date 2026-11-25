// Small stroke icon set (24px grid) so buttons look consistent everywhere.
const PATHS: Record<string, string> = {
  shield: 'M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6zM9 12l2 2 4-4',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  eval: 'M6 20V10M12 20V4M18 20v-7',
  first: 'M6 5v14M18 6l-7 6 7 6',
  prev: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  last: 'M18 5v14M6 6l7 6-7 6',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  exit: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
  review: 'M4 19l5-6 4 3 7-9M15 7h5v5',
  rematch: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4',
  flip: 'M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3',
  keyboard: 'M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6',
  fire: 'M12 21c-4 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.4 3.6-8.3.4 1.8 1.6 3 2.7 3.4C11.6 6.6 13 4.2 15 3c-.3 3 1.6 4.5 2.6 6.4.6 1.2.9 2.4.9 3.6C18.5 18.4 16 21 12 21z',
};

export function Icon({ name, size = '1.3em' }: { name: keyof typeof PATHS | string; size?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}
