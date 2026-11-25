export type BoardTheme = { id: string; name: string; light: string; dark: string; highlight: string };

export const BOARD_THEMES: BoardTheme[] = [
  { id: 'green', name: 'Green', light: '#ebecd0', dark: '#739552', highlight: 'rgba(255, 255, 51, 0.5)' },
  { id: 'walnut', name: 'Walnut', light: '#f0d9b5', dark: '#b58863', highlight: 'rgba(255, 220, 80, 0.5)' },
  { id: 'ice', name: 'Ice', light: '#dee3e6', dark: '#8ca2ad', highlight: 'rgba(120, 200, 255, 0.45)' },
  { id: 'night', name: 'Night', light: '#9aa3b5', dark: '#4b5670', highlight: 'rgba(245, 197, 66, 0.45)' },
  { id: 'coral', name: 'Coral', light: '#f3e1d3', dark: '#d1806b', highlight: 'rgba(255, 240, 110, 0.55)' },
  { id: 'purple', name: 'Amethyst', light: '#e6dcf0', dark: '#8a6fb0', highlight: 'rgba(255, 235, 100, 0.5)' },
];

export const themeById = (id: string) => BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];

export const TIME_CONTROLS = [
  { id: 'none', label: 'No clock', base: 0, inc: 0 },
  { id: '3+2', label: '3 | 2', base: 180, inc: 2 },
  { id: '5+3', label: '5 | 3', base: 300, inc: 3 },
  { id: '10+0', label: '10 min', base: 600, inc: 0 },
  { id: '15+10', label: '15 | 10', base: 900, inc: 10 },
  { id: '30+0', label: '30 min', base: 1800, inc: 0 },
];

/** Opponents with a bit of personality, from beginner to engine. */
export const BOTS = [
  { id: 'tilly', name: 'Tilly', elo: 250, color: '#7cc8a0', blurb: 'Just learned how the pieces move. Loves grabbing things.' },
  { id: 'marco', name: 'Marco', elo: 600, color: '#5aa9e6', blurb: 'Plays fast, hangs pieces, sets the odd trap.' },
  { id: 'juno', name: 'Juno', elo: 900, color: '#b48ef0', blurb: 'Knows the openings, wobbles in the middlegame.' },
  { id: 'rex', name: 'Rex', elo: 1200, color: '#f5a742', blurb: 'Solid club player. Punishes one-move blunders.' },
  { id: 'ivy', name: 'Ivy', elo: 1500, color: '#ef6b5b', blurb: 'Tactical and sharp. Leave a piece loose and it’s gone.' },
  { id: 'kade', name: 'Kade', elo: 1800, color: '#4fc3c7', blurb: 'Strong club level. Plays for small edges.' },
  { id: 'vera', name: 'Vera', elo: 2200, color: '#e05fa3', blurb: 'Expert. You need a real plan to survive.' },
  { id: 'titan', name: 'Titan', elo: 3000, color: '#d9d9d9', blurb: 'Full engine strength. Good luck.' },
];

export function botFor(elo: number) {
  const exact = BOTS.find((b) => b.elo === elo);
  if (exact) return exact;
  return { id: 'custom', name: 'Custom bot', elo, color: '#9aa3b5', blurb: '' };
}
