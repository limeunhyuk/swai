import assert from 'node:assert/strict';
import { publicCounts, koreanDay } from '../netlify/functions/lib/public-counts.mjs';
import handler from '../netlify/functions/stats.mjs';
import { legacyInsert, validateRecord } from '../netlify/functions/record.mjs';
import { sourceForUrl } from '../public/campaigns.js';

const now = new Date('2026-11-02T03:00:00Z');
const make = (event_id, visitor_id, event_type, run_id, timestamp, extra = {}, schema = 3) => legacyInsert({
  kind: 'event', event_id, visitor_id, visit_id: 'visit-' + event_id, event_type, run_id, source: 'dc', device: 'desktop',
  mode: 'game', is_test: false, content_version: 'test', ...extra
}, new Date(timestamp), schema).data;
const firstStart = make('start-1','a','start','run-1','2026-11-02T01:00:00Z');
const rows = [
  make('visit-old','a','visit','','2026-11-01T14:59:59Z'),
  { ...make('visit-today','a','visit','','2026-11-01T15:00:00Z'), time_stamp: '2026-11-01T15:00:00.000Z' },
  make('visit-repeat','a','visit','','2026-11-02T01:00:00Z'),
  make('visit-b','b','visit','','2026-11-02T01:00:00Z'),
  make('start-old','a','start','run-old','2026-11-01T14:00:00Z'), firstStart, firstStart,
  make('start-duplicate-run','a','start','run-1','2026-11-02T01:00:00Z'),
  make('start-2','a','start','run-2','2026-11-02T02:00:00Z'),
  make('preview','a','instant_start','preview-1','2026-11-02T02:00:00Z',{mode:'instant'}),
  make('test-visit','qa','visit','','2026-11-02T01:00:00Z',{is_test:true}),
  make('test-start','qa','start','qa-run','2026-11-02T01:00:00Z',{is_test:true}),
  make('legacy-visit','c','visit','','2026-11-01T10:00:00Z',{},2),
  make('legacy-start','c','start','legacy-run','2026-11-01T10:00:00Z',{},2)
];
const expected = publicCounts(rows, now);
assert.deepEqual(expected.today, {visitors:2,students:2});
assert.deepEqual(expected.total, {visitors:3,students:4});
assert.equal(expected.day,'2026-11-02');
assert.equal(koreanDay('2026-11-01 23:59:59'),'2026-11-01');
assert.equal(koreanDay('2026-11-01T15:00:00Z'),'2026-11-02');
assert.deepEqual(publicCounts([],now).total,{visitors:0,students:0});
assert.equal(sourceForUrl(new URL('https://example.test/d5?test=1')),'dc');
assert.equal(validateRecord({kind:'event',event_id:'d5-event',visitor_id:'v',visit_id:'visit',event_type:'visit',source:'dc',campaign_code:'d5',content_version:'test'}).board_label,'웹게임 개발 갤러리');

const originalFetch = globalThis.fetch, originalUrl = process.env.APPS_SCRIPT_URL;
const request = new Request('https://example.test/.netlify/functions/stats');
try {
  delete process.env.APPS_SCRIPT_URL;
  assert.equal((await handler(request)).status,503);
  process.env.APPS_SCRIPT_URL = 'https://script.google.com/macros/s/test/exec';
  globalThis.fetch = async url => {
    assert.equal(new URL(url).searchParams.get('action'),'read');
    assert.equal(new URL(url).searchParams.get('table'),'tab_master');
    return new Response('swai_counts('+JSON.stringify({success:true,data:rows})+')');
  };
  const response = await handler(request), result = await response.json();
  assert.equal(response.status,200); assert.deepEqual(result.total,expected.total);
  assert.deepEqual(Object.keys(result).sort(),['day','ok','today','total','updatedAt']);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.match(response.headers.get('Netlify-CDN-Cache-Control'),/^public, durable, max-age=(?:[1-9]|[1-5][0-9]|60)$/);
  assert.equal((await handler(new Request(request.url,{method:'POST'}))).status,405);
  globalThis.fetch = async () => new Response('swai_counts({"success":false})');
  const failed = await handler(request); assert.equal(failed.status,502); assert.deepEqual(await failed.json(),{ok:false});
} finally {
  globalThis.fetch = originalFetch;
  if(originalUrl === undefined) delete process.env.APPS_SCRIPT_URL; else process.env.APPS_SCRIPT_URL = originalUrl;
}
console.log('PASS · 한국 날짜 경계·브라우저 중복 제외·재시작 학생 수·예시/테스트 제외·구형/신형 기록·집계값만 응답·실패 처리·d5 연결');
