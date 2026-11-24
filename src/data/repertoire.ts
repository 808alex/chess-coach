// Opening repertoire: your White (1.e4 + Ruy Lopez) and a simple, low-theory Black setup.
// Notes are keyed by ply index (0 = White's first move). Every line is checked by tools/verify-content.ts.

export type RepLine = {
  id: string;
  name: string;
  moves: string; // SAN, space separated, both sides
  notes: Record<number, string>;
  plan: string; // what to do once the line ends
};

export type Chapter = { id: string; title: string; side: 'w' | 'b'; intro: string; lines: RepLine[] };

export const REPERTOIRE: Chapter[] = [
  {
    id: 'w-ruy',
    title: 'White: Ruy Lopez (1.e4 e5 2.Nf3 Nc6 3.Bb5)',
    side: 'w',
    intro:
      'Your main weapon. The bishop on b5 attacks the knight that defends e5. You are not winning e5 right away — the point is long-term pressure on e5 and the centre, then the c3 + d4 break.',
    lines: [
      {
        id: 'ruy-closed',
        name: 'Main line: castle first',
        moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3',
        notes: {
          0: 'Grab the centre and open lines for your queen and light-squared bishop.',
          2: 'Develop with a threat: the knight attacks e5.',
          4: 'The Ruy Lopez. Pressure the defender of e5.',
          5: '...a6 asks the bishop a question. Retreat — do not take on c6 unless you want a calm Exchange game.',
          6: 'Keep the pin-like pressure. Ba4 stays on the a4-e8 diagonal.',
          8: 'Castle before anything else. Your e4 pawn looks loose but ...Nxe4 is met by Re1 or d4 and you win it back.',
          10: 'The rook defends e4 and supports a later d4.',
          11: 'Black kicks the bishop again.',
          12: 'Bb3: now the bishop eyes f7, the weakest square in Black’s camp.',
          14: 'c3 prepares d4 and gives the bishop a retreat square on c2 if Black plays ...Na5.',
          16: 'h3 stops ...Bg4 pinning your knight, so d4 can come next without problems.',
        },
        plan: 'Play d4 next. Then reroute the b1 knight via d2–f1–g3 towards the kingside. Your pieces aim at Black’s king; Black usually plays on the queenside with ...Na5 and ...c5.',
      },
      {
        id: 'ruy-nc3',
        name: 'Your line: 5.Nc3 (the screenshot position)',
        moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 Nc3 b5 Bb3 Be7 d3 d6 a4 b4 Nd5 O-O O-O',
        notes: {
          8: 'This is what you usually play. It is fine, but it blocks your c-pawn, so the classic c3 + d4 plan is gone. Your plan changes: d3, Nd5 and a4.',
          10: 'The position from your screenshot. The bishop on b3 points at f7.',
          11: 'Black develops and prepares to castle. (6...Bc5 is also fine for Black: answer it with d3 as well. The 7.Nxe5 Nxe5 8.d4 fork trick looks tempting but only gives equality.)',
          12: 'Solid: d3 defends e4 so your knight on c3 is free to jump.',
          14: 'a4! hits the b5 pawn. Black has to decide how to deal with the pressure on the a-file.',
          16: 'Your knight was attacked by the b4 pawn, so it jumps to d5 — the dream square. No black pawn can easily kick it, and it eyes Black’s f6 knight, the main defender of the kingside.',
          18: 'Now castle. You are slightly better with easy moves.',
        },
        plan: 'Your knight on d5 and bishop on b3 both aim at Black’s king. Ideas: Nxf6+ to rip up the pawns in front of the king, Ng5 hitting f7, and c3 later to open the c-file. If Black ever takes on d5, recapture with the bishop to keep the diagonal to f7.',
      },
      {
        id: 'ruy-berlin',
        name: 'vs Berlin (3...Nf6): 4.d3',
        moves: 'e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 c3 O-O O-O d6 h3',
        notes: {
          5: 'The Berlin. Black attacks e4 immediately.',
          6: 'd3 is simple and safe: defend e4 and avoid the famous Berlin endgame.',
          8: 'c3 gives the bishop a retreat square on a4/c2 and prepares d4 later.',
          12: 'h3 again stops ...Bg4.',
        },
        plan: 'A slow manoeuvring game: Nbd2–f1–g3, Re1, then d4 when ready. Keep your bishop — if Black plays ...a6, retreat to a4 rather than taking on c6.',
      },
      {
        id: 'ruy-classical',
        name: 'vs Classical (3...Bc5)',
        moves: 'e4 e5 Nf3 Nc6 Bb5 Bc5 c3 Nf6 O-O O-O d4 Bb6',
        notes: {
          5: 'Black develops the bishop aggressively towards f2.',
          6: 'c3 prepares d4 to hit the bishop and grab the centre.',
          10: 'd4! with tempo on the bishop.',
        },
        plan: 'Keep the centre with Re1 and Bg5 or dxe5. Watch out: if the e5 pawn is taken, ...Nxe4 tricks can appear. Count attackers on e4 every move.',
      },
      {
        id: 'ruy-steinitz',
        name: 'vs Steinitz (3...d6)',
        moves: 'e4 e5 Nf3 Nc6 Bb5 d6 d4 Bd7 Nc3 Nf6 O-O Be7 Re1',
        notes: {
          5: 'Solid but passive. Black defends e5 with a pawn.',
          6: 'd4 grabs space and attacks e5 a third time.',
          12: 'Re1 keeps e4 defended. You have more space — use it.',
        },
        plan: 'More space = more room for your pieces. Build with Bf4 or Bg5, Qd2, Rad1. Don’t rush — Black’s pieces are cramped.',
      },
      {
        id: 'ruy-schliemann',
        name: 'vs Schliemann (3...f5)',
        moves: 'e4 e5 Nf3 Nc6 Bb5 f5 d3 fxe4 dxe4 Nf6 O-O d6 Nc3',
        notes: {
          5: 'An aggressive gambit-style move. Do not panic.',
          6: 'd3 is the calm answer: you keep a solid centre and Black’s kingside is loosened.',
          12: 'Develop. Black’s king has fewer pawns guarding it — target the a2–g8 diagonal later with Bc4.',
        },
        plan: 'Bc4 and Ng5 ideas against e6/f7. Black’s king is draughty.',
      },
      {
        id: 'ruy-bird',
        name: 'vs Bird (3...Nd4)',
        moves: 'e4 e5 Nf3 Nc6 Bb5 Nd4 Nxd4 exd4 O-O c6 Ba4 Nf6 Re1',
        notes: {
          5: 'Black trades knights to get a pawn on d4.',
          6: 'Take. The d4 pawn becomes a target later.',
          10: 'Keep the bishop. It will come back to b3.',
          12: 'Re1 protects e4. Play c3 or d3 next and win the d4 pawn or open lines.',
        },
        plan: 'Play c3 to challenge d4. You are better developed — open the position.',
      },
      {
        id: 'ruy-exchange',
        name: 'Optional: Exchange Variation',
        moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1',
        notes: {
          6: 'Bxc6 gives up the bishop pair, but damages Black’s pawns. Note that 5.Nxe5? does not win a pawn: 5...Qd4! wins it back.',
          8: 'Castle first. Now Nxe5 really is a threat.',
          10: 'Open the centre while Black is behind in development.',
        },
        plan: 'This leads to an endgame-like middlegame. Your 4 vs 3 kingside majority can make a passed pawn; Black’s doubled c-pawns cannot. Trades help you.',
      },
    ],
  },
  {
    id: 'w-e5-other',
    title: 'White: other replies to 1.e4 e5 2.Nf3',
    side: 'w',
    intro: 'Not every opponent plays 2...Nc6. These are the common ones at club level, with the traps to know.',
    lines: [
      {
        id: 'petrov',
        name: 'Petrov (2...Nf6)',
        moves: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3',
        notes: {
          3: 'Black copies you and attacks e4.',
          4: 'Take the pawn. Black must play ...d6 first before taking back.',
          5: 'Correct. TRAP: if Black plays 3...Nxe4? then 4.Qe2! and if 4...Nf6?? 5.Nc6+ — discovered attack on the queen.',
          10: 'Develop with ideas of O-O, Re1 and c4 to undermine the knight on e4.',
        },
        plan: 'O-O, Re1, c4. Black’s knight on e4 looks active but can be undermined.',
      },
      {
        id: 'philidor',
        name: 'Philidor (2...d6)',
        moves: 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O',
        notes: {
          3: 'Passive: Black defends e5 with a pawn and blocks the f8 bishop.',
          4: 'd4 immediately challenges.',
          6: 'A beautiful centralised knight.',
        },
        plan: 'You have more space and easy development: Be3, Qd2, f4 and a kingside pawn push.',
      },
    ],
  },
  {
    id: 'w-sicilian',
    title: 'White: vs the Sicilian (1...c5) — the Alapin 2.c3',
    side: 'w',
    intro:
      'Instead of memorising Open Sicilian theory, play 2.c3 and build the ideal centre with d4. The ideas repeat in every line: c3 + d4, develop, castle.',
    lines: [
      {
        id: 'alapin-d5',
        name: '2...d5',
        moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Be2 Nc6 O-O',
        notes: {
          2: 'Prepare d4 so you can recapture on d4 with a pawn.',
          5: 'Black’s queen comes out early — the point of c3 is that Nc3 isn’t available, so the queen is safe-ish.',
          6: 'Take the centre.',
        },
        plan: 'Be3, Na3–b5 or Nbd2, c4 later. You often get an isolated d-pawn — that’s fine: it gives your pieces open lines for attack. Keep pieces on and play for the kingside.',
      },
      {
        id: 'alapin-nf6',
        name: '2...Nf6',
        moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4',
        notes: {
          3: 'Black attacks e4.',
          4: 'Push with tempo.',
          8: 'Develop first, then take back on d4 with the pawn.',
          12: 'Hit the d5 knight. Bc4 also aims at f7.',
        },
        plan: 'O-O, Qe2/Qb3 (both hit things). Watch for ...dxe5 dxe5 — the e5 pawn gives you space.',
      },
      {
        id: 'alapin-nc6',
        name: '2...Nc6',
        moves: 'e4 c5 c3 Nc6 d4 d5 exd5 Qxd5 Nf3 cxd4 cxd4 e5 Nc3',
        notes: {
          4: 'Straight in the middle.',
          12: 'Develop with tempo on the queen.',
        },
        plan: 'Open centre: develop quickly, castle, and use the d-file. Every tempo counts.',
      },
      {
        id: 'alapin-e6',
        name: '2...e6',
        moves: 'e4 c5 c3 e6 d4 d5 e5 Nc6 Nf3 Qb6 Be2',
        notes: {
          6: 'This is now a French Advance structure — see the French chapter. Same plans!',
          10: 'Solid. Don’t play Bd3? because ...cxd4 cxd4 Nxd4 wins a pawn.',
        },
        plan: 'Keep the e5 pawn, defend d4, castle, and attack on the kingside.',
      },
      {
        id: 'alapin-d6',
        name: '2...d6',
        moves: 'e4 c5 c3 d6 d4 Nf6 Bd3 cxd4 cxd4 Nc6 Nf3',
        notes: { 6: 'Defend e4 with the bishop — you have the big centre Black allowed.' },
        plan: 'O-O, Nc3, h3, Be3. Your big centre gives you space; push d5 or e5 at the right moment.',
      },
      {
        id: 'alapin-g6',
        name: '2...g6',
        moves: 'e4 c5 c3 g6 d4 cxd4 cxd4 d5 e5 Nc6 Nc3',
        notes: { 8: 'Close the centre and keep space; the g7 bishop bites on granite.' },
        plan: 'Nf3, Be2, O-O. Black will attack d4 — keep it defended with pieces.',
      },
    ],
  },
  {
    id: 'w-french-caro',
    title: 'White: vs French (1...e6) & Caro-Kann (1...c6) — the Advance',
    side: 'w',
    intro:
      'Against both, play d4 and then e5. One plan for two openings: lock the centre, gain space on the kingside, and attack where your pawns point.',
    lines: [
      {
        id: 'french-adv',
        name: 'French Advance',
        moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Be2 cxd4 cxd4 Nge7 Na3',
        notes: {
          4: 'Lock the centre. Your pawn on e5 cramps Black’s kingside.',
          5: 'Black attacks the base of your chain.',
          6: 'Support d4.',
          10: 'Be2 (not Bd3?: ...cxd4 cxd4 Nxd4! wins a pawn because Nxd4 Qxd4 Bb5+ doesn’t work in your favour).',
          14: 'Na3 heading to c2 to protect d4 again.',
        },
        plan: 'Your pawns point to the kingside, so attack there: O-O, Nc2, Kh1, g4/f4 ideas. Never let d4 fall.',
      },
      {
        id: 'caro-adv',
        name: 'Caro-Kann Advance',
        moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6 c3',
        notes: {
          4: 'Same idea as vs the French.',
          5: 'Black gets the bishop out before ...e6 (that’s the point of the Caro).',
          8: 'Quiet and solid. Castle, then strike.',
          12: 'Hold d4.',
        },
        plan: 'Nbd2–b3, Be3, a later Nh4 to hunt the f5 bishop. Space on the kingside again.',
      },
    ],
  },
  {
    id: 'w-other',
    title: 'White: Scandinavian, Pirc and rare replies',
    side: 'w',
    intro: 'Short, practical answers. The theme: take the centre, develop with tempo.',
    lines: [
      {
        id: 'scandi',
        name: 'Scandinavian (1...d5)',
        moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2',
        notes: {
          2: 'Take — Black loses time getting the pawn back.',
          4: 'Develop with tempo on the queen.',
          12: 'Unpins and threatens Nd5 discovered attacks on the queen.',
        },
        plan: 'O-O, Qe2, Ne5. You’re ahead in development — open lines toward Black’s king.',
      },
      {
        id: 'scandi-nf6',
        name: 'Scandinavian 2...Nf6',
        moves: 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 Bg4 Be2',
        notes: { 4: 'Let Black take back and grab the centre.' },
        plan: 'O-O, c4 to kick the knight, Nc3. Big centre, easy play.',
      },
      {
        id: 'pirc',
        name: 'Pirc / Modern',
        moves: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2',
        notes: { 8: 'Qd2 + Be3: the "150 Attack" setup. Plan Bh6 to trade Black’s best defender.' },
        plan: 'f3, Bh6, O-O-O, h4–h5. Open the h-file and go for mate.',
      },
      {
        id: 'alekhine',
        name: 'Alekhine (1...Nf6)',
        moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O',
        notes: { 2: 'Chase the knight. Space is yours.' },
        plan: 'c4 to kick the knight again, then Nc3. Don’t overextend — keep pieces protected.',
      },
    ],
  },
  {
    id: 'b-e4',
    title: 'Black vs 1.e4: play 1...e5 (what you already know, from the other side)',
    side: 'b',
    intro:
      'Mirror your White knowledge. Answer 1.e4 with 1...e5, develop knights before bishops, castle quickly, and know the traps beginners use against you.',
    lines: [
      {
        id: 'b-ruy',
        name: 'vs Ruy Lopez',
        moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O',
        notes: {
          1: 'Claim your share of the centre.',
          3: 'Defend e5 and develop.',
          5: 'Ask the bishop what it wants.',
          7: 'Develop with an attack on e4.',
          9: 'Calm: bishop to e7, castle next.',
          11: 'Now e5 really was under threat (Bxc6 then Nxe5), so kick the bishop first.',
          15: 'Castle — your king is safe and your position is solid.',
        },
        plan: 'Queenside play: ...Na5 to hit the b3 bishop, ...c5, and ...Bb7. If White plays d4, keep the e5 pawn as long as you can.',
      },
      {
        id: 'b-ruy-exch',
        name: 'vs Ruy Exchange',
        moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3 Qxd1 Rxd1',
        notes: {
          7: 'dxc6 opens lines for your queen and c8 bishop. Your pawns are doubled, but you get the bishop pair.',
          9: '...f6 solidly protects e5.',
        },
        plan: 'Use your two bishops. Open the position. Don’t let White create a passed pawn on the kingside.',
      },
      {
        id: 'b-italian',
        name: 'vs Italian (3.Bc4): 3...Bc5',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O',
        notes: {
          5: 'Mirror White’s bishop. Safer than 3...Nf6 against Ng5 tricks.',
          7: 'Develop with an attack on e4.',
          9: 'Solid: support e5, open your c8 bishop.',
        },
        plan: '...a6 and ...Ba7 to keep the bishop when White plays b4/d4. Then ...h6 and ...Re8. Slow and solid.',
      },
      {
        id: 'b-italian-d4',
        name: 'vs Italian with d4',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5',
        notes: {
          9: 'Take — don’t let White keep a big centre.',
          11: 'Check and trade bishops.',
          15: 'Strike back! ...d5 breaks up White’s centre. This is the key move to remember.',
        },
        plan: 'After exd5 Nxd5 your pieces are active. Castle and blockade any isolated d-pawn with a knight.',
      },
      {
        id: 'b-italian-ng5',
        name: 'vs Italian 4.Ng5?? (f7 "attack")',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 Ng5 Qxg5',
        notes: {
          6: 'Club players love this: knight and bishop both aim at f7. But run the blunder check — what defends the knight on g5? Nothing.',
          7: '...Qxg5! The queen sweeps down the d8–g5 diagonal and wins a whole knight. If White tries Bxf7+, step the king to f8 or e7: you are a piece up and threaten ...Qxg2.',
        },
        plan: 'You are a piece up. Develop (...Nf6, ...d6), castle by hand if needed, and trade pieces. Watch your queen on g5 — don’t let White win it back with d4 tricks.',
      },
      {
        id: 'b-scotch',
        name: 'vs Scotch (3.d4)',
        moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7',
        notes: {
          5: 'Take.',
          7: 'Hit the d4 knight straight away.',
          9: 'The queen adds pressure on d4 (and f2).',
          11: 'Develop the knight to e7 so the queen keeps the f-file.',
        },
        plan: 'Castle and play ...d5 when possible. Active pieces against White’s centre.',
      },
      {
        id: 'b-4knights',
        name: 'vs Four Knights (3.Nc3)',
        moves: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6',
        notes: {
          5: 'Symmetry is fine.',
          7: 'Copy again.',
          11: 'Solid. Watch for Bg5 pins on your f6 knight — ...h6 is often useful.',
        },
        plan: 'A slow, symmetrical middlegame. Whoever plans better wins: think about ...Ne7–g6 and ...c6 to kick the bishop.',
      },
      {
        id: 'b-scholar',
        name: 'vs early Queen attack (2.Qh5 / Scholar’s mate tries)',
        moves: 'e4 e5 Qh5 Nc6 Bc4 g6 Qf3 Nf6 Ne2 Bg7',
        notes: {
          2: 'Beginners love this. The queen eyes f7 and e5.',
          3: 'Defend e5 first.',
          5: 'Now ...g6 blocks the queen. Never ...Nf6?? here — Qxf7 is mate.',
          7: 'Block the f-file with a developing move. f7 is now safe.',
          9: 'Develop with ideas of ...Nd4 hitting the queen and c2.',
        },
        plan: 'You will gain time hitting the white queen. Develop fast and castle: ...Nd4, ...d6, ...O-O.',
      },
      {
        id: 'b-vienna',
        name: 'vs Vienna (2.Nc3)',
        moves: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7',
        notes: {
          3: 'Develop and attack e4.',
          5: 'Hit back in the centre when White plays f4.',
          7: 'The knight is great on e4.',
        },
        plan: 'Castle, ...c5 and ...Nc6. Your active knight on e4 is the star.',
      },
      {
        id: 'b-kg',
        name: 'vs King’s Gambit (2.f4)',
        moves: 'e4 e5 f4 d5 exd5 exf4 Nf3 Nf6',
        notes: {
          3: 'Counter in the centre. Simple and good.',
          5: 'Now take the f4 pawn — White’s king is a bit exposed.',
        },
        plan: 'Recapture on d5 with the knight, develop ...Bd6, castle. White’s king will be the weak one.',
      },
      {
        id: 'b-sicilian-note',
        name: 'vs 1.e4 then 2.d4 (Center Game)',
        moves: 'e4 e5 d4 exd4 Qxd4 Nc6 Qe3 Nf6 Nc3 Bb4 Bd2 O-O',
        notes: { 5: 'Develop with tempo on the queen.' },
        plan: '...Re8 and ...d5 next. You are ahead in development.',
      },
    ],
  },
  {
    id: 'b-d4',
    title: 'Black vs 1.d4 / 1.c4 / 1.Nf3: the "d5 + e6" setup',
    side: 'b',
    intro:
      'One setup for almost everything: pawns on d5 and e6, knight f6, bishop e7, castle, then strike with ...c5. Low theory, solid, and the plans repeat.',
    lines: [
      {
        id: 'b-qgd',
        name: 'vs Queen’s Gambit',
        moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5',
        notes: {
          3: '...e6 declines the gambit and keeps d5 solid.',
          7: 'Unpin calmly.',
          11: 'Knight to d7 keeps the c-pawn free.',
          15: 'Now take — White has spent a tempo on Bd3.',
          17: 'Capablanca’s freeing idea: trade pieces with ...Nd5, then play ...e5.',
        },
        plan: 'Trade a couple of pieces with ...Nd5, then free yourself with ...e5 or ...c5. Your light-squared bishop comes out after that.',
      },
      {
        id: 'b-qgd-exch',
        name: 'vs Exchange (cxd5)',
        moves: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 c6 Bd3 O-O',
        notes: {
          7: 'Take back with the pawn — your c8 bishop is now free.',
          11: '...c6 makes a solid chain.',
        },
        plan: '...Nbd7–f8–g6 and ...Re8. White often attacks on the queenside with b4–b5; you play on the kingside.',
      },
      {
        id: 'b-london',
        name: 'vs London (Bf4)',
        moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3',
        notes: {
          5: 'Same setup.',
          7: 'Strike the d4 pawn with ...c5.',
          11: 'Offer to trade the London bishop — it’s White’s best piece.',
        },
        plan: '...b6 and ...Bb7, or ...Qe7 and ...e5. Don’t let White get a free Ne5 + f4 attack: trade on e5 if needed.',
      },
      {
        id: 'b-colle',
        name: 'vs Colle / quiet e3',
        moves: 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3 Nc6 Nbd2 Bd6 O-O O-O',
        notes: { 7: 'Same plan: ...c5.' },
        plan: 'White wants e4. Answer with ...Qc7 and ...e5 yourself, or trade on d4 and play on the queenside.',
      },
      {
        id: 'b-catalan',
        name: 'vs Catalan (g3)',
        moves: 'd4 d5 c4 e6 Nf3 Nf6 g3 Be7 Bg2 O-O O-O dxc4',
        notes: { 11: 'Take the pawn — the c4 pawn is hard for White to win back quickly. Play ...a6 and ...b5 if allowed.' },
        plan: '...a6, ...b5, ...Bb7 to fight the g2 bishop, then ...c5.',
      },
      {
        id: 'b-english',
        name: 'vs English (1.c4)',
        moves: 'c4 e6 Nc3 d5 d4 Nf6',
        notes: { 1: '...e6 then ...d5: you are back in your Queen’s Gambit setup.' },
        plan: 'Same as the Queen’s Gambit: ...Be7, ...O-O, ...c5 or ...dxc4 at the right moment.',
      },
      {
        id: 'b-english-nf3',
        name: 'vs English with Nf3 + g3',
        moves: 'c4 e6 Nf3 d5 g3 Nf6 Bg2 Be7 O-O O-O',
        notes: { 9: 'Castle and then choose ...c5 or ...dxc4.' },
        plan: '...c5 and ...Nc6 gives you a nice centre.',
      },
      {
        id: 'b-reti',
        name: 'vs 1.Nf3 / King’s Indian Attack',
        moves: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O',
        notes: { 1: 'Same setup again.' },
        plan: '...c5, ...Nc6, ...b6 and ...Bb7. If White plays e4, take on e4 or keep the tension with ...Qc7.',
      },
      {
        id: 'b-bird',
        name: 'vs Bird (1.f4)',
        moves: 'f4 d5 Nf3 Nf6 e3 e6',
        notes: { 1: 'Solid centre. The e4 square is yours.' },
        plan: '...c5, ...Nc6, ...Be7. Watch White’s kingside attack ideas with Qe1–h4.',
      },
    ],
  },
];
