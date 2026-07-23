import { AudioEngine } from './audio.js';
import { FireRenderer } from './fire.js';
import { UI } from './ui.js';
import { computeBeat, computeDistress, initialState, step } from './logic.js';
import { SEAL_HINT_PROGRESS } from './config.js';

const audio = new AudioEngine();
const ui = new UI(document);
const canvas = document.querySelector('#fire-canvas');
const fire = new FireRenderer(canvas);

let state = initialState();
let last = performance.now();

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  fire.resize(w, h, dpr);
}
window.addEventListener('resize', resize);
resize();

// iOS 오디오 정책: 최초 사용자 제스처에서 재생 시작.
window.addEventListener('pointerdown', () => {
  const [l, r] = ui.frequencies;
  audio.resume(l, r);
}, { once: true });

function statusText(s) {
  if (s.phase === 'SEAL') return '도깨비를 봉인했다!';
  if (s.phase === 'ATTRACT') return '결계를 흔들어 도깨비를 봉인하라';
  if (s.sealProgress > SEAL_HINT_PROGRESS) return '결계가 흔들린다...';
  return '두 주파수를 가까이 맞춰라';
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);   // 탭 복귀 시 큰 dt 방지
  last = now;

  const [fL, fR] = ui.frequencies;
  audio.setFrequencies(fL, fR);
  const beat = computeBeat(fL, fR);

  // distress: PLAY 에서는 맥놀이 기반, SEAL 에서는 최대, ATTRACT 에서는 0.
  const playDistress = computeDistress(beat);
  const interacted = ui.pollInteracted();

  const prevPhase = state.phase;
  const stepDistress = state.phase === 'PLAY' ? playDistress : 0;
  state = step(state, { dt, distress: stepDistress, interacted });

  // 페이즈 진입 부작용
  if (state.phase !== prevPhase) {
    if (state.phase === 'SEAL') audio.fadeOut();
    if (state.phase === 'ATTRACT') {
      audio.restore();
      ui.resetSliders();
    }
  }

  const visualDistress = state.phase === 'SEAL' ? 1 : (state.phase === 'PLAY' ? playDistress : 0);
  audio.setDistress(state.phase === 'PLAY' ? playDistress : 0);
  fire.setPhase(state.phase);
  fire.setDistress(visualDistress);
  fire.render(dt);

  ui.setBeat(beat);
  ui.setDistress(state.phase === 'SEAL' ? 0 : visualDistress);
  ui.setSealProgress(state.sealProgress);
  ui.setStatus(statusText(state));

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
