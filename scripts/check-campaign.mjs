import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// 실제 홍보 대응표를 건드리지 않는 임시 작업 폴더에서 등록·동결 규칙을 검사한다.
const root = await mkdtemp(join(tmpdir(), 'swai-campaign-check-'));
await mkdir(join(root, 'public')); await mkdir(join(root, 'scripts'));
await writeFile(join(root, 'package.json'), '{"type":"module"}');
for (const file of ['public/campaigns.js','scripts/add-campaign.mjs']) await copyFile(new URL('../' + file, import.meta.url), join(root, file));
const invoke = (...args) => spawnSync(process.execPath, [join(root, 'scripts/add-campaign.mjs'), ...args], { encoding: 'utf8' });
assert.notEqual(invoke('c1','kakao','chat-unspecified','-','-','1').status, 0, 'c1 호환 주소를 새 게시물로 재사용 금지');
assert.equal(invoke('e01','everytime','yonsei-free','20261103','0900','1').status, 0);
const first = await readFile(join(root, 'public/campaigns.js'), 'utf8');
assert(first.includes('20261103'));
assert.notEqual(invoke('e01','everytime','yonsei-free','20261104','1900','2').status, 0, '확정한 코드를 새 글에 재사용 금지');
assert.equal(await readFile(join(root, 'public/campaigns.js'), 'utf8'), first);
assert.notEqual(invoke('e04','everytime','yonsei-free','20260230','0900','1').status, 0);
assert.notEqual(invoke('e04','everytime','yonsei-free','20261103','2500','1').status, 0);
assert.equal(invoke('e04','everytime','yonsei-free','20261103','1900','2').status, 0);
const table = await readFile(join(root, 'PROMOTION.md'), 'utf8');
assert(table.includes('/r/e04') && table.includes('1900') && table.includes('미게시'));
assert.equal(invoke('d5','dcinside','web-game','-','-','2').status, 0, '게시 전에도 예약 가능');
assert.equal(invoke('d5','dcinside','programming','-','-','2').status, 1, '예약 출처 변경 차단');
assert.equal(invoke('d5','dcinside','web-game','20261103','1200','2','https://example.test/post/1').status, 0);
assert.equal(invoke('d5','dcinside','web-game','20261103','1200','2','https://example.test/post/2').status, 1, '확정 원문 재사용 차단');
assert((await readFile(join(root, 'PROMOTION.md'), 'utf8')).includes('https://savecs.netlify.app/d5'));
console.log('PASS · 임시 폴더의 홍보 코드 등록·재사용 차단·날짜/시각 검사·관리표 생성');
