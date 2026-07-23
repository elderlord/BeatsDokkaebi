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

  // iOS 사파리는 사용자 제스처 이후에만 재생 가능 -> 첫 터치에서 호출.
  async resume(fLeft, fRight) {
    if (!this.ctx) {
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
    if (this.ctx.state === 'suspended') await this.ctx.resume();
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
