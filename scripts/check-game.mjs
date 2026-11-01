import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { INITIAL_GPA, MAX_GPA, createGame, choose, advance, rollGrade, currentScene, resultCareer, createExample } from '../public/game.js';
const content = JSON.parse(await readFile(new URL('../public/content.json', import.meta.url), 'utf8'));
const paths = content.careers.map(item => item.id);
assert.deepEqual(paths, ['project', 'certificate', 'intern']);
assert.equal(INITIAL_GPA, 3.5); assert.equal(MAX_GPA, 4.3); assert.equal(content.profile, undefined);
for (const [names, expected] of [[{}, '김컴공'], [{ surname: '박' }, '박컴공'], [{ givenName: '민수' }, '김민수'], [{ surname: ' ', givenName: ' ' }, '김컴공']]) assert.equal(createGame(content, names).profile.name, expected);
const scenes = [...content.scenes, ...Object.values(content.pathScenes).flatMap(Object.values)];
for (const scene of scenes) {
  assert(scene.choices.length >= 2 && scene.choices.length <= 3);
  for (const choice of scene.choices) {
    assert.equal(Object.values(choice.effects).reduce((a,b) => a+b,0), 2);
    for (const [id, amount] of Object.entries(choice.effects)) { assert(content.stats.some(stat => stat.id === id)); assert(Number.isInteger(amount) && Math.abs(amount) <= 2); }
  }
}
let completed = 0; const schedules = new Set(); const covered = new Set();
const samples = [[.99,.75],[.99,.25],[.1,.75]];
for(let schedule=0;schedule<81;schedule++) for(const initial of paths) for(const final of paths) for(let strategy=0;strategy<3;strategy++) {
  let value=schedule, randoms=[]; for(let t=0;t<4;t++){randoms.push(...samples[value%3]);value=Math.floor(value/3);}let cursor=0;
  let state=createGame(content,{},()=>randoms[cursor++]);assert.equal(state.scenes.length,8);schedules.add(state.scenes.map(s=>s.id).join(','));
  const expected=[];
  for(let index=0;index<8;index++) {
    const scene=currentScene(content,state); covered.add(scene.id+':'+(index%2===0?state.direction:''));
    assert.equal(scene.kind==='진로',index%2===0);assert.strictEqual(advance(content,state),state);assert.strictEqual(choose(content,state,'invalid'),state);
    const choice=index===0?scene.choices.find(c=>c.direction===initial):index===4?(initial===final?scene.choices[0]:scene.choices.find(c=>c.direction===final)):scene.choices[strategy%scene.choices.length];
    const before=structuredClone(state);const selected=choose(content,state,choice.id);assert.deepEqual(state,before);assert.strictEqual(choose(content,selected,choice.id),selected);
    assert(currentScene(content,selected).choices.some(item => item.id === choice.id), '방향 변경 직후에도 방금 선택한 사건과 피드백 유지');
    if(choice.experience)expected.push(choice.experience.title);
    for(const stat of content.stats){assert(selected.stats[stat.id]>=0&&selected.stats[stat.id]<=10);if(Object.hasOwn(choice.effects,stat.id))assert.equal(selected.history.at(-1).changes[stat.id],selected.stats[stat.id]-state.stats[stat.id]);}
    state=advance(content,selected);
    if(index%2===1){assert.equal(state.screen,'grade');assert.strictEqual(advance(content,state),state);state=rollGrade(content,state,()=>strategy/2);assert(state.gpa<=MAX_GPA);assert.strictEqual(rollGrade(content,state),state);state=advance(content,state);}
  }
  assert.equal(state.screen,'result');assert.equal(state.history.length,8);assert.equal(state.grades.length,4);assert.equal(state.direction,final);assert.equal(resultCareer(content,state).id,final);assert.deepEqual(state.experiences.map(x=>x.title),expected);assert(state.gpa>INITIAL_GPA);assert.strictEqual(advance(content,state),state);completed++;
}
assert.equal(schedules.size,81);
for(const path of paths){const example=createExample(content,path);assert.equal(example.mode,'instant');assert.equal(example.career.id,path);assert.equal(example.history.length,8);assert.equal(example.profile.name,'김컴공');}
for(const boundary of [0,10])for(const sample of [0,.99999]){let state=createGame(content);state.stats.study=boundary;state.stats.inquiry=boundary;for(let term=0;term<4;term++)state=rollGrade(content,{...state,screen:'grade',sceneIndex:term*2+1},()=>sample);assert(state.grades[1].gpa<state.grades[0].gpa);assert(state.gpa>INITIAL_GPA&&state.gpa<=MAX_GPA);}
for(const scene of scenes)for(const choice of scene.choices)for(const boundary of [0,10]){const state=createGame(content);state.scenes[0]=scene;for(const stat of content.stats)state.stats[stat.id]=boundary;const next=choose(content,state,choice.id);for(const stat of content.stats)assert(next.stats[stat.id]>=0&&next.stats[stat.id]<=10);}
for(const career of content.careers){assert(career.title&&career.field);assert.equal(career.jobs.length,2);for(const job of career.jobs){assert.match(job.url,/^https:\/\//);assert(job.checkedAt);assert(!job.deadline||job.deadline>='2026-11-06');}}
console.log(`PASS · ${completed}회 완주 · 81사건 구성×3첫방향×3최종방향×3선택 전략 · 예시 3종·준비 기록·4.3 학점·중복 방지·상하한·실제 공고`);
