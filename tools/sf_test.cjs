const sf = require("stockfish")("lite-single", line => {
  if (/UCI_Elo|Skill Level|uciok|bestmove|^info depth 14 /.test(line)) console.log(line.slice(0,200));
  if (/bestmove/.test(line)) { console.log('time', Date.now()-t); sf.terminate(); }
});
let t;
sf.processCommand("uci");
setTimeout(()=>{ t=Date.now(); sf.processCommand("position fen r1bqkb1r/2pp1ppp/p1n2n2/1p2p3/4P3/1BN2N2/PPPP1PPP/R1BQK2R b KQkq - 1 6"); sf.processCommand("setoption name MultiPV value 3"); sf.processCommand("go depth 14"); }, 1500);
