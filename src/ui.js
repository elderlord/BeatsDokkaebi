import { FREQ_MIN, FREQ_MAX, FREQ_START } from './config.js';
import { clamp } from './logic.js';

const RING_RADIUS = 120;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export class UI {
  constructor(root) {
    this.root = root;
    this.left = root.querySelector('#slider-left');
    this.right = root.querySelector('#slider-right');
    this.leftLabel = root.querySelector('#freq-left');
    this.rightLabel = root.querySelector('#freq-right');
    this.beatLabel = root.querySelector('#beat-label');
    this.statusLabel = root.querySelector('#status-label');
    this.ring = root.querySelector('#seal-ring');
    this.stage = root.querySelector('#stage');

    for (const s of [this.left, this.right]) {
      s.min = String(FREQ_MIN);
      s.max = String(FREQ_MAX);
      s.step = '1';
      s.value = String(FREQ_START);
    }
    this.ring.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    this.ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE);

    this._interacted = false;
    const mark = () => { this._interacted = true; };
    this.left.addEventListener('input', mark);
    this.right.addEventListener('input', mark);
  }

  get frequencies() {
    return [Number(this.left.value), Number(this.right.value)];
  }

  pollInteracted() {
    const was = this._interacted;
    this._interacted = false;
    return was;
  }

  setBeat(hz) {
    this.beatLabel.textContent = `현재 맥놀이: ${hz.toFixed(1)} Hz`;
    const [l, r] = this.frequencies;
    this.leftLabel.textContent = `${l} Hz`;
    this.rightLabel.textContent = `${r} Hz`;
  }

  setStatus(text) { this.statusLabel.textContent = text; }

  setDistress(d) {
    const c = clamp(d, 0, 1);
    this.root.documentElement.style.setProperty('--distress', c.toFixed(3));
    const mag = c * 6;                        // 화면 흔들림 진폭(px)
    const dx = (Math.random() - 0.5) * mag;
    const dy = (Math.random() - 0.5) * mag;
    this.stage.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  setSealProgress(p) {
    const c = clamp(p, 0, 1);
    this.ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - c));
  }
}
