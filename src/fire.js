import { clamp } from './logic.js';

// 절차적 도깨비불: Canvas 파티클. 외부 이미지 없음.
export class FireRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.distress = 0;
    this.phase = 'ATTRACT';
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  setDistress(d) { this.distress = clamp(d, 0, 1); }
  setPhase(p) { this.phase = p; }

  spawn() {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height * 0.58;
    const calm = 1 - this.distress;          // distress↑ -> 불꽃이 위축·요동
    const count = Math.round(2 + calm * 4);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * (10 + this.distress * 34),
        y: cy,
        vx: (Math.random() - 0.5) * (0.5 + this.distress * 2.5),
        vy: -(0.8 + Math.random() * 0.6) * (1 + calm * 2),
        life: 1,
        size: (8 + calm * 22) * (0.6 + Math.random() * 0.6),
      });
    }
  }

  render(dt) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // SEAL 이면 불꽃을 더 내지 않고 남은 입자만 소멸(빨려드는 느낌).
    if (this.phase !== 'SEAL') this.spawn();

    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * (0.6 + this.distress * 0.9);
      const a = clamp(p.life, 0, 1);
      const hue = 150 + this.distress * 60;  // 청록(150) -> 파랑(210)
      const light = 60 - this.distress * 20;
      ctx.fillStyle = `hsla(${hue}, 100%, ${light}%, ${a * 0.6})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.1, p.size * a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    this.particles = this.particles.filter((p) => p.life > 0);
  }
}
