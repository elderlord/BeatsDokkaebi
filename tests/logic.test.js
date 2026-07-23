import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, computeBeat, computeDistress, updateSealProgress, initialState, step } from '../src/logic.js';

test('clamp 은 범위로 제한한다', () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(clamp(0.4, 0, 1), 0.4);
});

test('computeBeat 은 두 주파수의 절댓값 차이', () => {
  assert.equal(computeBeat(440, 444), 4);
  assert.equal(computeBeat(444, 440), 4);
  assert.equal(computeBeat(440, 440), 0);
});

test('computeDistress 는 목표창 밖에서 0', () => {
  assert.equal(computeDistress(0), 0);   // 완전 일치 근처
  assert.equal(computeDistress(1), 0);   // 하한
  assert.equal(computeDistress(6), 0);   // 상한
  assert.equal(computeDistress(20), 0);  // 창 밖
});

test('computeDistress 는 피크(3Hz)에서 1', () => {
  assert.equal(computeDistress(3), 1);
});

test('computeDistress 는 창 안에서 선형 상승/하강', () => {
  assert.equal(computeDistress(2), 0.5);   // (2-1)/(3-1)
  assert.equal(computeDistress(4.5), 0.5); // (6-4.5)/(6-3)
});

test('updateSealProgress 는 distress 충분하면 충전', () => {
  // HOLD=3초 -> 1초당 +1/3
  assert.ok(Math.abs(updateSealProgress(0, 1, 1) - 1 / 3) < 1e-9);
});

test('updateSealProgress 는 distress 낮으면 감소(관용)', () => {
  // DECAY=0.5 -> 1초당 -0.5/3
  assert.ok(Math.abs(updateSealProgress(0.5, 0, 1) - (0.5 - 0.5 / 3)) < 1e-9);
});

test('updateSealProgress 는 [0,1] 로 클램프', () => {
  assert.equal(updateSealProgress(0.9, 1, 10), 1);
  assert.equal(updateSealProgress(0.05, 0, 10), 0);
});

test('initialState 는 ATTRACT 에서 시작', () => {
  assert.deepEqual(initialState(), {
    phase: 'ATTRACT', sealProgress: 0, idleSeconds: 0, celebrateSeconds: 0,
  });
});

test('ATTRACT 는 상호작용 시 PLAY 로', () => {
  const s = step(initialState(), { dt: 0.016, distress: 0, interacted: true });
  assert.equal(s.phase, 'PLAY');
});

test('ATTRACT 는 상호작용 없으면 그대로', () => {
  const s = step(initialState(), { dt: 0.016, distress: 0, interacted: false });
  assert.equal(s.phase, 'ATTRACT');
});

test('PLAY 는 봉인 링이 차면 SEAL 로', () => {
  let s = { phase: 'PLAY', sealProgress: 0.99, idleSeconds: 0, celebrateSeconds: 0 };
  s = step(s, { dt: 1, distress: 1, interacted: true });
  assert.equal(s.phase, 'SEAL');
});

test('PLAY 는 무입력 20초 후 ATTRACT 로', () => {
  let s = { phase: 'PLAY', sealProgress: 0, idleSeconds: 19.9, celebrateSeconds: 0 };
  s = step(s, { dt: 0.2, distress: 0, interacted: false });
  assert.equal(s.phase, 'ATTRACT');
});

test('PLAY 는 상호작용 시 idle 타이머 리셋', () => {
  let s = { phase: 'PLAY', sealProgress: 0, idleSeconds: 10, celebrateSeconds: 0 };
  s = step(s, { dt: 0.2, distress: 0, interacted: true });
  assert.equal(s.idleSeconds, 0);
});

test('SEAL 은 축하 4초 후 ATTRACT 로 초기화', () => {
  let s = { phase: 'SEAL', sealProgress: 1, idleSeconds: 0, celebrateSeconds: 3.9 };
  s = step(s, { dt: 0.2, distress: 1, interacted: false });
  assert.deepEqual(s, initialState());
});
