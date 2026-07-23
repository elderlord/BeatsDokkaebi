export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

export function computeBeat(fLeft, fRight) {
  return Math.abs(fLeft - fRight);
}
