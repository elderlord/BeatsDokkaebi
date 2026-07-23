import {
  TARGET_BEAT_MIN,
  TARGET_BEAT_MAX,
  DISTRESS_PEAK_BEAT,
  SEAL_THRESHOLD,
  SEAL_HOLD_SECONDS,
  SEAL_DECAY_FACTOR,
  CELEBRATE_SECONDS,
  IDLE_RETURN_SECONDS,
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

// distress가 임계값 이상이면 1을 향해 충전, 아니면 관용적으로 감소.
export function updateSealProgress(progress, distress, dt) {
  const next = distress >= SEAL_THRESHOLD
    ? progress + dt / SEAL_HOLD_SECONDS
    : progress - (dt * SEAL_DECAY_FACTOR) / SEAL_HOLD_SECONDS;
  return clamp(next, 0, 1);
}

export function initialState() {
  return { phase: 'ATTRACT', sealProgress: 0, idleSeconds: 0, celebrateSeconds: 0 };
}

// 순수 리듀서. input = { dt(초), distress(0..1), interacted(boolean) }
export function step(state, input) {
  const { dt, distress, interacted } = input;
  switch (state.phase) {
    case 'ATTRACT':
      if (interacted) {
        return { phase: 'PLAY', sealProgress: 0, idleSeconds: 0, celebrateSeconds: 0 };
      }
      return state;
    case 'PLAY': {
      const sealProgress = updateSealProgress(state.sealProgress, distress, dt);
      const idleSeconds = interacted ? 0 : state.idleSeconds + dt;
      if (sealProgress >= 1) {
        return { phase: 'SEAL', sealProgress: 1, idleSeconds: 0, celebrateSeconds: 0 };
      }
      if (idleSeconds >= IDLE_RETURN_SECONDS) {
        return initialState();
      }
      return { ...state, sealProgress, idleSeconds };
    }
    case 'SEAL': {
      const celebrateSeconds = state.celebrateSeconds + dt;
      if (celebrateSeconds >= CELEBRATE_SECONDS) {
        return initialState();
      }
      return { ...state, celebrateSeconds };
    }
    default:
      return state;
  }
}
