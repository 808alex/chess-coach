/** Compact position key: board + side to move + castling rights, hashed to a short string.
 *  En passant is ignored so book lookups don't depend on how a library reports it. */
export function posKey(fen: string): string {
  const [board, turn, castling] = fen.split(' ');
  const s = `${board} ${turn} ${castling}`;
  // Two independent 32-bit FNV-1a style hashes -> ~52 bits, base36.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
    h2 = (h2 ^ (h2 >>> 15)) >>> 0;
  }
  return h1.toString(36) + (h2 & 0xfffff).toString(36);
}
