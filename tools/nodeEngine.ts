import { createRequire } from 'node:module';
import type { AnalyseOptions, Analysis, Engine } from '../src/lib/engineTypes';
import { SearchCollector } from '../src/lib/uci';
const require = createRequire(import.meta.url);

type Job = { fen: string; opts: AnalyseOptions; resolve: (a: Analysis) => void; reject: (e: Error) => void };

export class NodeEngine implements Engine {
  private sf: { processCommand(c: string): void; terminate(): void };
  private ready: Promise<void>;
  private queue: Job[] = [];
  private current: { job: Job; col: SearchCollector } | null = null;
  private readyResolve!: () => void;
  private mpv = 1;

  constructor(extra: Record<string, string> = {}) {
    this.ready = new Promise((r) => (this.readyResolve = r));
    this.sf = require('stockfish')('lite-single', (line: string) => this.onLine(line));
    this.sf.processCommand('uci');
    for (const [k, v] of Object.entries(extra)) this.sf.processCommand(`setoption name ${k} value ${v}`);
    this.sf.processCommand('isready');
  }
  private onLine(line: string) {
    if (line === 'readyok') this.readyResolve();
    if (!this.current) return;
    const res = this.current.col.feed(line);
    if (res) {
      const { job } = this.current;
      this.current = null;
      job.resolve(res);
      this.pump();
    }
  }
  private async pump() {
    await this.ready;
    if (this.current || !this.queue.length) return;
    const job = this.queue.shift()!;
    this.current = { job, col: new SearchCollector(job.fen) };
    const mpv = job.opts.multipv ?? 1;
    if (mpv !== this.mpv) {
      this.sf.processCommand(`setoption name MultiPV value ${mpv}`);
      this.mpv = mpv;
    }
    this.sf.processCommand(`position fen ${job.fen}`);
    const go = job.opts.depth ? `go depth ${job.opts.depth}` : `go movetime ${job.opts.movetime ?? 500}`;
    this.sf.processCommand(go);
  }
  analyse(fen: string, opts: AnalyseOptions) {
    return new Promise<Analysis>((resolve, reject) => {
      this.queue.push({ fen, opts, resolve, reject });
      this.pump();
    });
  }
  cancel() {
    for (const j of this.queue) j.reject(new Error('cancelled'));
    this.queue = [];
    this.sf.processCommand('stop');
  }
  command(c: string) {
    this.sf.processCommand(c);
  }
  quit() {
    this.sf.terminate();
  }
}
