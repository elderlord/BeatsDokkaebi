// 모든 튜닝 값의 단일 소스. 순수(순수 상수만, 부작용 없음).
export const FREQ_MIN = 380;          // 슬라이더 최소 주파수 (Hz)
export const FREQ_MAX = 500;          // 슬라이더 최대 주파수 (Hz)
export const FREQ_START = 440;        // 시작값(좌·우 동일 -> beat 0)

export const TARGET_BEAT_MIN = 1;     // 봉인 대상 맥놀이 하한 (Hz)
export const TARGET_BEAT_MAX = 6;     // 봉인 대상 맥놀이 상한 (Hz)
export const DISTRESS_PEAK_BEAT = 3;  // distress가 1이 되는 맥놀이 지점 (Hz)

export const SEAL_THRESHOLD = 0.5;    // 봉인 링을 채우기 위한 distress 임계값
export const SEAL_HOLD_SECONDS = 3;   // 임계값 이상 유지 시 완전 봉인까지 걸리는 시간(초)
export const SEAL_DECAY_FACTOR = 0.5; // 임계값 미만일 때 링이 빠지는 속도(충전 속도 대비 배율, 관용)
export const CELEBRATE_SECONDS = 4;   // 봉인 성공 축하 지속(초)
export const IDLE_RETURN_SECONDS = 20;// PLAY 중 무입력 시 ATTRACT 복귀(초)
