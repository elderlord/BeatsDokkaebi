import {
  TARGET_BEAT_MIN,
  TARGET_BEAT_MAX,
  DISTRESS_PEAK_BEAT,
} from './config.js';

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

export function computeBeat(fLeft, fRight) {
  return Math.abs(fLeft - fRight);
}

// 삼각형 매핑: 목표창 경계(1,6Hz)에서 0, 피크(3Hz)에서 1, 창 밖은 0.
export function computeDistress(beat) {
  if (beat <= TARGET_BEAT_MIN || beat >= TARGET_BEAT_MAX) return 0;
  if (beat <= DISTRESS_PEAK_BEAT) {
    return (beat - TARGET_BEAT_MIN) / (DISTRESS_PEAK_BEAT - TARGET_BEAT_MIN);
  }
  return (TARGET_BEAT_MAX - beat) / (TARGET_BEAT_MAX - DISTRESS_PEAK_BEAT);
}
