import type { Analysis, Line } from './engineTypes';

/** Collects UCI "info" lines for one search and builds an Analysis when "bestmove" arrives. */
export class SearchCollector {
  private lines = new Map<number, Line>();
  private fen: string;
  constructor(fen: string) {
    this.fen = fen;
  }

  /** Returns the finished Analysis on "bestmove", otherwise null. */
  feed(line: string): Analysis | null {
    if (line.startsWith('info') && line.includes(' pv ') && line.includes(' score ')) {
      const t = line.split(' ');
      const depth = Number(t[t.indexOf('depth') + 1]);
      const mpvIdx = t.indexOf('multipv');
      const multipv = mpvIdx >= 0 ? Number(t[mpvIdx + 1]) : 1;
      const sIdx = t.indexOf('score');
      const kind = t[sIdx + 1];
      const val = Number(t[sIdx + 2]);
      // Ignore bound-only scores; keep the last exact one.
      if (t[sIdx + 3] === 'lowerbound' || t[sIdx + 3] === 'upperbound') return null;
      const pv = t.slice(t.indexOf('pv') + 1).filter(Boolean);
      if (!pv.length) return null;
      this.lines.set(multipv, {
        move: pv[0],
        pv,
        depth,
        score: kind === 'mate' ? { mate: val } : { cp: val },
      });
      return null;
    }
    if (line.startsWith('bestmove')) {
      const best = line.split(' ')[1];
      const lines = [...this.lines.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
      if (!lines.length && best && best !== '(none)') lines.push({ move: best, pv: [best], depth: 0, score: { cp: 0 } });
      // Make sure the reported best move is first.
      if (lines.length && best && lines[0].move !== best) {
        const i = lines.findIndex((l) => l.move === best);
        if (i > 0) lines.unshift(...lines.splice(i, 1));
      }
      return { fen: this.fen, depth: Math.max(0, ...lines.map((l) => l.depth)), lines };
    }
    return null;
  }
}
