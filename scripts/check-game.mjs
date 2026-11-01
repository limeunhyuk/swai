import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { INITIAL_GPA, createGame, choose, advance, rollGrade } from '../public/game.js';

const content = JSON.parse(await readFile(new URL('../public/content.json', import.meta.url), 'utf8'));
const profile = { gender: 'male' };
assert.equal(content.semesters.length, 4);
assert.equal(content.stats.length, 7);
assert.equal(content.scenes.length, 16);
assert.equal(content.careers.length, 3);
assert.equal(new Set(content.scenes.map(scene => scene.id)).size, 16);
assert.equal(content.profile.mbti, undefined);
assert.equal(INITIAL_GPA, 3.5);
const statIds = new Set(content.stats.map(stat => stat.id));
const choiceIds = new Set();
for (const [index, semester] of content.semesters.entries()) {
  assert.equal(semester.year, 3 + Math.floor(index / 2));
  assert.equal(semester.semester, index % 2 + 1);
  assert.equal(semester.life.length, 3);
  for (const id of [semester.career, ...semester.life]) {
    const scene = content.scenes.find(item => item.id === id);
    assert(scene);
    assert.equal(scene.year, semester.year); assert.equal(scene.semester, semester.semester);
  }
}
for (const scene of content.scenes) {
  assert.equal(scene.choices.length, 3);
  for (const choice of scene.choices) {
    assert(!choiceIds.has(choice.id)); choiceIds.add(choice.id);
    assert(choice.label && choice.feedback);
    for (const [id, value] of Object.entries(choice.effects)) {
      assert(statIds.has(id)); assert(Number.isInteger(value) && value !== 0 && Math.abs(value) <= 2);
    }
    assert.equal(Object.values(choice.effects).reduce((sum, value) => sum + value, 0), 2, `${choice.id}: 선택 보상 균형`);
    if (choice.experience) assert(choice.experience.type && choice.experience.title && choice.experience.detail);
  }
}
assert.equal(choiceIds.size, 48);
assert.equal(new Set(content.careers.flatMap(career => career.jobs.map(job => job.id))).size, 6);
for (const career of content.careers) {
  assert(career.label && career.title && career.title !== career.label);
  assert.equal(career.jobs.length, 2);
  for (const job of career.jobs) {
    assert(job.company && job.title && job.tasks.length && job.skills.length && job.conditions.length);
    assert.match(job.url, /^https:\/\/careers\.upstage\.ai\/ko\/o\/\d+$/);
    assert.equal(job.checkedAt, '2026-11-02');
    assert(job.deadline === null || job.deadline >= '2026-11-06');
    assert(job.deadlineLabel);
  }
}
assert.throws(() => createGame(content, { gender: '' }));
for (const [names, expected] of [[{}, '김컴공'], [{ surname: '박' }, '박컴공'], [{ givenName: '민수' }, '김민수'], [{ surname: '  ', givenName: ' ' }, '김컴공'], [{ surname: ' 이 ', givenName: ' 코드 ' }, '이코드']]) {
  assert.equal(createGame(content, { ...profile, ...names }).profile.name, expected);
}

let completed = 0;
const covered = new Set();
function play(initial, strategy, gradeRandom = () => 0.5) {
  let state = initial;
  const expectedExperiences = [];
  assert.equal(new Set(state.scenes.map(scene => scene.id)).size, 12);
  assert.equal(state.gpa, INITIAL_GPA);
  for (let index = 0; index < 12; index++) {
    const scene = state.scenes[index]; covered.add(scene.id);
    assert.equal(scene.kind === '진로', index % 3 === 0);
    assert.strictEqual(advance(content, state), state, '선택 전 진행 금지');
    assert.strictEqual(choose(content, state, 'invalid'), state);
    const choice = scene.choices[(strategy + index) % 3];
    const before = structuredClone(state);
    const selected = choose(content, state, choice.id);
    assert.deepEqual(state, before, '선택이 이전 상태를 변경하면 안 됨');
    assert.equal(selected.history.length, index + 1);
    for (const again of scene.choices) assert.strictEqual(choose(content, selected, again.id), selected, '중복 선택 방지');
    for (const stat of content.stats) {
      assert(selected.stats[stat.id] >= stat.min && selected.stats[stat.id] <= stat.max);
      if (Object.hasOwn(choice.effects, stat.id)) assert.equal(selected.history.at(-1).changes[stat.id], selected.stats[stat.id] - before.stats[stat.id]);
    }
    if (choice.experience) expectedExperiences.push(choice.experience.title);
    state = advance(content, selected);
    if ((index + 1) % 3 === 0) {
      assert.equal(state.screen, 'grade');
      assert.strictEqual(advance(content, state), state, '룰렛 전 학기 진행 금지');
      state = rollGrade(content, state, gradeRandom);
      assert.equal(state.grades.length, (index + 1) / 3);
      assert(state.gpa >= 0 && state.gpa <= 4.5);
      assert.strictEqual(rollGrade(content, state), state, '학점 중복 반영 방지');
      state = advance(content, state);
    }
  }
  assert.equal(state.screen, 'result'); assert.equal(state.grades.length, 4);
  assert.equal(state.history.length, 12); assert(state.gpa > INITIAL_GPA);
  assert(state.grades.at(-1).gpa > state.grades[0].gpa, '졸업까지 전반적으로 상승');
  assert.deepEqual(state.experiences.map(item => item.title), expectedExperiences, '선택하지 않은 경험을 기재하면 안 됨');
  assert.strictEqual(advance(content, state), state);
  assert.strictEqual(choose(content, state, 'career42_a'), state);
  completed++;
  return state;
}

// 학기별 일상 사건 두 개의 순서 6가지 × 4학기의 모든 1,296가지 구성을 검사한다.
for (let schedule = 0; schedule < 6 ** 4; schedule++) {
  let value = schedule;
  const samples = [];
  for (let term = 0; term < 4; term++) {
    const permutation = value % 6; value = Math.floor(value / 6);
    samples.push((Math.floor(permutation / 2) + 0.5) / 3, (permutation % 2 + 0.5) / 2);
  }
  let cursor = 0;
  play(createGame(content, profile, () => samples[cursor++]), schedule % 3);
}
for (const gender of content.profile.genders) for (const strategy of [0, 1, 2]) for (const sample of [0, 0.999999]) {
  play(createGame(content, { gender: gender.id }, () => 0.5), strategy, () => sample);
}
assert.equal(covered.size, 16);
for (const boundary of [0, 10]) for (const sample of [0, 0.999999]) {
  let state = createGame(content, profile);
  state.stats.study = boundary; state.stats.inquiry = boundary;
  for (let term = 0; term < 4; term++) {
    state = rollGrade(content, { ...state, screen: 'grade', sceneIndex: term * 3 + 2 }, () => sample);
    assert(state.gpa >= INITIAL_GPA && state.gpa <= 4.5);
  }
  assert(state.grades[1].gpa < state.grades[0].gpa, '중간에 내려가는 학기도 표현');
  assert(state.grades.at(-1).gpa > state.grades[0].gpa);
}
// 모든 개별 선택이 스탯 상·하한에서도 안전한지 확인한다.
for (const scene of content.scenes) for (const choice of scene.choices) for (const boundary of [0, 10]) {
  const state = createGame(content, profile); state.scenes[0] = scene;
  for (const stat of content.stats) state.stats[stat.id] = boundary;
  const next = choose(content, state, choice.id);
  for (const stat of content.stats) assert(next.stats[stat.id] >= 0 && next.stats[stat.id] <= 10);
}
console.log(`PASS · 16사건/48선택 균형 · 1,296개 사건 구성 + 성별/선택/룰렛 경계 12경로 = ${completed}회 완주 · 3.5 시작·상승/하락·실제 공고 6개·실제 경험·중복 방지·상하한`);
