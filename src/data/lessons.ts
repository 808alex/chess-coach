// Theory lessons. Positions are given either as a FEN or as moves from the start position.
// Every exercise is checked against Stockfish by tools/verify-content.ts.

export type Start = { moves: string } | { fen: string };

export type LessonStep =
  | { kind: 'text'; md: string }
  | {
      kind: 'board';
      start: Start;
      caption: string;
      line?: string; // SAN moves to step through from the start position
      arrows?: [string, string][];
      highlight?: string[];
    }
  | {
      kind: 'exercise';
      start: Start;
      prompt: string;
      goal: 'mate' | 'material' | 'best';
      solution: string; // reference SAN line (solver and opponent moves)
      explain: string;
      hint?: string;
      minGain?: number;
      tolerance?: number; // win% loss allowed for "best" goals
    }
  | { kind: 'practice'; theme: string; count: number; text: string }
  | { kind: 'play'; start: Start; text: string; elo: number; userColor: 'w' | 'b'; label: string };

export type Lesson = {
  id: string;
  title: string;
  group: 'Thinking' | 'Tactics' | 'Middlegame' | 'Endgame';
  summary: string;
  steps: LessonStep[];
};

export const LESSONS: Lesson[] = [
  {
    id: 'blunder-check',
    title: 'The Blunder Check',
    group: 'Thinking',
    summary: 'The one habit that gains the most rating: what changed, what is attacked, what can he do next?',
    steps: [
      {
        kind: 'text',
        md: `At 1000–1500, games are not decided by deep strategy. They are decided by **who hangs a piece or misses a tactic first**. A player who never blunders but plays simple moves beats most of the pool.

The fix is a routine you run **every single move**. It takes ten seconds once it's a habit.

### Step 1 — After his move: what changed?
- What does the piece that just moved **attack now**?
- What did it **stop defending**?
- Did it **open a line** for another piece (a bishop, rook or queen behind it)?

### Step 2 — Checks, captures, threats (CCT) for HIM
Imagine it's his move again. List every **check** he has, every **capture**, and every **threat** (a move that attacks something undefended or bigger). This is where forks and mates come from.

### Step 3 — Checks, captures, threats for YOU
Now look at your own forcing moves first. A free piece or a mate beats any plan.

### Step 4 — Before you let go of the piece
Picture your move on the board and run Step 2 again. *"After this, what are his checks and captures?"* This one catches most blunders.`,
      },
      {
        kind: 'exercise',
        start: { moves: 'e4 e5 Bc4 Nc6 Qh5' },
        prompt: 'Black to move. White just played Qh5. Run the blunder check: what is White threatening? Find a move that stops it.',
        goal: 'best',
        tolerance: 6,
        solution: 'g6',
        hint: 'Count the attackers on f7: queen and bishop. Defenders: only the king.',
        explain:
          'Qh5 + Bc4 both hit f7: Qxf7 would be mate. ...g6 blocks the queen and attacks it, gaining time. ...Qe7 also defends f7. Never play ...Nf6?? here — it attacks the queen but ignores the mate.',
      },
      {
        kind: 'exercise',
        start: { moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5' },
        prompt: 'Black to move. White’s knight jumped to g5. What does it attack, and what is the best reply?',
        goal: 'best',
        tolerance: 6,
        solution: 'd5',
        hint: 'f7 is attacked twice. Blocking the bishop’s diagonal is the classical answer.',
        explain:
          'Knight and bishop both attack f7. ...d5! blocks the bishop and fights back in the centre. The tempting ...h6?? lets Nxf7 fork your queen and rook — exactly the kind of move the blunder check catches.',
      },
      {
        kind: 'exercise',
        start: { moves: 'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5' },
        prompt: 'Black to move. White grabbed the e5 pawn and left something loose. Find the strongest reply.',
        goal: 'best',
        tolerance: 5,
        solution: 'Qg5',
        hint: 'Look for a queen move that attacks two things at once.',
        explain:
          '...Qg5! attacks the knight on e5 AND the g2 pawn (with Rh1 behind it). If White gets greedy with Nxf7, then ...Qxg2 and the white king gets mated quickly. This is the trap behind 3...Nd4: White "won a pawn" without running Step 4.',
      },
      {
        kind: 'text',
        md: `### Make it automatic
In **Play → Coach mode** there is a **Blunder check** button. It runs Steps 2 and 3 for you and lists what's attacked and which checks your opponent has. Use it a lot at first, then try to say the answer *before* you press it.`,
      },
      { kind: 'practice', theme: 'hangingPiece', count: 5, text: 'Five positions where something is left loose. Spot it.' },
    ],
  },
  {
    id: 'loose-pieces',
    title: 'Loose Pieces Drop Off',
    group: 'Tactics',
    summary: 'Counting attackers and defenders, and why undefended pieces are where tactics start.',
    steps: [
      {
        kind: 'text',
        md: `**LPDO — Loose Pieces Drop Off.** Almost every tactic (fork, skewer, discovered attack) works because at least one piece is **undefended** or **defended by too little**.

### Counting
For any piece that's attacked:
1. Count **attackers** and **defenders**.
2. If attackers > defenders, it can be won.
3. **Even if the numbers are equal**, check the *values*: if a pawn attacks your knight, the knight is lost no matter how many defenders it has.

### Habits that save pieces
- Keep pieces **defended**, ideally by pawns.
- Every time you move a piece, ask *"what was this piece defending?"* Moving a defender away is one of the most common blunders.
- Pieces in the middle of the board with no defender are targets for **forks**.`,
      },
      {
        kind: 'exercise',
        start: { moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 Nxe5' },
        prompt: 'Black to move. White traded on c6 and took the e5 pawn. Is that pawn really gone?',
        goal: 'best',
        tolerance: 5,
        solution: 'Qd4',
        hint: 'Your queen can attack two loose things at once.',
        explain:
          '...Qd4! hits the knight on e5 and the pawn on e4. White can’t defend both, so Black wins the pawn back. That’s why in the Ruy Exchange White castles first — Nxe5 only works once e4 is safe.',
      },
      {
        kind: 'exercise',
        start: { moves: 'e4 e5 Nf3 Nf6 Nxe5 Nxe4 Qe2 Nf6' },
        prompt: 'White to move. Black copied your knight move without checking. Find the win.',
        goal: 'material',
        minGain: 5,
        solution: 'Nc6+',
        hint: 'Your knight is in front of your queen on the e-file. What happens if it moves with a threat?',
        explain:
          'Nc6+! The knight moves off the e-file, so your queen on e2 gives check — and the knight itself attacks the queen on d8. Black must answer the check, then you take the queen. Black’s knight on f6 was a loose piece that left the e-file open.',
      },
      { kind: 'practice', theme: 'hangingPiece', count: 6, text: 'Win the loose piece.' },
    ],
  },
  {
    id: 'forks',
    title: 'Forks',
    group: 'Tactics',
    summary: 'One piece, two targets. Knight forks, queen forks and the pawn fork trick.',
    steps: [
      {
        kind: 'text',
        md: `A **fork** is one move that attacks two (or more) things. Your opponent can only save one.

The best targets are the **king** (check forces a reply), the **queen**, **rooks**, and **undefended pieces**.

### How to find forks
1. Look for two valuable enemy pieces that are a **knight's jump** apart from a common square — that's a knight fork waiting.
2. Pawns fork too: two pieces side by side on the rank in front of your pawn.
3. Queens fork on lines: a check that also hits a loose piece.`,
      },
      {
        kind: 'exercise',
        start: { fen: 'r3k3/pp3ppp/8/1N6/8/8/PPP2PPP/4K3 w - - 0 1' },
        prompt: 'White to move. Find the knight fork.',
        goal: 'material',
        minGain: 2,
        solution: 'Nc7+ Kd7 Nxa8',
        explain: 'Nc7+ checks the king and attacks the rook on a8. After the king moves, Nxa8 wins the rook.',
      },
      {
        kind: 'exercise',
        start: { moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 h6' },
        prompt: 'White to move. Black ignored the threat to f7. Punish it.',
        goal: 'material',
        minGain: 2,
        solution: 'Nxf7 Qe7 Nxh8',
        explain: 'Nxf7 takes a pawn and forks the queen on d8 and the rook on h8. Black loses the exchange at least.',
      },
      {
        kind: 'board',
        start: { moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Nc3' },
        caption:
          'The "fork trick". With White’s bishop on c4 and knight on c3, Black can play 4...Nxe4! 5.Nxe4 d5 — the pawn forks bishop and knight, so Black wins the piece back with a great centre. Step through it. This is why, in your Ruy Lopez, you should check that e4 is defended before playing Nc3 moves on autopilot.',
        line: 'Nxe4 Nxe4 d5 Bd3 dxe4 Bxe4',
      },
      {
        kind: 'exercise',
        start: { moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Nc3' },
        prompt: 'Black to move. Use the fork trick.',
        goal: 'best',
        tolerance: 5,
        solution: 'Nxe4 Nxe4 d5',
        hint: 'Take on e4 first. Which pawn move then attacks two white pieces?',
        explain: '...Nxe4! looks like it hangs the knight, but after Nxe4, ...d5 forks the bishop on c4 and the knight on e4. You win the piece back.',
      },
      {
        kind: 'exercise',
        start: { fen: '4k3/pp3ppp/8/8/7b/8/PP3PPP/3Q2K1 w - - 0 1' },
        prompt: 'White to move. Find the queen fork.',
        goal: 'material',
        minGain: 3,
        solution: 'Qa4+ Kf8 Qxh4',
        hint: 'A check on a diagonal that also looks along a rank.',
        explain: 'Qa4+ checks the king along the a4–e8 diagonal and attacks the loose bishop on h4 along the 4th rank. Whatever Black does about the check, Qxh4 wins the bishop. Note why it works: a bishop can’t hit back along a rank. (If it had been a rook on h4, Qa4+?? would hang the queen to ...Rxa4!)',
      },
      { kind: 'practice', theme: 'fork', count: 6, text: 'Find the fork.' },
    ],
  },
  {
    id: 'pins-skewers',
    title: 'Pins & Skewers',
    group: 'Tactics',
    summary: 'Line tactics with bishops, rooks and queens — and the pin that isn’t really a pin.',
    steps: [
      {
        kind: 'text',
        md: `A **pin**: a piece can't move (or shouldn't) because something more valuable is behind it.
- **Absolute pin**: the king is behind — the piece legally cannot move.
- **Relative pin**: the queen or a rook is behind — it *can* move, but you lose the bigger piece.

A **skewer** is a pin in reverse: the **bigger** piece is in front. It must move, and the piece behind falls.

### Using pins
- **Pile up** on the pinned piece: attack it again, especially with a pawn.
- Relative pins can be broken — always check whether the "pinned" piece can move with a **bigger threat** (like a check or capture of the queen).`,
      },
      {
        kind: 'exercise',
        start: { fen: '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1' },
        prompt: 'White to move. Win the queen with a skewer.',
        goal: 'material',
        minGain: 8,
        solution: 'Re1+ Kd4 Rxe8',
        explain: 'Re1+ checks the king on the e-file. The king must step aside, and Rxe8 picks up the queen behind it.',
      },
      {
        kind: 'exercise',
        start: { moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5 Nxd5' },
        prompt: 'Black to move (this is your Queen’s Gambit setup). White thinks your f6 knight is pinned and grabbed d5. Is it?',
        goal: 'material',
        minGain: 2,
        solution: 'Nxd5 Bxd8 Bb4+ Qd2 Bxd2+ Kxd2 Kxd8',
        hint: 'The knight is only pinned to the queen. What if you give a check after White takes your queen?',
        explain:
          'The Elephant Trap. ...Nxd5! If Bxd8, then ...Bb4+ forces Qd2 Bxd2+ Kxd2 Kxd8 and you are a piece up. A relative pin is not a real pin when you have a bigger threat.',
      },
      {
        kind: 'board',
        start: { moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 d4 b5 Bb3 Nxd4 Nxd4 exd4' },
        caption:
          'Warning for YOUR Ruy Lopez — the Noah’s Ark trap. If White recaptures 8.Qxd4??, then ...c5! 9.Qd5 Be6 10.Qc6+ Bd7 11.Qd5 c4 traps the b3 bishop with pawns. Step through it. (Better for White is 8.Bd5 or 8.c3.)',
        line: 'Qxd4 c5 Qd5 Be6 Qc6+ Bd7 Qd5 c4',
      },
      { kind: 'practice', theme: 'pin', count: 5, text: 'Pins and skewers.' },
    ],
  },
  {
    id: 'discovered',
    title: 'Discovered Attacks',
    group: 'Tactics',
    summary: 'Move one piece, attack with the one behind it. The strongest tactic on the board.',
    steps: [
      {
        kind: 'text',
        md: `A **discovered attack** happens when a piece moves out of the way and **uncovers** an attack by a piece behind it (bishop, rook or queen).

It's so strong because you get **two threats in one move**: the moving piece can threaten something, and the uncovered piece threatens something else. If the uncovered piece gives **check**, the moving piece can go almost anywhere — even capture the queen.

### Spot them
Look for your bishops, rooks and queen lined up with an enemy piece (especially the king or queen) **with one of your own pieces in between**. That piece in between is a loaded gun.`,
      },
      {
        kind: 'exercise',
        start: { moves: 'e4 e5 Nf3 Nf6 Nxe5 Nxe4 Qe2 Nf6' },
        prompt: 'White to move. Your queen and the black king are on the same file with your knight in between. Fire!',
        goal: 'material',
        minGain: 5,
        solution: 'Nc6+',
        explain: 'Nc6+! The knight moves away and your queen on e2 gives check. At the same time the knight attacks the queen on d8. Black must answer the check, and you take the queen.',
      },
      { kind: 'practice', theme: 'discoveredAttack', count: 5, text: 'Discovered attacks.' },
    ],
  },
  {
    id: 'mating-patterns',
    title: 'Mating Patterns',
    group: 'Tactics',
    summary: 'Back rank, queen + bishop battery, smothered mate, the ladder and Légal’s mate.',
    steps: [
      {
        kind: 'text',
        md: `You don't calculate mates from scratch — you **recognise patterns**. Learn these and you'll see them in your games.

### Back-rank mate
A king behind its own unmoved pawns gets mated by a rook or queen on the back rank. **Defence**: give your king air with h3/h6 at a quiet moment.`,
      },
      {
        kind: 'exercise',
        start: { fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1' },
        prompt: 'White to move. Mate in one.',
        goal: 'mate',
        solution: 'Rd8#',
        explain: 'Rd8#. The king is boxed in by its own pawns.',
      },
      {
        kind: 'text',
        md: `### Queen + bishop battery on h7
A bishop on d3 (or the b1–h7 diagonal) and a queen landing on h7. Very common after the opponent castles and moves the f6 knight away.`,
      },
      {
        kind: 'exercise',
        start: { fen: 'r1b2rk1/ppp2ppp/2n5/3q3Q/8/3B4/PPP2PPP/R3K2R w KQ - 0 1' },
        prompt: 'White to move. Mate in one.',
        goal: 'mate',
        solution: 'Qxh7#',
        explain: 'Qxh7#. The bishop on d3 protects the queen; the rook on f8 and pawn on f7 block the king’s escape.',
      },
      {
        kind: 'text',
        md: `### Smothered mate
A knight mates a king surrounded by its own pieces. The classic finish: sacrifice the queen to force a rook into the last escape square.`,
      },
      {
        kind: 'exercise',
        start: { fen: 'r6k/6pp/7N/8/8/1Q6/6PP/7K w - - 0 1' },
        prompt: 'White to move. Mate in two.',
        goal: 'mate',
        solution: 'Qg8+ Rxg8 Nf7#',
        hint: 'Force the rook to g8.',
        explain: 'Qg8+!! The king can’t take because your knight on h6 guards g8, so the rook must take: ...Rxg8. Then Nf7# — the king is smothered by its own rook and pawns.',
      },
      {
        kind: 'text',
        md: `### The ladder (two heavy pieces)
Two rooks (or rook + queen) take turns cutting the king off rank by rank. You'll use this in the endgame all the time.`,
      },
      {
        kind: 'exercise',
        start: { fen: '6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1' },
        prompt: 'White to move. Mate in two.',
        goal: 'mate',
        solution: 'Ra7 Kf8 Rb8#',
        explain: 'One rook takes away the 7th rank, the other mates on the 8th. Rb7 followed by Ra8# works too.',
      },
      {
        kind: 'board',
        start: { moves: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6' },
        caption:
          'Légal’s mate. White plays Nxe5!, "leaving" the queen to the pinning bishop. If Black takes the queen: Bxf7+ Ke7 Nd5#. Step through it. Lesson: a pin to the queen is only relative.',
        line: 'Nxe5 Bxd1 Bxf7+ Ke7 Nd5#',
      },
      { kind: 'practice', theme: 'mate', count: 6, text: 'Find the mate.' },
    ],
  },
  {
    id: 'after-the-opening',
    title: 'After the Opening: What Now?',
    group: 'Middlegame',
    summary: 'Your exact problem: the moves run out. A step-by-step way to choose a move in the middlegame.',
    steps: [
      {
        kind: 'text',
        md: `The opening is "done" when your pieces are out and your king is castled. From here, nobody hands you moves. Use this **order of questions** — the earlier ones win more games.

### 1. Safety (the blunder check)
Is anything of mine hanging? What are his checks, captures, threats? Deal with those first.

### 2. Forcing moves for me
Checks, captures, threats. A free piece or a fork beats any plan. **Should you fork, check, or grab loose pieces?** Whatever *wins material by force* — check them all, don't pick one by habit.

### 3. Finish the job
Castled? Rooks connected? Any piece still at home? Development before attack.

### 4. Find a target
- A **loose piece** (undefended)
- A **weak pawn** (can't be defended by another pawn — isolated, backward, doubled)
- A **weak king** (fewer pawns in front, open lines nearby)
- A **hole** — a square his pawns can never attack again. Put a knight there.

### 5. Improve your worst piece
If there's no target, find your **least active piece** and give it a better square. A bishop staring at its own pawns, a knight on the rim, a rook on a closed file.

### 6. Pawn breaks
Pawns decide where the play is. Push a pawn to **open lines** where your pieces are better (in your Ruy Lopez: **c3 + d4**, or **f4** later).

"Should I just attack?" Only attack where you have **more pieces than he has defenders**. Otherwise improve first, then attack.`,
      },
      {
        kind: 'board',
        start: { fen: 'r1bqkb1r/2pp1ppp/p1n2n2/1p2p3/4P3/1BN2N2/PPPP1PPP/R1BQK2R b KQkq - 1 6' },
        caption:
          'Your screenshot position (Black to move). Use the questions: nothing of yours is loose; Black has no checks. Your bishop on b3 is aimed at f7 — that is a TARGET. Your king still needs castling, and your c-pawn is blocked by the knight, so your break will be d3–d4 or a4 (hitting b5) rather than c3.',
        arrows: [
          ['b3', 'f7'],
          ['a2', 'a4'],
          ['c3', 'd5'],
        ],
      },
      {
        kind: 'exercise',
        start: { moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 Nc3 b5 Bb3 Be7' },
        prompt: 'White to move (Black played the solid ...Be7). Pick a good plan move: secure your centre, get your king safe, or start pressure on b5.',
        goal: 'best',
        tolerance: 6,
        solution: 'd3',
        explain:
          'Several moves are good here: d3 (protect e4 so your knights are free), O-O, a4 (hit the b5 pawn) or Nd5. What you should NOT do is attack before castling — Ng5?! hits f7 once, but ...O-O defends it and your knight is just misplaced.',
      },
      {
        kind: 'exercise',
        start: { moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5' },
        prompt: 'White to move. Development is done, the king is safe. What is the pawn break your whole setup was preparing?',
        goal: 'best',
        tolerance: 5,
        solution: 'd4',
        explain: 'd4! c3 and h3 were played exactly for this. It grabs the centre and opens lines for your pieces. This is "the plan" of the Ruy Lopez.',
      },
      { kind: 'practice', theme: 'middlegame', count: 5, text: 'Middlegame positions: run the questions, then find the move.' },
    ],
  },
  {
    id: 'finding-a-plan',
    title: 'Finding a Plan from the Pawns',
    group: 'Middlegame',
    summary: 'Pawn structure tells you where to play. Open centre, closed centre, space and weak squares.',
    steps: [
      {
        kind: 'text',
        md: `Pieces move fast; **pawns stay**. So the pawn structure is the most reliable guide to a plan.

### Closed centre (pawns locked, e.g. your French/Caro Advance)
- **Play where your pawns point.** Pawn on e5 points to the kingside → attack the kingside (f4–f5, g4, pieces towards the king).
- Your opponent will play on the other side. It becomes a race — be faster.

### Open centre (central pawns traded)
- **Development and king safety rule.** Rooks to open files. Whoever has more active pieces wins.
- Don't start pawn storms in front of your own king.

### Space
- If you have more space, **avoid trades** — your opponent's pieces are cramped and trading helps them breathe.
- If you're cramped, **trade pieces** and look for a freeing break (like ...d5 or ...c5 as Black).

### Weak squares (holes)
A square that no enemy pawn can ever attack is a home for your knight. A knight on d5 or f5 (as White) supported by a pawn can be worth a rook.`,
      },
      {
        kind: 'board',
        start: { moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Be2 cxd4 cxd4 Nge7 Na3' },
        caption: 'French Advance (from your repertoire). Your e5 pawn points at the kingside — your attack goes there. Black attacks d4 and plays on the queenside. Your job: keep d4 solid, then go kingside.',
        arrows: [
          ['e5', 'f6'],
          ['d4', 'e5'],
        ],
      },
      {
        kind: 'exercise',
        start: { moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 Nc3 b5 Bb3 Be7 d3 d6 a4 b4' },
        prompt: 'White to move. Your knight is attacked. Where does it want to go anyway?',
        goal: 'best',
        tolerance: 5,
        solution: 'Nd5',
        explain: 'Nd5! The knight lands on a hole in Black’s camp. It attacks f6 (Black’s best kingside defender) and e7, and no pawn can easily kick it.',
      },
      {
        kind: 'play',
        start: { moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Be2 cxd4 cxd4 Nge7 Na3' },
        elo: 1300,
        userColor: 'w',
        label: 'Play the French Advance plan',
        text: 'Play this position against a 1300 bot with the coach on. Keep d4 safe, castle, and go after the kingside.',
      },
    ],
  },
  {
    id: 'attacking-the-king',
    title: 'Attacking the King',
    group: 'Middlegame',
    summary: 'When to attack, how to open lines, removing defenders and the Greek gift.',
    steps: [
      {
        kind: 'text',
        md: `"How do I really cause damage?" — by attacking the king **correctly**:

### The attack checklist
1. **Count**: are more of my pieces near his king than his defenders? If not, bring more first. Pawns alone don't mate.
2. **Open lines**: an attack needs open files/diagonals toward the king. Pawn breaks (f4–f5, h4–h5) and sacrifices open them.
3. **Remove the defenders**: the knight on f6 (f3 for White) is the key defender of a castled king. Trade it off or chase it away (e5 push, Bxf6, Nd5).
4. **Bring the queen last**: an early queen gets chased. Once lines are open and pieces are close, the queen finishes.
5. **Forcing moves**: checks and captures first in every calculation.

### Don't
- Attack with one or two pieces and leave the rest at home.
- Push pawns in front of **your own** king to attack his.`,
      },
      {
        kind: 'exercise',
        start: { fen: 'r1bq1rk1/pppn1ppp/1bn1p3/3pP3/3P4/2PB1N2/PP3PPP/RNBQ1RK1 w - - 0 1' },
        prompt: 'White to move. Black’s king has no knight on f6 to defend h7. Classic sacrifice time.',
        goal: 'best',
        tolerance: 8,
        solution: 'Bxh7+ Kxh7 Ng5+ Kg8 Qh5',
        hint: 'The "Greek gift": bishop takes on h7 with check, knight jumps to g5, queen comes to h5.',
        explain:
          'Bxh7+! Kxh7 Ng5+ and the queen joins with Qh5 (or Qd3+ / Qg4 if the king steps to g6). Conditions for the Greek gift: bishop on d3, a knight that can reach g5, a queen that can reach h5, no black knight on f6, and no black bishop that can take on g5. Here Black’s bishop is on b6, so it can’t. (Ng5 first, threatening Bxh7, is also very strong.)',
      },
      {
        kind: 'exercise',
        start: { moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 Nc3 b5 Bb3 Be7 d3 d6 a4 b4 Nd5 O-O O-O Na5' },
        prompt: 'White to move. Black attacked your b3 bishop. Remove a defender of the black king first — what does it?',
        goal: 'best',
        tolerance: 6,
        solution: 'Nxe7+',
        explain:
          'Trading on e7 or f6 removes a defender. Here Nxe7+ wins the bishop pair with check, and the b3 bishop can still retreat to a2 next. Keeping your pieces and removing his defenders = attack.',
      },
      { kind: 'practice', theme: 'mateIn2', count: 5, text: 'Finish the attack.' },
    ],
  },
  {
    id: 'trading',
    title: 'When to Trade (and When Not To)',
    group: 'Middlegame',
    summary: 'Trades change everything. Simple rules for deciding.',
    steps: [
      {
        kind: 'text',
        md: `Every trade changes the position. Ask **"who does this trade help?"**

### Trade when…
- **You're ahead in material.** Trade pieces (not pawns). Up a knight with 4 pieces each is complicated; up a knight with 1 piece each is easy.
- **You're defending** against an attack. Trade his attacking pieces, especially the queen.
- You can trade your **bad piece** for his **good piece** (e.g. your blocked bishop for his active knight).
- You're **cramped**: trades give your pieces room.

### Avoid trades when…
- **You're behind** in material: keep pieces on and look for chances.
- **You're attacking**: every trade removes an attacker.
- You have **more space**: let him stay cramped.

### Recapturing
When you recapture, prefer the recapture that **develops** a piece or **keeps your pawns healthy** (towards the centre). Don't automatically recapture with the queen.`,
      },
      {
        kind: 'play',
        start: { fen: 'r1bqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
        elo: 1100,
        userColor: 'w',
        label: 'Knight odds: trade down',
        text: 'Black starts without the b8 knight. You are a piece up from move one. Trade pieces whenever it is safe and convert it into a won endgame.',
      },
    ],
  },
  {
    id: 'converting',
    title: 'Converting a Winning Position',
    group: 'Middlegame',
    summary: 'You won a piece — now don’t throw it back. How to finish games.',
    steps: [
      {
        kind: 'text',
        md: `Many 1200 players win a piece and then lose the game. Winning positions need a different mindset:

1. **Safety first.** You don't need brilliance. Blunder-check *more* carefully, not less.
2. **Kill counterplay.** What is his only hope? (A check, a passed pawn, a mating idea.) Stop it.
3. **Trade pieces, not pawns.** Each trade makes your extra piece count more.
4. **Activate everything.** Bring the last piece into play before going for the kill.
5. **Make a passed pawn** and push it with your pieces behind it, or go for mate if it's simple.
6. **Know your mates**: K+Q vs K and K+R vs K must be automatic. Practice them below.`,
      },
      {
        kind: 'play',
        start: { fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1' },
        elo: 3000,
        userColor: 'w',
        label: 'Mate with K+Q vs K',
        text: 'Queen + king vs king. Use the queen to shrink the box (a knight’s move away from the king), bring your king up, then mate. Watch out for stalemate!',
      },
      {
        kind: 'play',
        start: { fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1' },
        elo: 3000,
        userColor: 'w',
        label: 'Mate with K+R vs K',
        text: 'Rook + king vs king. Cut the king off with the rook, bring your king opposite his, and push him to the edge.',
      },
    ],
  },
  {
    id: 'defending',
    title: 'Defending Well',
    group: 'Middlegame',
    summary: 'Calm defence: the order of defensive options, counterattack and prophylaxis.',
    steps: [
      {
        kind: 'text',
        md: `When something is attacked, check your options **in this order**:

1. **Capture the attacker** (if it's safe).
2. **Counterattack** something bigger, or give a check that gains time.
3. **Move** the attacked piece to a *good* square (not just any safe one).
4. **Defend** it with another piece, ideally a pawn.
5. **Block** the attack.

### Prophylaxis
Ask "what does he want to do next?" and stop it before it happens. Classic examples: h3 to stop a pin with ...Bg4, or giving your king *luft* to stop back-rank mates.

### Under a big attack
- Trade his attacking pieces, especially the queen.
- Bring defenders towards your king, don't run your queen away.
- Look for a counter-sacrifice to break his attack.`,
      },
      {
        kind: 'exercise',
        start: { fen: 'r1bq1rk1/ppp2ppp/2n5/7Q/8/3B4/PP3PPP/R3K2R b KQ - 0 1' },
        prompt: 'Black to move. White threatens Qxh7#. Defend — using option 1 from the list.',
        goal: 'best',
        tolerance: 5,
        solution: 'Qxd3',
        hint: 'Which white piece supports the mate, and can you take it?',
        explain:
          '...Qxd3! captures one of the two attackers, so the mate is gone — and the bishop was undefended, so you win a piece. Always check whether you can capture the attacker before you start blocking.',
      },
    ],
  },
  {
    id: 'endgames',
    title: 'Endgame Essentials',
    group: 'Endgame',
    summary: 'Active king, passed pawns, the opposition and the rule of the square.',
    steps: [
      {
        kind: 'text',
        md: `In the endgame the rules flip:

- **The king is a fighting piece.** Bring it to the centre straight away.
- **Passed pawns must be pushed.** Rooks belong **behind** passed pawns (yours or his).
- **Fewer pawns = harder to win.** If you're ahead, keep pawns on; if you're defending, trade pawns.

### Rule of the square
Can the king catch a passed pawn? Draw a square from the pawn to its promotion rank. If the defending king can step into that square, it catches the pawn.

### The opposition (king + pawn vs king)
Kings facing each other with one square between them: the side **not** to move "has the opposition" and wins the fight for key squares. In K+P vs K, get your **king in front of your pawn**, not behind it.`,
      },
      {
        kind: 'exercise',
        start: { fen: '8/8/8/8/8/8/k4P2/6K1 w - - 0 1' },
        prompt: 'White to move. Will your pawn outrun the black king? Make the right move.',
        goal: 'best',
        tolerance: 5,
        solution: 'f4',
        explain: 'f4! After the double step, the square of the pawn is f4–f8–b8–b4. The black king on a2 can’t step into it, so the pawn promotes. A slow move like Kf2? or f3? lets the king get into the square and catch the pawn.',
      },
      {
        kind: 'play',
        start: { fen: '8/8/3k4/8/3K4/8/3P4/8 w - - 0 1' },
        elo: 3000,
        userColor: 'w',
        label: 'K+P vs K',
        text: 'Win this against the engine. Your king is two squares in front of the pawn — keep it in front, use the opposition, and only push when your king controls the squares ahead. Pushing too early draws.',
      },
    ],
  },
  {
    id: 'thinking-process',
    title: 'How to Think During a Game',
    group: 'Thinking',
    summary: 'A simple move routine and time management for 10-minute games.',
    steps: [
      {
        kind: 'text',
        md: `### Every move
1. **His move**: what changed? (Blunder check Step 1–2.)
2. **Forcing moves**: my checks, captures, threats. Calculate them first.
3. **If nothing forcing**: pick a plan — target, worst piece, or pawn break.
4. **Candidates**: find 2–3 moves, not 1. "If you see a good move, look for a better one."
5. **Final check**: after my move, his checks and captures?

### Time (10+0 or 10+5)
- Opening: play fast, you know it.
- Spend time on **critical moments**: when captures happen, when the position opens, when you're about to attack or trade queens.
- Never drop below 1 minute with a complicated position on the board.

### After the game
Review it with the **Review** tab. Don't just look at the eval: read *why* each mistake happened and see which **tags** repeat on your dashboard. Fix the one that repeats most.`,
      },
    ],
  },
];

export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
