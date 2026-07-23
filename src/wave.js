import { clamp } from './logic.js';

// 배경 오실로스코프: 좌 주파수 파형(위), 우 주파수 파형(아래),
// 그리고 둘을 합친 맥놀이 파형(가운데)을 그린다.
//
// 실제 주파수(수백 Hz)를 그대로 그리면 한 화면에 수백 사이클이 겹쳐 보이지
// 않으므로, "인지 우선"으로 표시용 사이클 수를 사용한다. 두 파형의 사이클 차이를
// 과장(emphasis)해 맥놀이 봉우리(lobe)가 눈에 보이게 한다.
// - 좌우 주파수가 같으면: 두 파형이 동일 -> 합성파는 깨끗한 단일 파형(맥놀이 없음).
// - 벌어질수록: 합성파에 봉우리가 늘어 "맥놀이"가 뚜렷해진다.
export class WaveRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.fL = 440;
    this.fR = 440;
    this.distress = 0;
    this.t = 0; // 애니메이션 위상(초, 느리게 스크롤)
  }

  resize(cssW, cssH, dpr = 1) {
    this.w = cssW;
    this.h = cssH;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setFrequencies(fL, fR) {
    this.fL = fL;
    this.fR = fR;
  }

  setDistress(d) {
    this.distress = clamp(d, 0, 1);
  }

  render(dt) {
    this.t += dt * 0.5; // 완만한 흐름
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    if (w === 0) return;

    const diff = this.fL - this.fR;
    const base = 14;                          // 중심 반송(carrier) 사이클 수
    const spread = clamp(diff * 0.5, -9, 9);  // 디튠을 사이클 차이로 과장
    const cL = base - spread / 2;
    const cR = base + spread / 2;

    // 좌 주파수 파형(상단, 청록)
    this._drawSine(cL, h * 0.2, h * 0.12, 'rgba(90, 220, 255, 0.45)', 2);
    // 우 주파수 파형(하단, 금빛)
    this._drawSine(cR, h * 0.8, h * 0.12, 'rgba(255, 190, 90, 0.45)', 2);
    // 맥놀이 합성 파형(중앙, 강조)
    this._drawBeat(cL, cR, h * 0.5, h * 0.18);
  }

  _drawSine(cycles, yMid, amp, color, width) {
    const { ctx, w } = this;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const p = x / w;
      const y = yMid + Math.sin((p * cycles + this.t) * 2 * Math.PI) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  _drawBeat(cL, cR, yMid, amp) {
    const { ctx, w } = this;

    // 맥놀이 포락선(envelope): |cos(pi * (cL-cR) * p)| — 봉우리를 눈에 띄게.
    const half = (cL - cR) / 2;
    const envColor = `rgba(140, 255, 220, ${0.12 + this.distress * 0.18})`;
    for (const sign of [1, -1]) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const p = x / w;
        const env = Math.abs(Math.cos(half * p * 2 * Math.PI));
        const y = yMid + sign * env * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = envColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 합성 파형 본체(두 사인의 합) — distress 가 오를수록 밝게 발광.
    const glow = 0.45 + this.distress * 0.55;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 1) {
      const p = x / w;
      const s =
        Math.sin((p * cL + this.t) * 2 * Math.PI) +
        Math.sin((p * cR + this.t) * 2 * Math.PI);
      const y = yMid + (s / 2) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(150, 255, 225, ${glow})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(140, 255, 220, 0.8)';
    ctx.shadowBlur = 6 + this.distress * 16;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
