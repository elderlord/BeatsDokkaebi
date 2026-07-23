# 도깨비불 봉인 (맥놀이 전시 콘텐츠) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이패드에서 오프라인·무한 재생되는 단일 화면 전시물을 만든다 — 좌·우 슬라이더로 두 사인파 주파수를 조절해 느린 맥놀이(1~6Hz)를 만들어 도깨비불을 봉인한다.

**Architecture:** 순수 로직(맥놀이·괴로움 강도·상태머신)을 의존성 없는 ES 모듈로 분리해 Node 내장 테스트로 TDD한다. 브라우저 계층(Web Audio 오실레이터, Canvas 파티클 도깨비불, DOM 슬라이더/게이지)은 그 순수 로직을 소비하며 `requestAnimationFrame` 단일 루프에서 조립된다. 외부 라이브러리·네트워크 의존이 전혀 없어 파일만 열면 사파리에서 동작한다.

**Tech Stack:** Vanilla JavaScript (ES modules), Web Audio API, Canvas 2D, `node --test` (테스트, 런타임 의존성 0).

## Global Constraints

- 외부 런타임 의존성 0 (npm 패키지·CDN·폰트·이미지 로드 금지). 완전 오프라인.
- 모든 소스는 ES 모듈(`import`/`export`). 브라우저와 `node --test`가 같은 `src/*.js`를 공유.
- 아이패드 사파리 가로(landscape) 전체화면 대상. iOS 오디오는 사용자 제스처 이후에만 재생.
- 순수 로직 파일(`src/config.js`, `src/logic.js`)은 DOM·Web Audio·`window`를 참조하지 않는다 (Node에서 import 가능해야 함).
- 튜닝 상수는 전부 `src/config.js` 한 곳에서만 정의(주파수 범위 380~500Hz, 목표 맥놀이 1~6Hz, distress 피크 3Hz, 봉인 유지 3초, 축하 4초, 유휴 복귀 20초).
- 커밋은 자주. 각 태스크 종료 시 커밋.

## File Structure

```
index.html          # 진입점, 레이아웃, CSS(인라인), <script type="module" src="src/main.js">
manifest.json       # 홈화면 전체화면 실행 (fullscreen, landscape)
package.json        # { "type": "module", scripts.test = "node --test" } — 런타임 의존성 없음
src/
  config.js         # 튜닝 상수 (순수)
  logic.js          # computeBeat / computeDistress / updateSealProgress / step 상태머신 (순수)
  audio.js          # AudioEngine (Web Audio, 브라우저 전용)
  fire.js           # FireRenderer (Canvas 파티클, 브라우저 전용)
  ui.js             # UI (슬라이더·게이지·문구·화면 흔들림, 브라우저 전용)
  main.js           # rAF 루프 조립 (브라우저 전용)
tests/
  logic.test.js     # node --test 로 순수 로직 검증
```

책임 분리: `config`(값) → `logic`(순수 계산·상태) → `audio`/`fire`/`ui`(각 출력 계층) → `main`(조립). 순수 로직만 자동 테스트하고, 출력 계층은 실기기 수동 체크리스트로 검증(스펙 §7).

---

### Task 1: 프로젝트 스캐폴드 + config + computeBeat (TDD)

**Files:**
- Create: `package.json`
- Create: `src/config.js`
- Create: `src/logic.js`
- Test: `tests/logic.test.js`

**Interfaces:**
- Consumes: (없음)
- Produces:
  - `src/config.js` 상수: `FREQ_MIN=380`, `FREQ_MAX=500`, `FREQ_START=440`, `TARGET_BEAT_MIN=1`, `TARGET_BEAT_MAX=6`, `DISTRESS_PEAK_BEAT=3`, `SEAL_THRESHOLD=0.5`, `SEAL_HOLD_SECONDS=3`, `SEAL_DECAY_FACTOR=0.5`, `CELEBRATE_SECONDS=4`, `IDLE_RETURN_SECONDS=20`
  - `clamp(x, lo, hi) -> number`
  - `computeBeat(fLeft, fRight) -> number` (= |fLeft − fRight|)

- [ ] **Step 1: package.json 작성 (런타임 의존성 없음)**

```json
{
  "name": "beats-dokkaebi",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: config.js 작성 (튜닝 상수 단일 소스)**

`src/config.js`:
```js
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
```

- [ ] **Step 3: 실패하는 테스트 작성**

`tests/logic.test.js`:
```js
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
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `src/logic.js`에서 `clamp`/`computeBeat` export 없음 (module not found 또는 undefined).

- [ ] **Step 5: 최소 구현**

`src/logic.js`:
```js
export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

export function computeBeat(fLeft, fRight) {
  return Math.abs(fLeft - fRight);
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm test`
Expected: PASS (2 tests).

- [ ] **Step 7: 커밋**

```bash
git add package.json src/config.js src/logic.js tests/logic.test.js
git commit -m "feat: scaffold project with config and computeBeat"
```

---

### Task 2: computeDistress (TDD)

**Files:**
- Modify: `src/logic.js`
- Test: `tests/logic.test.js`

**Interfaces:**
- Consumes: `src/config.js`의 `TARGET_BEAT_MIN`, `TARGET_BEAT_MAX`, `DISTRESS_PEAK_BEAT`
- Produces: `computeDistress(beat) -> number` in [0,1]. 목표창 밖(≤1Hz 또는 ≥6Hz)은 0, 피크(3Hz)에서 1, 그 사이 선형(삼각형 매핑).

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/logic.test.js` 하단에 추가 (import 줄에 `computeDistress` 추가):
```js
import { clamp, computeBeat, computeDistress } from '../src/logic.js';
```
```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `computeDistress` undefined.

- [ ] **Step 3: 구현**

`src/logic.js` 상단 import 추가 + 함수 추가:
```js
import {
  TARGET_BEAT_MIN,
  TARGET_BEAT_MAX,
  DISTRESS_PEAK_BEAT,
} from './config.js';
```
```js
// 삼각형 매핑: 목표창 경계(1,6Hz)에서 0, 피크(3Hz)에서 1, 창 밖은 0.
export function computeDistress(beat) {
  if (beat <= TARGET_BEAT_MIN || beat >= TARGET_BEAT_MAX) return 0;
  if (beat <= DISTRESS_PEAK_BEAT) {
    return (beat - TARGET_BEAT_MIN) / (DISTRESS_PEAK_BEAT - TARGET_BEAT_MIN);
  }
  return (TARGET_BEAT_MAX - beat) / (TARGET_BEAT_MAX - DISTRESS_PEAK_BEAT);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/logic.js tests/logic.test.js
git commit -m "feat: add computeDistress triangular mapping"
```

---

### Task 3: updateSealProgress (TDD)

**Files:**
- Modify: `src/logic.js`
- Test: `tests/logic.test.js`

**Interfaces:**
- Consumes: `SEAL_THRESHOLD`, `SEAL_HOLD_SECONDS`, `SEAL_DECAY_FACTOR`, `clamp`
- Produces: `updateSealProgress(progress, distress, dt) -> number` in [0,1]. distress≥임계값이면 `dt/HOLD`만큼 충전, 아니면 `dt*DECAY/HOLD`만큼 감소, [0,1] 클램프.

- [ ] **Step 1: 실패하는 테스트 추가**

import 줄에 `updateSealProgress` 추가 후:
```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `updateSealProgress` undefined.

- [ ] **Step 3: 구현**

import에 상수 추가 + 함수 추가:
```js
import {
  TARGET_BEAT_MIN,
  TARGET_BEAT_MAX,
  DISTRESS_PEAK_BEAT,
  SEAL_THRESHOLD,
  SEAL_HOLD_SECONDS,
  SEAL_DECAY_FACTOR,
} from './config.js';
```
```js
// distress가 임계값 이상이면 1을 향해 충전, 아니면 관용적으로 감소.
export function updateSealProgress(progress, distress, dt) {
  const next = distress >= SEAL_THRESHOLD
    ? progress + dt / SEAL_HOLD_SECONDS
    : progress - (dt * SEAL_DECAY_FACTOR) / SEAL_HOLD_SECONDS;
  return clamp(next, 0, 1);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS (8 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/logic.js tests/logic.test.js
git commit -m "feat: add updateSealProgress charge/decay"
```

---

### Task 4: 상태머신 step (TDD)

**Files:**
- Modify: `src/logic.js`
- Test: `tests/logic.test.js`

**Interfaces:**
- Consumes: `updateSealProgress`, `CELEBRATE_SECONDS`, `IDLE_RETURN_SECONDS`
- Produces:
  - `initialState() -> { phase:'ATTRACT', sealProgress:0, idleSeconds:0, celebrateSeconds:0 }`
  - `step(state, { dt, distress, interacted }) -> state` — 순수 리듀서.
    - ATTRACT: `interacted`면 PLAY로(모든 카운터 0). 아니면 그대로.
    - PLAY: sealProgress 갱신, idleSeconds 갱신(interacted면 0). sealProgress≥1 → SEAL. idleSeconds≥IDLE_RETURN → ATTRACT.
    - SEAL: celebrateSeconds 누적. ≥CELEBRATE → ATTRACT(initialState).

- [ ] **Step 1: 실패하는 테스트 추가**

import에 `initialState, step` 추가 후:
```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `initialState`/`step` undefined.

- [ ] **Step 3: 구현**

import에 상수 추가 + 함수 추가:
```js
import {
  TARGET_BEAT_MIN,
  TARGET_BEAT_MAX,
  DISTRESS_PEAK_BEAT,
  SEAL_THRESHOLD,
  SEAL_HOLD_SECONDS,
  SEAL_DECAY_FACTOR,
  CELEBRATE_SECONDS,
  IDLE_RETURN_SECONDS,
} from './config.js';
```
```js
export function initialState() {
  return { phase: 'ATTRACT', sealProgress: 0, idleSeconds: 0, celebrateSeconds: 0 };
}

// 순수 리듀서. input = { dt(초), distress(0..1), interacted(boolean) }
export function step(state, input) {
  const { dt, distress, interacted } = input;
  switch (state.phase) {
    case 'ATTRACT':
      if (interacted) {
        return { phase: 'PLAY', sealProgress: 0, idleSeconds: 0, celebrateSeconds: 0 };
      }
      return state;
    case 'PLAY': {
      const sealProgress = updateSealProgress(state.sealProgress, distress, dt);
      const idleSeconds = interacted ? 0 : state.idleSeconds + dt;
      if (sealProgress >= 1) {
        return { phase: 'SEAL', sealProgress: 1, idleSeconds: 0, celebrateSeconds: 0 };
      }
      if (idleSeconds >= IDLE_RETURN_SECONDS) {
        return initialState();
      }
      return { ...state, sealProgress, idleSeconds };
    }
    case 'SEAL': {
      const celebrateSeconds = state.celebrateSeconds + dt;
      if (celebrateSeconds >= CELEBRATE_SECONDS) {
        return initialState();
      }
      return { ...state, celebrateSeconds };
    }
    default:
      return state;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS (15 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/logic.js tests/logic.test.js
git commit -m "feat: add ATTRACT/PLAY/SEAL state machine"
```

---

### Task 5: HTML 레이아웃 + manifest (수동 검증)

**Files:**
- Create: `index.html`
- Create: `manifest.json`

**Interfaces:**
- Consumes: (없음, 정적 마크업)
- Produces: DOM 요소 id — `#stage`, `#fire-canvas`, `#slider-left`, `#slider-right`, `#freq-left`, `#freq-right`, `#beat-label`, `#status-label`, `#seal-ring`(SVG `<circle>`). CSS 변수 `--distress`(0~1)로 비네팅·문양 발광 연동.

> 이 태스크와 이후 브라우저 태스크는 Web Audio/Canvas/DOM 특성상 자동 단위 테스트 대신 실기기 관찰로 검증한다(스펙 §7). 각 파일은 완전한 코드로 제공된다.

- [ ] **Step 1: manifest.json 작성**

```json
{
  "name": "도깨비불 봉인",
  "short_name": "도깨비불",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#05060a",
  "theme_color": "#05060a",
  "start_url": "./index.html"
}
```

- [ ] **Step 2: index.html 작성 (레이아웃 + 인라인 CSS)**

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <link rel="manifest" href="manifest.json" />
  <title>도깨비불 봉인</title>
  <style>
    :root { --distress: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #05060a; touch-action: none; }
    #stage {
      position: fixed; inset: 0;
      display: grid; grid-template-columns: 160px 1fr 160px; align-items: center;
      font-family: -apple-system, "Apple SD Gothic Neo", sans-serif; color: #cfe;
    }
    /* 괴로움 강도에 따른 배경 비네팅/발광 */
    #stage::after {
      content: ""; position: absolute; inset: 0; pointer-events: none;
      box-shadow: inset 0 0 calc(120px + var(--distress) * 260px)
        rgba(40, 120, 200, calc(0.25 + var(--distress) * 0.5));
      transition: box-shadow 0.1s linear;
    }
    .rail { display: flex; flex-direction: column; align-items: center; gap: 16px; z-index: 2; }
    /* 세로 슬라이더: 회전으로 세로화, 큰 히트영역 */
    input[type="range"] {
      writing-mode: vertical-lr; direction: rtl;
      width: 48px; height: 60vh; accent-color: #4fd; background: transparent;
    }
    .freq { font-size: 22px; font-variant-numeric: tabular-nums; }
    .caption { font-size: 15px; opacity: 0.7; }
    #center { position: relative; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    #fire-canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; }
    #ring-wrap { position: relative; z-index: 1; }
    #seal-ring { fill: none; stroke: #7ef; stroke-width: 6; stroke-linecap: round;
      filter: drop-shadow(0 0 8px #7ef); transform: rotate(-90deg); transform-origin: center; }
    #ring-bg { fill: none; stroke: rgba(120,200,255,0.15); stroke-width: 6; }
    #hud { position: absolute; bottom: 6vh; z-index: 2; text-align: center; }
    #beat-label { font-size: 20px; font-variant-numeric: tabular-nums; }
    #status-label { font-size: 24px; margin-top: 6px; letter-spacing: 0.03em; }
  </style>
</head>
<body>
  <div id="stage">
    <div class="rail">
      <input id="slider-left" type="range" />
      <div id="freq-left" class="freq">440 Hz</div>
      <div class="caption">좌 주파수</div>
    </div>

    <div id="center">
      <canvas id="fire-canvas"></canvas>
      <div id="ring-wrap">
        <svg width="280" height="280" viewBox="0 0 280 280">
          <circle id="ring-bg" cx="140" cy="140" r="120"></circle>
          <circle id="seal-ring" cx="140" cy="140" r="120"></circle>
        </svg>
      </div>
      <div id="hud">
        <div id="beat-label">현재 맥놀이: 0.0 Hz</div>
        <div id="status-label">결계를 흔들어 도깨비를 봉인하라</div>
      </div>
    </div>

    <div class="rail">
      <input id="slider-right" type="range" />
      <div id="freq-right" class="freq">440 Hz</div>
      <div class="caption">우 주파수</div>
    </div>
  </div>

  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: 수동 검증 (레이아웃)**

로컬 정적 서버로 열기: `python3 -m http.server 8000` 후 데스크톱 브라우저에서 `http://localhost:8000` 접속(모듈 로드는 `file://`에서 CORS로 막힐 수 있어 http 서버 사용).
Expected: 좌·우에 세로 슬라이더 + 주파수 라벨, 중앙에 봉인 링(SVG)과 하단 문구가 보인다. 콘솔에 `main.js` 404 외 다른 오류 없음(main.js는 아직 미작성이라 404 정상).

- [ ] **Step 4: 커밋**

```bash
git add index.html manifest.json
git commit -m "feat: add exhibit layout and web app manifest"
```

---

### Task 6: AudioEngine (수동 검증)

**Files:**
- Create: `src/audio.js`

**Interfaces:**
- Consumes: `src/logic.js`의 `clamp`
- Produces: `class AudioEngine`
  - `async resume(fLeft, fRight)` — 최초 1회 오실레이터·게인 생성 및 start, 이후 `ctx.resume()`. 반드시 사용자 제스처에서 호출.
  - `setFrequencies(fLeft, fRight)` — `setTargetAtTime`으로 부드럽게 갱신.
  - `setDistress(d)` — 신음(groan) 레이어 볼륨을 distress에 연동.
  - `fadeOut()` / `restore()` — 마스터 게인 페이드(봉인 정적 연출/복귀).

- [ ] **Step 1: audio.js 작성**

```js
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
```

- [ ] **Step 2: 수동 검증 (Task 9 통합 후 실기기에서)**

이 모듈 단독으로는 소리 검증이 어렵다. Task 9 통합 시 체크리스트에서 확인한다. 지금은 문법 오류만 확인:
Run: `node --check src/audio.js`
Expected: 오류 없음(출력 없음, 종료코드 0). (`window`는 참조만 하고 실행하지 않으므로 `--check` 통과.)

- [ ] **Step 3: 커밋**

```bash
git add src/audio.js
git commit -m "feat: add Web Audio beat engine with groan layer"
```

---

### Task 7: FireRenderer (수동 검증)

**Files:**
- Create: `src/fire.js`

**Interfaces:**
- Consumes: `src/logic.js`의 `clamp`
- Produces: `class FireRenderer`
  - `constructor(canvas)`
  - `resize(w, h)` — 캔버스 픽셀 크기 설정.
  - `setDistress(d)` / `setPhase(phase)`
  - `render(dt)` — 파티클 갱신·그리기. distress↑ → 작고 파랗고 떨리는 불꽃.

- [ ] **Step 1: fire.js 작성**

```js
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
```

- [ ] **Step 2: 문법 확인**

Run: `node --check src/fire.js`
Expected: 오류 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/fire.js
git commit -m "feat: add procedural dokkaebi fire particle renderer"
```

---

### Task 8: UI 모듈 (수동 검증)

**Files:**
- Create: `src/ui.js`

**Interfaces:**
- Consumes: `src/config.js`의 `FREQ_MIN`, `FREQ_MAX`, `FREQ_START`; `src/logic.js`의 `clamp`
- Produces: `class UI`
  - `constructor(root)` — `root`(예: `document`)에서 요소 조회, 슬라이더 min/max/초기값 설정, input 리스너 등록.
  - `get frequencies()` -> `[left, right]` (숫자)
  - `pollInteracted()` -> boolean (마지막 호출 이후 슬라이더 조작 있었으면 true, 그리고 리셋)
  - `setBeat(hz)` / `setStatus(text)` / `setDistress(d)` / `setSealProgress(p)`

- [ ] **Step 1: ui.js 작성**

```js
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
```

> 주의: `root`로 `document`를 넘기므로 `setDistress`에서 CSS 변수는 `root.documentElement`(= `<html>`)에 설정한다. 인터페이스 계약이니 Task 9에서 `new UI(document)`로 생성할 것.

- [ ] **Step 2: 문법 확인**

Run: `node --check src/ui.js`
Expected: 오류 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/ui.js
git commit -m "feat: add UI module for sliders, gauge and shake"
```

---

### Task 9: main.js 통합 + 전체 수동 체크리스트

**Files:**
- Create: `src/main.js`

**Interfaces:**
- Consumes: `AudioEngine`, `FireRenderer`, `UI`, `computeBeat`, `computeDistress`, `initialState`, `step`
- Produces: (진입점, export 없음) — rAF 루프에서 입력→로직→오디오/불/UI 출력 조립.

- [ ] **Step 1: main.js 작성**

```js
import { AudioEngine } from './audio.js';
import { FireRenderer } from './fire.js';
import { UI } from './ui.js';
import { computeBeat, computeDistress, initialState, step } from './logic.js';

const audio = new AudioEngine();
const ui = new UI(document);
const fire = new FireRenderer(document.querySelector('#fire-canvas'));

let state = initialState();
let last = performance.now();

function resize() {
  fire.resize(window.innerWidth, window.innerHeight);
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
  if (s.sealProgress > 0.02) return '결계가 흔들린다...';
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
    if (state.phase === 'ATTRACT') audio.restore();
  }

  const visualDistress = state.phase === 'SEAL' ? 1 : (state.phase === 'PLAY' ? playDistress : 0);
  audio.setDistress(state.phase === 'PLAY' ? playDistress : 0);
  fire.setPhase(state.phase);
  fire.setDistress(visualDistress);
  fire.render(dt);

  ui.setBeat(beat);
  ui.setDistress(visualDistress);
  ui.setSealProgress(state.sealProgress);
  ui.setStatus(statusText(state));

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

- [ ] **Step 2: 문법 확인 + 순수 로직 회귀**

Run: `node --check src/main.js && npm test`
Expected: `--check` 오류 없음, `npm test` 15 tests PASS.

- [ ] **Step 3: 데스크톱 브라우저 수동 검증**

`python3 -m http.server 8000` 후 `http://localhost:8000` 접속.
Expected 관찰:
- 화면 클릭 후 두 톤이 재생된다(슬라이더가 같으면 맥놀이 없음).
- 한쪽 슬라이더를 움직여 차이를 3~4Hz로 만들면 wah-wah 맥놀이가 들리고, 도깨비불이 파랗게 위축·떨리며 화면이 미세하게 흔들리고 봉인 링이 찬다.
- 링이 다 차면 "도깨비를 봉인했다!" 연출 후 약 4초 뒤 초기화된다.
- 조작을 멈추고 20초 지나면 유휴(ATTRACT) 문구로 복귀한다.
- 콘솔 오류 없음.

- [ ] **Step 4: 아이패드 사파리 실기기 체크리스트**

같은 서버에 아이패드 사파리로 접속(또는 파일 반입). 가로·전체화면(홈화면 추가) 확인:
- [ ] 첫 터치 후 소리 재생(무음 스위치/볼륨 확인)
- [ ] 슬라이더 조작 시 부드러운 주파수 변화(클릭·지직음 없음)
- [ ] 목표 구간에서 도깨비불·화면 흔들림·신음이 함께 강해짐
- [ ] 3초 유지 시 봉인 성공 + 4초 후 자동 초기화
- [ ] 20초 무입력 시 ATTRACT 복귀
- [ ] 가로 전체화면 유지, 스크롤/확대 안 됨

- [ ] **Step 5: 커밋**

```bash
git add src/main.js
git commit -m "feat: integrate audio, fire and UI in rAF loop"
```

---

## 최종 튜닝 (구현 후)

실기기에서 아래 값을 `src/config.js`에서 조정한다(코드 변경 불필요):
- 맥놀이가 너무 쉽게/어렵게 봉인되면 `SEAL_THRESHOLD`, `SEAL_HOLD_SECONDS`.
- 소리가 크면 `audio.js`의 마스터 게인(0.25) 하향.
- 목표 구간 폭은 `TARGET_BEAT_MIN/MAX`, 피크는 `DISTRESS_PEAK_BEAT`.

## Notes on Verification Strategy

- 순수 로직(`config`, `logic`)만 `node --test`로 자동 검증 — 의존성 0, 오프라인 유지.
- 출력 계층(`audio`/`fire`/`ui`/`main`)은 브라우저 API 특성상 자동 단위 테스트 대신 `node --check` 문법 검증 + 실기기 관찰 체크리스트로 검증(스펙 §7과 일치). 이는 의도된 한계이며, 로직/연출 분리 설계 덕분에 판정 정확성은 순수 테스트가 보장한다.
