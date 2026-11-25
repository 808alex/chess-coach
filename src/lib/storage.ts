import type { GameSummary } from './review';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem('cc.' + key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function loadArr<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem('cc.' + key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem('cc.' + key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the app still works, it just won't remember */
  }
}

// ---------- Settings ----------
export type Settings = {
  chesscomUser: string;
  depth: number; // coach/review analysis depth
  showEval: boolean;
  lastElo: number;
  sound: boolean;
  volume: number; // 0..1
  boardTheme: string;
  timeControl: string; // id from TIME_CONTROLS
};
const DEFAULT_SETTINGS: Settings = {
  chesscomUser: '',
  depth: 13,
  showEval: true,
  lastElo: 1200,
  sound: true,
  volume: 0.7,
  boardTheme: 'green',
  timeControl: 'none',
};
export const getSettings = () => load('settings', DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => save('settings', s);

// ---------- Games ----------
export type GameRecord = {
  id: string;
  date: string; // ISO
  source: 'coach' | 'match' | 'chesscom' | 'pgn';
  userColor: 'w' | 'b';
  result: 'win' | 'loss' | 'draw' | 'unfinished';
  opponent: string;
  startFen: string;
  ucis: string[];
  opening?: string;
  summary?: GameSummary;
};
export const getGames = () => loadArr<GameRecord>('games');
export function saveGame(g: GameRecord) {
  const all = getGames().filter((x) => x.id !== g.id);
  all.unshift(g);
  save('games', all.slice(0, 200));
}
export function deleteGame(id: string) {
  save(
    'games',
    getGames().filter((g) => g.id !== id),
  );
}

// ---------- Puzzles ----------
export type PuzzleStats = {
  rating: number;
  solved: number;
  failed: number;
  streak: number;
  bestStreak: number;
  themes: Record<string, { ok: number; fail: number }>;
  seen: string[];
  daily: Record<string, number>; // date -> puzzles solved that day
};
const DEFAULT_PUZZLES: PuzzleStats = {
  rating: 1100,
  solved: 0,
  failed: 0,
  streak: 0,
  bestStreak: 0,
  themes: {},
  seen: [],
  daily: {},
};
export const getPuzzleStats = () => load('puzzles', DEFAULT_PUZZLES);
export function recordPuzzle(id: string, puzzleRating: number, themes: string[], ok: boolean) {
  const s = getPuzzleStats();
  // Simple Elo update (K = 24).
  const expected = 1 / (1 + 10 ** ((puzzleRating - s.rating) / 400));
  s.rating = Math.round(s.rating + 24 * ((ok ? 1 : 0) - expected));
  if (ok) {
    s.solved++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    const day = new Date().toISOString().slice(0, 10);
    s.daily[day] = (s.daily[day] ?? 0) + 1;
  } else {
    s.failed++;
    s.streak = 0;
  }
  for (const t of themes) {
    const v = (s.themes[t] ??= { ok: 0, fail: 0 });
    if (ok) v.ok++;
    else v.fail++;
  }
  if (!s.seen.includes(id)) s.seen = [...s.seen.slice(-800), id];
  save('puzzles', s);
  return s;
}

// ---------- Lessons ----------
export type LessonProgress = Record<string, number[]>; // lesson id -> completed step indexes
export const getLessonProgress = () => load<LessonProgress>('lessons', {});
export function markStep(lessonId: string, step: number) {
  const p = getLessonProgress();
  const arr = new Set(p[lessonId] ?? []);
  arr.add(step);
  p[lessonId] = [...arr];
  save('lessons', p);
}

// ---------- Openings ----------
export type OpeningStats = Record<string, { ok: number; fail: number }>;
export const getOpeningStats = () => load<OpeningStats>('openings', {});
export function recordOpening(lineId: string, ok: boolean) {
  const s = getOpeningStats();
  const v = (s[lineId] ??= { ok: 0, fail: 0 });
  if (ok) v.ok++;
  else v.fail++;
  save('openings', s);
}

export function resetAll() {
  for (const k of ['settings', 'games', 'puzzles', 'lessons', 'openings']) localStorage.removeItem('cc.' + k);
}
