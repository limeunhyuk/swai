import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGame, choose, advance } from '../public/game.js';

const content = JSON.parse(await readFile(new URL('../public/content.json', import.meta.url), 'utf8'));
const profile = { gender: 'male', mbti: 'INTP' };
assert.equal(content.scenes.length, 8);
assert.equal(content.stats.length, 7);
assert.equal(content.result.jobs.length, 2);
assert.equal(content.profile.mbti.length, 16);
assert.equal(new Set(content.profile.mbti).size, 16);
const ids = new Set(content.stats.map(stat => stat.id));
const choiceIds = new Set();
for (const [index, scene] of content.scenes.entries()) {
  assert.equal(scene.year, Math.floor(index / 2) + 1);
  assert.equal(scene.semester, index % 2 + 1);
  assert.equal(scene.kind, index % 2 === 0 ? '생활' : '진로');
  assert.equal(scene.choices.length, 3);
  for (const [choiceIndex, choice] of scene.choices.entries()) {
    assert.equal(choice.id, `${scene.id}_${'abc'[choiceIndex]}`);
    assert(!choiceIds.has(choice.id));
    choiceIds.add(choice.id);
    assert(choice.label.trim() && choice.feedback.trim());
    for (const [id, effect] of Object.entries(choice.effects)) {
      assert(ids.has(id));
      assert(Number.isInteger(effect) && effect !== 0);
    }
  }
}
assert.equal(choiceIds.size, 24);
for (const job of content.result.jobs) {
  assert.equal(new URL(job.url).protocol, 'https:');
  assert(job.company && job.title && job.checkedAt);
}
assert.throws(() => createGame(content, { gender: '', mbti: '' }));
assert.throws(() => createGame(content, { gender: 'male', mbti: '' }));
assert.throws(() => createGame(content, { gender: '', mbti: 'INTP' }));
assert.throws(() => createGame(content, { gender: 'other', mbti: 'NOPE' }));

// 손으로 계산한 기준 경로와 전수 검사로 서로 다른 종류의 오류를 확인한다.
const fixtures = [
  { path: 'aaaaaaaa', stats: { study: 0, making: 7, teamwork: 1, inquiry: 0, money: 3, relations: 10, mental: 4 } },
  { path: 'bbbbbbbb', stats: { study: 2, making: 2, teamwork: 1, inquiry: 4, money: 5, relations: 7, mental: 2 } },
  { path: 'cccccccc', stats: { study: 3, making: 0, teamwork: 4, inquiry: 3, money: 10, relations: 3, mental: 0 } }
];
function play(path, settings = profile) {
  let state = createGame(content, settings);
  for (const [index, letter] of [...path].entries()) {
    state = choose(content, state, `${content.scenes[index].id}_${letter}`);
    state = advance(content, state);
  }
  return state;
}
for (const fixture of fixtures) {
  assert.deepEqual(play(fixture.path).stats, fixture.stats, fixture.path);
  // 성별·MBTI의 32개 설정은 스탯과 결과에 영향을 주지 않는다.
  for (const gender of content.profile.genders) {
    for (const mbti of content.profile.mbti) {
      assert.deepEqual(play(fixture.path, { gender: gender.id, mbti }).stats, fixture.stats);
    }
  }
}

let completed = 0;
let capped = 0;
function explore(state) {
  if (state.screen === 'result') {
    assert.equal(state.history.length, 8);
    assert.equal(state.sceneIndex, 7);
    assert.strictEqual(advance(content, state), state);
    assert.strictEqual(choose(content, state, 's42_a'), state);
    assert(content.result.role && content.result.jobs.every(job => job.url));
    completed++;
    return;
  }
  assert.strictEqual(advance(content, state), state, '선택 전 진행 방지');
  assert.strictEqual(choose(content, state, 'invalid'), state);
  const scene = content.scenes[state.sceneIndex];
  for (const choice of scene.choices) {
    const before = structuredClone(state);
    const selected = choose(content, state, choice.id);
    assert.deepEqual(state, before, '이전 상태 불변');
    assert.equal(selected.history.length, state.sceneIndex + 1);
    assert.equal(selected.history.at(-1).choiceId, choice.id);
    assert.equal(selected.history.at(-1).label, choice.label);
    for (const stat of content.stats) {
      const value = selected.stats[stat.id];
      assert(Number.isInteger(value) && value >= stat.min && value <= stat.max);
      if (Object.hasOwn(choice.effects, stat.id)) {
        const actual = selected.history.at(-1).changes[stat.id];
        assert.equal(actual, value - before.stats[stat.id]);
        if (actual !== choice.effects[stat.id]) capped++;
      } else assert.equal(value, before.stats[stat.id]);
    }
    for (const again of scene.choices) {
      assert.strictEqual(choose(content, selected, again.id), selected, '선택 변경·중복 반영 방지');
    }
    explore(advance(content, selected));
  }
}
explore(createGame(content, profile));
assert.equal(completed, 6561);
assert(capped > 0, '상·하한 적용 경로 포함');
const upper = createGame(content, profile);
upper.stats.money = 9;
const bounded = choose(content, upper, 's11_c');
assert.equal(bounded.stats.money, 10);
assert.equal(bounded.history[0].changes.money, 1);
console.log(`PASS · 8학기 / 24선택 · ${completed.toLocaleString()}조합 완주 · 스탯 범위·실제 증감·중복 방지 · 32프로필 × 3기준 경로`);
