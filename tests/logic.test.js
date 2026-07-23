import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, computeBeat, computeDistress } from '../src/logic.js';

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
