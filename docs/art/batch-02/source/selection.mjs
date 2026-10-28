export const VARIANTS=Object.freeze(['v01','v02','v03','v04']);
export function chooseVariant(mazeSeed,row,column) {
  if(!Number.isSafeInteger(row)||!Number.isSafeInteger(column)) throw new TypeError('Integer art coordinates required');
  const bytes=new TextEncoder().encode(JSON.stringify([String(mazeSeed),row,column]));
  let hash=2166136261;
  for(const byte of bytes) hash=Math.imul(hash^byte,16777619)>>>0;
  // Avalanche high bits into low bits before modulo four, avoiding FNV's
  // low-bit lattice pattern on neighboring row/column strings.
  hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);
  hash^=hash>>>15;hash=Math.imul(hash,0x846ca68b);hash^=hash>>>16;
  return VARIANTS[(hash>>>0)%4];
}
