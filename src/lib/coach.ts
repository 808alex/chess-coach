import { Chess, type Color, type Move, type Square } from 'chess.js';
import type { Analysis, Line, Score } from './engineTypes';
import { flip, moveAccuracy, scoreToCp, winPct, type MoveClass } from './evalUtil';
import {
  NAME,
  VALUE,
  describeNet,
  discoveredTargets,
  forkTargets,
  isDevelopingMove,
  lineTactics,
  loosePieces,
  other,
  playUci,
  pvSwing,
  pvToSan,
  parseUci,
  phaseOf,
  type Loose,
} from './chessUtil';

export type Arrow = { from: string; to: string; color: string };

/** Machine-readable reasons, used for the weakness stats. */
export type Tag =
  | 'allowed-mate'
  | 'missed-mate'
  | 'hung-piece'
  | 'removed-defender'
  | 'ignored-threat'
  | 'allowed-fork'
  | 'allowed-pin'
  | 'allowed-discovery'
  | 'allowed-tactic'
  | 'bad-capture'
  | 'missed-free-piece'
  | 'missed-fork'
  | 'missed-pin'
  | 'missed-discovery'
  | 'missed-tactic'
  | 'opening-principles'
  | 'positional'
  | 'won-material'
  | 'fork'
  | 'saved-piece'
  | 'sacrifice'
  | 'checkmate';

export const TAG_INFO: Partial<Record<Tag, { label: string; lesson?: string; puzzleTheme?: string }>> = {
  'allowed-mate': { label: 'Walked into mate', lesson: 'mating-patterns', puzzleTheme: 'mateIn2' },
  'missed-mate': { label: 'Missed a mate', lesson: 'mating-patterns', puzzleTheme: 'mate' },
  'hung-piece': { label: 'Left a piece hanging', lesson: 'loose-pieces', puzzleTheme: 'hangingPiece' },
  'removed-defender': { label: 'Moved a defender away', lesson: 'loose-pieces', puzzleTheme: 'hangingPiece' },
  'ignored-threat': { label: "Ignored the opponent's threat", lesson: 'blunder-check', puzzleTheme: 'defensiveMove' },
  'allowed-fork': { label: 'Walked into a fork', lesson: 'forks', puzzleTheme: 'fork' },
  'allowed-pin': { label: 'Walked into a pin/skewer', lesson: 'pins-skewers', puzzleTheme: 'pin' },
  'allowed-discovery': { label: 'Walked into a discovered attack', lesson: 'discovered', puzzleTheme: 'discoveredAttack' },
  'bad-capture': { label: 'Captured into a losing exchange', lesson: 'loose-pieces', puzzleTheme: 'hangingPiece' },
  'allowed-tactic': { label: 'Allowed a tactic', lesson: 'blunder-check', puzzleTheme: 'middlegame' },
  'missed-free-piece': { label: 'Missed a free piece', lesson: 'loose-pieces', puzzleTheme: 'hangingPiece' },
  'missed-fork': { label: 'Missed a fork', lesson: 'forks', puzzleTheme: 'fork' },
  'missed-pin': { label: 'Missed a pin/skewer', lesson: 'pins-skewers', puzzleTheme: 'pin' },
  'missed-discovery': { label: 'Missed a discovered attack', lesson: 'discovered', puzzleTheme: 'discoveredAttack' },
  'missed-tactic': { label: 'Missed a tactic', lesson: 'blunder-check', puzzleTheme: 'short' },
  'opening-principles': { label: 'Broke opening principles', lesson: 'after-the-opening' },
  positional: { label: 'Drifted without a plan', lesson: 'finding-a-plan' },
};

export type MoveReport = {
  ply: number; // 0-based index in the game
  color: Color;
  uci: string;
  san: string;
  fenBefore: string;
  fenAfter: string;
  cls: MoveClass;
  winBefore: number; // mover's win% with best play
  winAfter: number; // mover's win% after the played move
  accuracy: number;
  cpLoss: number; // centipawns lost vs the best move (capped), used for the game rating
  evalAfterWhite: Score; // engine score after the move, White's point of view
  bestUci: string;
  bestSan: string;
  bestLine: string;
  replyUci?: string;
  headline: string;
  details: string[];
  tags: Tag[];
  arrows: Arrow[];
};

const GREEN = 'rgba(80, 180, 80, 0.85)';
const RED = 'rgba(230, 70, 60, 0.85)';
const BLUE = 'rgba(70, 140, 220, 0.85)';

const sq = (s: string) => s;
const your = (t: string, s: string) => `your ${t} on ${sq(s)}`;

function lineFor(a: Analysis, uci: string): Line | undefined {
  return a.lines.find((l) => l.move === uci);
}

function joinList(items: string[]) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

function targetName(t: { type: string; square: string }) {
  return t.type === 'k' ? 'king' : `${NAME[t.type as keyof typeof NAME]} on ${t.square}`;
}

type Tactic = { kind: 'fork' | 'pin' | 'skewer' | 'discovered' | 'capture'; text: string };

/** Describe what a single move does tactically (used for engine best moves and replies). */
function tacticOf(fen: string, uci: string): Tactic | null {
  const before = new Chess(fen);
  const after = new Chess(fen);
  const m = playUci(after, uci);
  if (!m) return null;
  const forks = forkTargets(after, m.to);
  if (forks.length >= 2) {
    return { kind: 'fork', text: `${m.san} forks the ${joinList(forks.map(targetName))}` };
  }
  const lines = lineTactics(after, m.to);
  if (lines.length) {
    const l = lines[0];
    if (l.kind === 'pin')
      return {
        kind: 'pin',
        text: `${m.san} pins the ${NAME[l.front.type]} on ${l.front.square} to the ${targetName(l.back)}`,
      };
    return {
      kind: 'skewer',
      text: `${m.san} skewers the ${targetName(l.front)} — when it moves, the ${NAME[l.back.type]} on ${l.back.square} falls`,
    };
  }
  const disc = discoveredTargets(before, after, m);
  if (disc.length) {
    const king = after.findPiece({ type: 'k', color: other(m.color) })[0];
    const checkTxt = after.inCheck() && king && !after.attackers(king, m.color).includes(m.to) ? ' (discovered check)' : '';
    return {
      kind: 'discovered',
      text: `${m.san} moves out of the way and uncovers an attack on the ${joinList(disc.map(targetName))}${checkTxt}`,
    };
  }
  if (m.captured) return { kind: 'capture', text: `${m.san} takes the ${NAME[m.captured]}` };
  return null;
}

function scoreAfterForMover(a: Analysis, b: Analysis | null, uci: string, gameOverAfter: Chess): Score {
  const inA = lineFor(a, uci);
  if (inA) return inA.score;
  if (gameOverAfter.isCheckmate()) return { mate: 1 };
  if (gameOverAfter.isDraw() || gameOverAfter.isStalemate()) return { cp: 0 };
  if (b && b.lines.length) return flip(b.lines[0].score);
  return { cp: 0 };
}

export type JudgeContext = {
  ply: number;
  isBook?: boolean;
  /** Was the previous move by the opponent a mistake that left something to punish? */
};

/**
 * Grade a move and explain it in plain English.
 * `a` = analysis of the position before the move (multipv >= 2 ideally).
 * `b` = analysis of the position after the move (opponent to move), or null if the game ended.
 */
export function judgeMove(fenBefore: string, uci: string, a: Analysis, b: Analysis | null, ctx: JudgeContext): MoveReport {
  const before = new Chess(fenBefore);
  const after = new Chess(fenBefore);
  const mover = before.turn();
  const opp = other(mover);
  const move = playUci(after, uci) as Move;
  const fenAfter = after.fen();

  const best = a.lines[0];
  const second = a.lines[1];
  const bestScore = best ? best.score : { cp: 0 };
  const playedScore = scoreAfterForMover(a, b, uci, after);
  const isBest = !!best && best.move === uci;
  const winBest = winPct(bestScore);
  const winPlayed = isBest ? winBest : winPct(playedScore);
  const loss = Math.max(0, winBest - winPlayed);
  const legalCount = before.moves().length;

  const report: MoveReport = {
    ply: ctx.ply,
    color: mover,
    uci,
    san: move.san,
    fenBefore,
    fenAfter,
    cls: 'good',
    winBefore: winBest,
    winAfter: winPlayed,
    accuracy: moveAccuracy(winBest, winPlayed),
    cpLoss: isBest ? 0 : Math.max(0, capCp(scoreToCp(bestScore)) - capCp(scoreToCp(playedScore))),
    evalAfterWhite: mover === 'w' ? playedScore : flip(playedScore),
    bestUci: best?.move ?? uci,
    bestSan: best ? new Chess(fenBefore).move(parseUci(best.move)).san : move.san,
    bestLine: best ? pvToSan(fenBefore, best.pv, 8) : '',
    replyUci: b?.lines[0]?.move,
    headline: '',
    details: [],
    tags: [],
    arrows: [],
  };

  // ---------- Classification ----------
  const looseAfter = loosePieces(after, mover);
  const sacrificed = looseAfter.filter((l) => VALUE[l.type] >= 3 && after.moves({ verbose: true }).some((mv) => mv.to === l.square));
  const looseBefore = loosePieces(before, mover);
  const isRecapture = !!move.captured && (() => {
    const h = new Chess(fenBefore);
    // If the opponent could have captured on this square already, it's a trade/recapture.
    return h.attackers(move.to, opp).length > 0 && VALUE[move.captured] >= VALUE[move.piece];
  })();

  let cls: MoveClass;
  // Book only for moves that aren't actually bad (trap lines are in opening databases too).
  if (ctx.isBook && loss < 5) cls = 'book';
  else if (isBest || loss < 1) {
    const brilliant =
      sacrificed.length > 0 &&
      !sacrificed.every((s) => looseBefore.some((l) => l.square === s.square && s.square !== move.to)) &&
      winPlayed >= 50 &&
      winBest < 97 &&
      !(after.isCheckmate());
    const onlyMove =
      isBest && !!second && winBest - winPct(second.score) >= 20 && winBest >= 35 && legalCount > 2 && !isRecapture;
    cls = brilliant ? 'brilliant' : onlyMove ? 'great' : isBest ? 'best' : 'excellent';
  } else if (loss < 2.5) cls = 'excellent';
  else if (loss < 5) cls = 'good';
  else if (loss < 10) cls = 'inaccuracy';
  else if (winBest >= 70 && winPlayed >= 35 && loss >= 10) cls = 'miss';
  else if (loss < 20) cls = 'mistake';
  else cls = 'blunder';
  if (after.isCheckmate()) cls = isBest || loss < 1 ? 'best' : cls;
  report.cls = cls;

  const bestArrow: Arrow | null = best ? { from: best.move.slice(0, 2), to: best.move.slice(2, 4), color: GREEN } : null;

  // ---------- Explanations ----------
  const d = report.details;
  const tags = report.tags;

  if (after.isCheckmate()) {
    report.headline = 'Checkmate!';
    tags.push('checkmate');
    return report;
  }

  const good = ['book', 'brilliant', 'great', 'best', 'excellent', 'good'].includes(cls);

  if (good) {
    explainGood(report, before, after, move, a, b, looseBefore, sacrificed, cls);
    return report;
  }

  // Bad move: work out why, most important reason first.
  if (bestArrow) report.arrows.push(bestArrow);
  const reply = b?.lines[0];
  if (reply) report.arrows.push({ from: reply.move.slice(0, 2), to: reply.move.slice(2, 4), color: RED });

  // 1. Walked into mate.
  if (reply?.score.mate !== undefined && reply.score.mate > 0) {
    report.headline = `This allows mate in ${reply.score.mate}.`;
    d.push(`After ${move.san}, your opponent has a forced mate: ${pvToSan(fenAfter, reply.pv, reply.score.mate * 2)}.`);
    d.push('Before every move, check every check your opponent could give next.');
    tags.push('allowed-mate');
    d.push(`Best was ${report.bestSan}.`);
    return report;
  }

  // 2. Missed a mate.
  if (best?.score.mate !== undefined && best.score.mate > 0 && !(playedScore.mate !== undefined && playedScore.mate > 0)) {
    report.headline = `You missed mate in ${best.score.mate}.`;
    d.push(`${pvToSan(fenBefore, best.pv, best.score.mate * 2)} — look at every check first, especially ones near the enemy king.`);
    tags.push('missed-mate');
    return report;
  }

  // 3. What does the opponent's best reply win?
  const bestSwing = best ? pvSwing(fenBefore, best.pv, 10) : null;
  const playedSwing = pvSwing(fenBefore, [uci, ...(reply?.pv ?? [])], 11);

  const lossNet = describeNet({ ...playedSwing, gained: playedSwing.lost, lost: playedSwing.gained, delta: -playedSwing.delta });
  if (reply && playedSwing.delta <= -2 && loss >= 8) {
    const r = new Chess(fenAfter);
    const rm = playUci(r, reply.move)!;
    const net = lossNet;
    const tac = tacticOf(fenAfter, reply.move);
    if (move.captured && rm.captured && rm.to === move.to) {
      report.headline = `Taking on ${move.to} loses material.`;
      d.push(`Count attackers and defenders first: after ${pvToSan(fenBefore, [uci, ...reply.pv], 6)} you end up losing ${net}.`);
      tags.push('bad-capture');
    } else if (rm.captured) {
      const victimSq = rm.to;
      const victim = NAME[rm.captured];
      if (victimSq === move.to) {
        const loose = looseAfter.find((l) => l.square === victimSq);
        report.headline = `Your ${victim} on ${victimSq} is hanging.`;
        d.push(
          loose && !loose.undefended
            ? `It's defended, but ${rm.san} takes it with a ${NAME[rm.piece]}, which is worth less — you lose ${net}.`
            : `Nothing defends it, so ${rm.san} just wins ${net}.`,
        );
        tags.push('hung-piece');
      } else if (wasDefendedBy(fenBefore, victimSq, move.from, mover) && !after.attackers(victimSq, mover).includes(move.to)) {
        report.headline = `You moved a defender away.`;
        d.push(`Your ${NAME[move.piece]} on ${move.from} was protecting ${your(victim, victimSq)}. Now ${rm.san} wins ${net}.`);
        tags.push('removed-defender');
      } else if (looseBefore.some((l) => l.square === victimSq)) {
        report.headline = `You ignored the threat to ${your(victim, victimSq)}.`;
        d.push(`It was already attacked before your move. ${rm.san} now wins ${net}. Always ask "what is he attacking?" first.`);
        tags.push('ignored-threat');
      } else if (tac && tac.kind !== 'capture') {
        report.headline = headlineForTactic(tac.kind, true);
        d.push(`${tac.text}. You lose ${net}.`);
        tags.push(tagForTactic(tac.kind, true));
      } else {
        report.headline = `This loses ${net}.`;
        d.push(`After ${move.san}, ${pvToSan(fenAfter, reply.pv, 6)} wins ${net} for your opponent.`);
        tags.push('allowed-tactic');
      }
    } else if (tac) {
      report.headline = headlineForTactic(tac.kind, true);
      d.push(`${tac.text}. You lose ${net}: ${pvToSan(fenAfter, reply.pv, 6)}.`);
      tags.push(tagForTactic(tac.kind, true));
    } else {
      report.headline = `This loses ${net}.`;
      d.push(`Your opponent's best reply is ${pvToSan(fenAfter, reply.pv, 6)}, winning ${net}.`);
      tags.push('allowed-tactic');
    }
    d.push(`Better was ${report.bestSan}.`);
    return report;
  }

  // 3b. No immediate material loss, but the reply is a real tactic (fork, pin, discovered attack).
  if (reply && loss >= 8) {
    const tac = tacticOf(fenAfter, reply.move);
    if (tac && tac.kind !== 'capture') {
      report.headline = headlineForTactic(tac.kind, true);
      d.push(`${tac.text}. Engine line: ${pvToSan(fenAfter, reply.pv, 6)}.`);
      tags.push(tagForTactic(tac.kind, true));
      d.push(`Better was ${report.bestSan}.`);
      return report;
    }
  }

  // 4. Missed a chance to win material.
  if (best && bestSwing && bestSwing.delta >= 2 && bestSwing.delta - playedSwing.delta >= 2) {
    const tac = tacticOf(fenBefore, best.move);
    const net = describeNet(bestSwing);
    const bm = new Chess(fenBefore).move(parseUci(best.move));
    if (bm.captured && loosePieces(before, opp).some((l) => l.square === bm.to && l.undefended)) {
      report.headline = `You missed a free ${NAME[bm.captured]}.`;
      d.push(`The ${NAME[bm.captured]} on ${bm.to} had no defender — ${bm.san} just wins it.`);
      tags.push('missed-free-piece');
    } else if (tac && tac.kind !== 'capture') {
      report.headline = headlineForTactic(tac.kind, false);
      d.push(`${tac.text}, winning ${net}: ${report.bestLine}.`);
      tags.push(tagForTactic(tac.kind, false));
    } else {
      report.headline = `You missed a way to win ${net}.`;
      d.push(`${report.bestLine}`);
      tags.push(bm.captured ? 'missed-free-piece' : 'missed-tactic');
    }
    return report;
  }

  // 5. No tactic — opening principles or a positional explanation.
  const notes = openingNotes(before, move, ctx.ply);
  if (notes.length) {
    report.headline = notes[0];
    d.push(...notes.slice(1));
    tags.push('opening-principles');
  } else {
    report.headline = cls === 'inaccuracy' ? 'There was something better.' : 'This makes your position worse.';
    tags.push('positional');
  }
  if (best) d.push(positionalHint(fenBefore, best));
  return report;
}

const capCp = (cp: number) => Math.max(-1000, Math.min(1000, cp));

function wasDefendedBy(fen: string, target: Square, defenderSq: Square, color: Color) {
  const c = new Chess(fen);
  return c.attackers(target, color).includes(defenderSq);
}

function headlineForTactic(kind: Tactic['kind'], allowed: boolean) {
  const what = { fork: 'a fork', pin: 'a pin', skewer: 'a skewer', discovered: 'a discovered attack', capture: 'a capture' }[kind];
  return allowed ? `This walks into ${what}.` : `You missed ${what}.`;
}

function tagForTactic(kind: Tactic['kind'], allowed: boolean): Tag {
  const k = kind === 'skewer' ? 'pin' : kind === 'discovered' ? 'discovery' : kind;
  if (k === 'capture') return allowed ? 'allowed-tactic' : 'missed-tactic';
  return `${allowed ? 'allowed' : 'missed'}-${k}` as Tag;
}

function openingNotes(before: Chess, move: Move, ply: number): string[] {
  if (ply > 24) return [];
  const out: string[] = [];
  const color = move.color;
  const backRank = color === 'w' ? '1' : '8';
  const undeveloped = ['b', 'g', 'c', 'f']
    .map((f) => before.get(`${f}${backRank}` as Square))
    .filter((p) => p && p.color === color && (p.type === 'n' || p.type === 'b')).length;
  if (move.piece === 'q' && ply < 14 && !move.captured && undeveloped >= 2) {
    out.push('Early queen move.');
    out.push('Your queen is out while your knights and bishops are still at home. Your opponent can develop with tempo by attacking it.');
  } else if (move.piece === 'k' && !move.san.startsWith('O-O')) {
    out.push('King move that gives up castling.');
    out.push('Moving the king by hand loses your right to castle. Keep it safe and castle instead.');
  } else if (move.piece === 'p' && 'abgh'.includes(move.from[0]) && ply < 16 && undeveloped >= 2) {
    out.push('Edge pawn move in the opening.');
    out.push('Pushing edge pawns does little for the centre and can loosen your king. Develop pieces first.');
  } else if (
    (move.piece === 'n' || move.piece === 'b') &&
    move.from[1] !== backRank &&
    undeveloped >= 2 &&
    ply < 16 &&
    !move.captured
  ) {
    out.push('Same piece twice while others sleep.');
    out.push(`You moved an already developed ${NAME[move.piece]} again while ${undeveloped} minor pieces are still at home.`);
  }
  return out;
}

function positionalHint(fen: string, best: Line): string {
  const c = new Chess(fen);
  const m = c.move(parseUci(best.move));
  const line = pvToSan(fen, best.pv, 6);
  if (m.san.startsWith('O-O')) return `Castling (${m.san}) was the priority — get your king out of the centre. Line: ${line}.`;
  if (isDevelopingMove(m)) return `${m.san} develops a new piece. Line: ${line}.`;
  if (m.piece === 'p' && 'cdef'.includes(m.to[0]) && !m.captured) return `${m.san} fights for the centre. Line: ${line}.`;
  if (m.captured) return `Taking with ${m.san} was better. Line: ${line}.`;
  if (m.san.includes('+')) return `${m.san} keeps the initiative with check. Line: ${line}.`;
  const tac = tacticOf(fen, best.move);
  if (tac) return `${tac.text}. Line: ${line}.`;
  if (m.piece === 'p') return `Best was ${m.san}. Line: ${line}.`;
  return `Best was ${m.san}, improving the ${NAME[m.piece]}. Line: ${line}.`;
}

function explainGood(
  report: MoveReport,
  _before: Chess,
  after: Chess,
  move: Move,
  a: Analysis,
  b: Analysis | null,
  looseBefore: Loose[],
  sacrificed: Loose[],
  cls: MoveClass,
) {
  const d = report.details;
  const tags = report.tags;
  const reply = b?.lines[0];
  const swing = pvSwing(report.fenBefore, [report.uci, ...(reply?.pv ?? [])], 11);
  const tac = tacticOf(report.fenBefore, report.uci);
  const forMe = flip(reply?.score ?? { cp: 0 });

  const headlines: Record<string, string> = {
    book: 'Book move.',
    brilliant: 'Brilliant!',
    great: 'Great — the only good move.',
    best: 'Best move.',
    excellent: 'Excellent.',
    good: 'Good move.',
  };
  report.headline = headlines[cls];

  if (cls === 'brilliant' && sacrificed.length) {
    const s = sacrificed[0];
    d.push(`You offered your ${NAME[s.type]} on ${s.square} — and it works: ${pvToSan(report.fenAfter, reply?.pv ?? [], 6)}.`);
    tags.push('sacrifice');
  }
  if (cls === 'great') {
    const second = a.lines[1];
    d.push(`Every other move was much worse${second ? ` (the next best, ${new Chess(report.fenBefore).move(parseUci(second.move)).san}, throws away most of the advantage)` : ''}.`);
  }
  if (forMe.mate !== undefined && forMe.mate > 0) {
    d.push(`You have mate in ${forMe.mate}: ${pvToSan(report.fenAfter, reply?.pv ?? [], forMe.mate * 2)}. Find it!`);
  }
  if (swing.delta >= 2 && !swing.mate) {
    d.push(`You win ${describeNet(swing)}.`);
    tags.push('won-material');
  }
  if (tac && (tac.kind === 'fork' || tac.kind === 'pin' || tac.kind === 'skewer' || tac.kind === 'discovered')) {
    d.push(`${tac.text}.`);
    if (tac.kind === 'fork') tags.push('fork');
  }
  const savedNow = looseBefore.filter((l) => !loosePieces(after, move.color).some((x) => x.square === l.square));
  if (savedNow.length && !move.captured) {
    const s = savedNow[0];
    const where = s.square === move.from ? `${NAME[s.type]} (it was on ${s.square})` : `${NAME[s.type]} on ${s.square}`;
    d.push(`Good blunder check — you dealt with the threat to your ${where}.`);
    tags.push('saved-piece');
  }
  if (move.san.startsWith('O-O') && !d.length) d.push('King safe, rook connected. Now bring your remaining pieces into play.');
  if (isDevelopingMove(move) && !d.length) d.push('Developing a new piece — exactly what you want early on.');
  if (!d.length && cls !== 'book') {
    if (report.bestUci !== report.uci) d.push(`Also fine was ${report.bestSan}.`);
    else if (reply) d.push(`Expected reply: ${pvToSan(report.fenAfter, reply.pv, 4)}.`);
  }
  if (reply && cls !== 'book') report.arrows.push({ from: reply.move.slice(0, 2), to: reply.move.slice(2, 4), color: BLUE });
}

/** Static "blunder check" for the side about to move: what is under attack and what checks does the opponent have? */
export function threatReport(fen: string): { lines: string[]; squares: string[] } {
  const c = new Chess(fen);
  const me = c.turn();
  const lines: string[] = [];
  const squares: string[] = [];
  if (c.inCheck()) lines.push('You are in check — deal with it first.');
  for (const l of loosePieces(c, me)) {
    const by = l.attackers.map((s) => NAME[c.get(s)!.type]).join(', ');
    lines.push(
      `${your(NAME[l.type], l.square)} is attacked by ${by}${l.undefended ? ' and not defended' : ` and defended, but a cheaper ${NAME[l.cheapest]} attacks it`}.`,
    );
    squares.push(l.square);
  }
  // Opponent's checks if it were their move.
  const parts = fen.split(' ');
  if (!c.inCheck()) {
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    parts[3] = '-';
    try {
      const o = new Chess(parts.join(' '));
      const checks = o.moves({ verbose: true }).filter((m) => m.san.includes('+') || m.san.includes('#'));
      const mates = checks.filter((m) => m.san.includes('#'));
      if (mates.length) lines.push(`Danger: your opponent threatens mate with ${mates.map((m) => m.san).join(', ')}.`);
      else if (checks.length) lines.push(`Checks your opponent could give: ${checks.slice(0, 6).map((m) => m.san).join(', ')}.`);
    } catch {
      /* illegal flipped position — skip */
    }
  }
  const mine = loosePieces(c, other(me));
  if (mine.length) {
    lines.push(`Targets for you: ${mine.map((l) => `the ${NAME[l.type]} on ${l.square}`).join(', ')}${mine.some((l) => l.undefended) ? ' (some are undefended!)' : ''}.`);
  }
  if (!lines.length) lines.push('Nothing of yours is under attack and your opponent has no checks. Look for a plan.');
  return { lines, squares };
}

export function phaseLabel(fen: string) {
  return phaseOf(new Chess(fen));
}
