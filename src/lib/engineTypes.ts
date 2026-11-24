// Shared engine types. Scores are always from the point of view of the side to move
// in the analysed position (that's how UCI reports them).

export type Score = { cp?: number; mate?: number };

export type Line = {
  move: string; // first move, UCI (e.g. "e2e4", "e7e8q")
  pv: string[]; // full principal variation, UCI
  score: Score;
  depth: number;
};

export type Analysis = {
  fen: string;
  depth: number;
  lines: Line[]; // sorted best first (multipv order)
};

export type AnalyseOptions = {
  depth?: number;
  movetime?: number;
  multipv?: number;
};

export interface Engine {
  analyse(fen: string, opts: AnalyseOptions): Promise<Analysis>;
  /** Abort whatever is running and drop queued requests (they reject with "cancelled"). */
  cancel(): void;
}
