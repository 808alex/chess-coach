import {
  bestStreak,
  currentStreak,
  getActivity,
  getGames,
  getLessonProgress,
  getOpeningStats,
  getPuzzleStats,
  getUnlocked,
  saveUnlocked,
  type GameRecord,
} from './storage';
import { LESSONS } from '../data/lessons';
import { BOTS } from './themes';

type Data = {
  games: GameRecord[];
  played: GameRecord[]; // games vs the bots
  puzzles: ReturnType<typeof getPuzzleStats>;
  lessonsDone: number;
  drillClean: number;
  streak: number;
  best: number;
};

export type Achievement = {
  id: string;
  name: string;
  desc: string;
  glyph: string; // short text drawn inside the medal
  tier: 'bronze' | 'silver' | 'gold';
  group: 'Games' | 'Bots' | 'Skill' | 'Puzzles' | 'Study' | 'Streaks';
  check: (d: Data) => boolean;
  progress?: (d: Data) => [number, number];
};

const userMoves = (g: GameRecord) => Object.values(g.summary?.counts ?? {}).reduce((a, b) => a + (b ?? 0), 0);
const wins = (d: Data) => d.played.filter((g) => g.result === 'win');

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-game', name: 'First game', desc: 'Finish a game against a bot.', glyph: '1', tier: 'bronze', group: 'Games', check: (d) => d.played.length >= 1 },
  { id: 'first-win', name: 'First win', desc: 'Beat any bot.', glyph: 'W', tier: 'bronze', group: 'Games', check: (d) => wins(d).length >= 1 },
  { id: 'mate', name: 'Checkmate artist', desc: 'Win a game by checkmate.', glyph: '#', tier: 'silver', group: 'Games', check: (d) => wins(d).some((g) => g.endReason === 'checkmate') },
  { id: 'clock', name: 'Beat the clock', desc: 'Win a game with a chess clock on.', glyph: '1:00', tier: 'silver', group: 'Games', check: (d) => wins(d).some((g) => !!g.tc && g.tc !== 'none') },
  { id: 'games-10', name: 'Regular', desc: 'Play 10 games.', glyph: '10', tier: 'bronze', group: 'Games', check: (d) => d.played.length >= 10, progress: (d) => [d.played.length, 10] },
  { id: 'games-50', name: 'Dedicated', desc: 'Play 50 games.', glyph: '50', tier: 'gold', group: 'Games', check: (d) => d.played.length >= 50, progress: (d) => [d.played.length, 50] },
  {
    id: 'night-owl',
    name: 'Night owl',
    desc: 'Finish a game between midnight and 5am.',
    glyph: '☾',
    tier: 'bronze',
    group: 'Games',
    check: (d) => d.played.some((g) => new Date(g.date).getHours() < 5),
  },
  ...BOTS.map(
    (b, i): Achievement => ({
      id: `beat-${b.id}`,
      name: `Beat ${b.name}`,
      desc: `Win against ${b.name} (${b.elo}).`,
      glyph: b.name[0],
      tier: i < 3 ? 'bronze' : i < 6 ? 'silver' : 'gold',
      group: 'Bots',
      check: (d) => wins(d).some((g) => g.botId === b.id || g.opponent.startsWith(`${b.name} (`)),
    }),
  ),
  { id: 'brilliant', name: 'Brilliant!', desc: 'Play a brilliant move.', glyph: '!!', tier: 'gold', group: 'Skill', check: (d) => d.games.some((g) => (g.summary?.counts.brilliant ?? 0) > 0) },
  { id: 'great', name: 'Only move', desc: 'Find a great move — the only good one in the position.', glyph: '!', tier: 'silver', group: 'Skill', check: (d) => d.games.some((g) => (g.summary?.counts.great ?? 0) > 0) },
  {
    id: 'clean',
    name: 'Clean sheet',
    desc: 'Play 20+ moves in a coached game without a mistake or blunder.',
    glyph: '✓',
    tier: 'silver',
    group: 'Skill',
    check: (d) =>
      d.games.some(
        (g) => !!g.summary && userMoves(g) >= 20 && !(g.summary.counts.blunder ?? 0) && !(g.summary.counts.mistake ?? 0) && !(g.summary.counts.miss ?? 0),
      ),
  },
  { id: 'sharp', name: 'Sharpshooter', desc: '90%+ accuracy in a game of 20+ moves.', glyph: '90', tier: 'gold', group: 'Skill', check: (d) => d.games.some((g) => !!g.summary && userMoves(g) >= 20 && g.summary.accuracy >= 90) },
  { id: 'rating-1200', name: 'Club player', desc: 'Get a game rating of 1200+.', glyph: '12', tier: 'bronze', group: 'Skill', check: (d) => d.games.some((g) => (g.summary?.rating?.estimate ?? 0) >= 1200) },
  { id: 'rating-1500', name: 'Tournament ready', desc: 'Get a game rating of 1500+.', glyph: '15', tier: 'silver', group: 'Skill', check: (d) => d.games.some((g) => (g.summary?.rating?.estimate ?? 0) >= 1500) },
  { id: 'rating-1800', name: 'Expert eye', desc: 'Get a game rating of 1800+.', glyph: '18', tier: 'gold', group: 'Skill', check: (d) => d.games.some((g) => (g.summary?.rating?.estimate ?? 0) >= 1800) },
  { id: 'review', name: 'Self-critic', desc: 'Review one of your own games.', glyph: '?', tier: 'bronze', group: 'Skill', check: (d) => d.games.some((g) => (g.source === 'chesscom' || g.source === 'pgn') && !!g.summary) },
  { id: 'puzzles-10', name: 'Puzzler', desc: 'Solve 10 puzzles.', glyph: '10', tier: 'bronze', group: 'Puzzles', check: (d) => d.puzzles.solved >= 10, progress: (d) => [d.puzzles.solved, 10] },
  { id: 'puzzles-50', name: 'Tactician', desc: 'Solve 50 puzzles.', glyph: '50', tier: 'silver', group: 'Puzzles', check: (d) => d.puzzles.solved >= 50, progress: (d) => [d.puzzles.solved, 50] },
  { id: 'puzzles-200', name: 'Pattern machine', desc: 'Solve 200 puzzles.', glyph: '200', tier: 'gold', group: 'Puzzles', check: (d) => d.puzzles.solved >= 200, progress: (d) => [d.puzzles.solved, 200] },
  { id: 'pstreak-5', name: 'Hot hand', desc: 'Solve 5 puzzles in a row.', glyph: '×5', tier: 'bronze', group: 'Puzzles', check: (d) => d.puzzles.bestStreak >= 5, progress: (d) => [d.puzzles.bestStreak, 5] },
  { id: 'pstreak-15', name: 'Unstoppable', desc: 'Solve 15 puzzles in a row.', glyph: '×15', tier: 'gold', group: 'Puzzles', check: (d) => d.puzzles.bestStreak >= 15, progress: (d) => [d.puzzles.bestStreak, 15] },
  { id: 'prating-1500', name: 'Sharp eyes', desc: 'Reach a puzzle rating of 1500.', glyph: '15', tier: 'silver', group: 'Puzzles', check: (d) => d.puzzles.rating >= 1500, progress: (d) => [d.puzzles.rating, 1500] },
  { id: 'lesson-1', name: 'Student', desc: 'Finish every exercise in a lesson.', glyph: '♗', tier: 'bronze', group: 'Study', check: (d) => d.lessonsDone >= 1 },
  {
    id: 'lesson-all',
    name: 'Graduate',
    desc: 'Finish every lesson.',
    glyph: '♕',
    tier: 'gold',
    group: 'Study',
    check: (d) => d.lessonsDone >= lessonsWithTasks(),
    progress: (d) => [d.lessonsDone, lessonsWithTasks()],
  },
  { id: 'drill-10', name: 'Book worm', desc: 'Drill 10 opening lines without a slip.', glyph: '♙', tier: 'silver', group: 'Study', check: (d) => d.drillClean >= 10, progress: (d) => [d.drillClean, 10] },
  { id: 'streak-3', name: 'On a roll', desc: 'Train 3 days in a row.', glyph: '3', tier: 'bronze', group: 'Streaks', check: (d) => d.best >= 3, progress: (d) => [d.streak, 3] },
  { id: 'streak-7', name: 'Week warrior', desc: 'Train 7 days in a row.', glyph: '7', tier: 'silver', group: 'Streaks', check: (d) => d.best >= 7, progress: (d) => [d.streak, 7] },
  { id: 'streak-30', name: 'Habit', desc: 'Train 30 days in a row.', glyph: '30', tier: 'gold', group: 'Streaks', check: (d) => d.best >= 30, progress: (d) => [d.streak, 30] },
];

function lessonsWithTasks() {
  return LESSONS.filter((l) => l.steps.some((s) => s.kind === 'exercise' || s.kind === 'practice')).length;
}

export function collectData(): Data {
  const games = getGames();
  const prog = getLessonProgress();
  const lessonsDone = LESSONS.filter((l) => {
    const tasks = l.steps.map((s, i) => (s.kind === 'exercise' || s.kind === 'practice' ? i : -1)).filter((i) => i >= 0);
    return tasks.length > 0 && tasks.every((i) => prog[l.id]?.includes(i));
  }).length;
  const drillClean = Object.values(getOpeningStats()).reduce((a, v) => a + v.ok, 0);
  const act = getActivity();
  return {
    games,
    played: games.filter((g) => (g.source === 'coach' || g.source === 'match') && g.result !== 'unfinished'),
    puzzles: getPuzzleStats(),
    lessonsDone,
    drillClean,
    streak: currentStreak(act),
    best: bestStreak(act),
  };
}

/** Record any newly earned achievements; returns the new ones (for toasts). */
export function checkAchievements(): Achievement[] {
  const d = collectData();
  const unlocked = getUnlocked();
  const fresh = ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.check(d));
  if (fresh.length) {
    const now = new Date().toISOString();
    for (const a of fresh) unlocked[a.id] = now;
    saveUnlocked(unlocked);
  }
  return fresh;
}
