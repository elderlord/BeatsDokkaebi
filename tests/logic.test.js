import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, computeBeat } from '../src/logic.js';

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
