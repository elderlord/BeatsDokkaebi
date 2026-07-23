import { clamp } from './logic.js';

// 실제 두 사인파를 합성해 물리적 맥놀이를 생성한다. 외부 샘플/네트워크 없음.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.oscL = null;
    this.oscR = null;
    this.master = null;
    this.groanGain = null;
  }

  // 현재 오디오 컨텍스트 상태('running'/'suspended'/'interrupted'/'none').
  get state() {
    return this.ctx ? this.ctx.state : 'none';
  }

  // 오디오 그래프를 최초 1회 생성한다(오실레이터·게인). 소리는 아직 안 날 수 있음.
  _ensureGraph(fLeft, fRight) {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.25;            // 볼륨 안전 상한
    this.master.connect(this.ctx.destination);

    this.oscL = this.ctx.createOscillator();
    this.oscR = this.ctx.createOscillator();
    for (const [osc, f] of [[this.oscL, fLeft], [this.oscR, fRight]]) {
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = 0.5;
      osc.connect(g).connect(this.master);
      osc.start();
    }

    // 절차적 신음 레이어(저음 톱니), distress에 볼륨 연동.
    const groan = this.ctx.createOscillator();
    groan.type = 'sawtooth';
    groan.frequency.value = 110;
    this.groanGain = this.ctx.createGain();
    this.groanGain.gain.value = 0;
    groan.connect(this.groanGain).connect(this.master);
    groan.start();
  }

  // iOS 사파리는 사용자 제스처 이후에만 재생 가능.
  // 제스처 안에서 무음 버퍼를 start + resume() 을 함께 시도해 확실히 해제한다.
  // 여러 제스처 이벤트에서 반복 호출해도 안전하며, 최종 상태 문자열을 반환한다.
  async unlock(fLeft, fRight) {
    this._ensureGraph(fLeft, fRight);
    // iOS 는 제스처 중 버퍼 소스 start 시 오디오를 안정적으로 해제한다.
    try {
      const buf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);
    } catch (_) { /* 무시: 이미 해제된 경우 등 */ }
    if (this.ctx.state !== 'running') {
      try { await this.ctx.resume(); } catch (_) { /* 무시하고 다음 제스처에서 재시도 */ }
    }
    return this.ctx.state;
  }

  setFrequencies(fLeft, fRight) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.oscL.frequency.setTargetAtTime(fLeft, t, 0.02);
    this.oscR.frequency.setTargetAtTime(fRight, t, 0.02);
  }

  setDistress(d) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.groanGain.gain.setTargetAtTime(clamp(d, 0, 1) * 0.15, t, 0.05);
  }

  fadeOut() {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
  }

  restore() {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(0.25, this.ctx.currentTime, 0.3);
  }
}
