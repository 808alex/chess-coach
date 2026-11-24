import type { AnalyseOptions, Analysis, Engine } from '../lib/engineTypes';
import { SearchCollector } from '../lib/uci';

type Job = {
  fen: string;
  opts: AnalyseOptions;
  resolve: (a: Analysis) => void;
  reject: (e: Error) => void;
  cancelled?: boolean;
};

const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`;

/** A Stockfish instance running in a Web Worker, with a request queue. */
export class BrowserEngine implements Engine {
  private worker: Worker;
  private queue: Job[] = [];
  private current: { job: Job; col: SearchCollector } | null = null;
  private ready: Promise<void>;
  private readyResolve!: () => void;
  private options: Record<string, string> = {};
  failed = false;

  constructor() {
    this.ready = new Promise((r) => (this.readyResolve = r));
    this.worker = new Worker(ENGINE_URL);
    this.worker.onmessage = (e) => this.onLine(String(e.data));
    this.worker.onerror = () => {
      this.failed = true;
    };
    this.send('uci');
    this.send('setoption name Hash value 32');
    this.send('isready');
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  private onLine(line: string) {
    if (line === 'readyok') this.readyResolve();
    if (!this.current) return;
    const res = this.current.col.feed(line);
    if (res) {
      const { job } = this.current;
      this.current = null;
      if (job.cancelled) job.reject(new Error('cancelled'));
      else job.resolve(res);
      this.pump();
    }
  }

  /** Set a UCI option (applied before the next search). */
  setOption(name: string, value: string | number | boolean) {
    const v = String(value);
    if (this.options[name] === v) return;
    this.options[name] = v;
    this.send(`setoption name ${name} value ${v}`);
  }

  private async pump() {
    await this.ready;
    if (this.current || !this.queue.length) return;
    const job = this.queue.shift()!;
    this.current = { job, col: new SearchCollector(job.fen) };
    this.setOption('MultiPV', job.opts.multipv ?? 1);
    this.send(`position fen ${job.fen}`);
    if (job.opts.depth && job.opts.movetime) this.send(`go depth ${job.opts.depth} movetime ${job.opts.movetime}`);
    else if (job.opts.depth) this.send(`go depth ${job.opts.depth}`);
    else this.send(`go movetime ${job.opts.movetime ?? 500}`);
  }

  analyse(fen: string, opts: AnalyseOptions): Promise<Analysis> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fen, opts, resolve, reject });
      this.pump();
    });
  }

  cancel() {
    for (const j of this.queue) j.reject(new Error('cancelled'));
    this.queue = [];
    if (this.current) {
      this.current.job.cancelled = true;
      this.send('stop');
    }
  }

  newGame() {
    this.cancel();
    this.send('ucinewgame');
  }

  terminate() {
    this.worker.terminate();
  }
}

let analysisEngine: BrowserEngine | null = null;
let botEngine: BrowserEngine | null = null;

/** Engine used for grading / analysis (full strength). */
export function getAnalysisEngine() {
  if (!analysisEngine) analysisEngine = new BrowserEngine();
  return analysisEngine;
}

/** Separate engine used for the opponent so it never fights the coach for CPU state. */
export function getBotEngine() {
  if (!botEngine) botEngine = new BrowserEngine();
  return botEngine;
}

export const isCancel = (e: unknown) => e instanceof Error && e.message === 'cancelled';
