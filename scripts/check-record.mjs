import assert from 'node:assert/strict';
import handler, { validateRecord, legacyInsert } from '../netlify/functions/record.mjs';
import { decodeLegacyRows, parseCsv } from './legacy-rows.mjs';
import { buildSummary } from './summary.mjs';

const base = { visitor_id: 'visitor-1', visit_id: 'visit-1', run_id: 'run-1', source: 'community-a', content_version: 'test', is_test: false };
const event = { ...base, kind: 'event', event_id: 'event-1', event_type: 'visit' };
assert(validateRecord(event));
assert.equal(validateRecord({ ...event, event_type: 'start' }), null);
assert(validateRecord({ ...event, event_type: 'start', gender: 'male', mbti: 'INTP' }));
assert(validateRecord({ ...event, event_type: 'start', gender: 'female' }), 'MBTI 없이 시작 기록 가능');
assert.equal(validateRecord({ ...event, event_type: 'start', gender: 'male', mbti: 'invalid' }), null);
assert.equal(validateRecord({ ...event, event_type: 'job_click', job_id: '' }), null);
const feedback = { ...base, kind: 'feedback', feedback_id: 'feedback-1', text: '', email: 'qa@example.com' };
assert(validateRecord(feedback), '이메일만 제출 가능');
assert(validateRecord({ ...feedback, text: '의견', email: '' }), '의견만 제출 가능');
assert.equal(validateRecord({ ...feedback, text: ' ', email: '' }), null);
assert.equal(validateRecord({ ...feedback, email: 'invalid' }), null);
assert.equal(validateRecord({ ...feedback, text: 'x'.repeat(1001) }), null);
const request = payload => new Request('http://localhost/.netlify/functions/record', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(payload) });
const originalFetch = globalThis.fetch, originalUrl = process.env.APPS_SCRIPT_URL;
try {
  delete process.env.APPS_SCRIPT_URL;
  assert.equal((await handler(request(event))).status, 503, '미연결을 저장 성공으로 표시하면 안 됨');
  process.env.APPS_SCRIPT_URL = 'https://script.google.com/macros/s/test/exec';
  globalThis.fetch = async () => { throw new Error('network'); };
  assert.equal((await handler(request(event))).status, 502);
  assert.equal((await handler(request({ ...event, visitor_id: '' }))).status, 400);
  let savedTable;
  globalThis.fetch = async target => {
    const query = new URL(target).searchParams;
    assert.equal(query.get('action'), 'insert');
    savedTable = query.get('table');
    const data = JSON.parse(query.get('data'));
    return new Response(`swai_saved(${JSON.stringify({ success: true, data })})`);
  };
  assert.equal((await handler(request(event))).status, 200); assert.equal(savedTable, 'tab_master');
  assert.equal((await handler(request(feedback))).status, 200); assert.equal(savedTable, 'tab_final');
  const mapped = legacyInsert(validateRecord(event));
  assert.equal(mapped.data.id, base.visitor_id); assert.equal(mapped.data.utm, base.source);
  assert.equal(new URL(mapped.data.landingUrl).searchParams.get('event_id'), event.event_id);
  assert.equal(JSON.parse(legacyInsert(validateRecord(feedback)).data.advice).email, feedback.email);
  globalThis.fetch = async () => new Response('swai_saved({"success":true,"data":{}})');
  assert.equal((await handler(request(event))).status, 502, '기존 API도 저장 요청의 응답 내용을 확인');
} finally {
  globalThis.fetch = originalFetch;
  for (const [key, value] of [['APPS_SCRIPT_URL', originalUrl]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}

assert.equal(legacyInsert({ ...validateRecord(event), source: '=IMPORTXML("url")' }).data.utm, "'=IMPORTXML(\"url\")", '셀 수식 주입 방지');
const events = [
  { ...base, event_type: 'visit' },
  { ...base, event_type: 'start' },
  { ...base, event_type: 'complete' },
  { ...base, event_type: 'job_click' },
  { ...base, event_type: 'job_click' },
  { ...base, visit_id: 'visit-2', event_type: 'visit' },
  { ...base, source: 'community-b', visit_id: 'visit-3', event_type: 'visit' },
  { ...base, source: 'community-b', visit_id: 'visit-3', run_id: 'run-2', event_type: 'start' },
  { ...base, source: 'community-b', visit_id: 'visit-3', run_id: 'missing-run', event_type: 'complete' },
  { ...base, visitor_id: 'test-visitor', event_type: 'visit', is_test: true }
];
const comments = [
  { ...base, feedback_id: 'f1', text: '', email: 'qa@example.com' },
  { ...base, feedback_id: 'f2', text: '의견', email: '' },
  { ...base, feedback_id: 'f3', text: '테스트', email: '', is_test: true }
];
const summary = buildSummary(events, comments);
const total = summary.find(row => row[0] === '전체'), a = summary.find(row => row[0] === 'community-a'), b = summary.find(row => row[0] === 'community-b');
assert.equal(total[1], 1, '출처별 고유 인원을 더하면 안 됨'); assert.equal(total[2], 3);
assert.equal(a[1], 1); assert.equal(a[2], 2); assert.equal(a[6], 1, '반복 클릭은 한 브라우저');
assert.equal(a[7], 1); assert.equal(a[8], 1); assert.equal(a[9], 1);
assert.equal(b[5], 0, '시작이 없는 판의 완료는 비율에 포함하지 않음');
assert.equal(a[10], 2); assert.equal(a[11], 1); assert.equal(a[12], 1);
assert.equal(buildSummary([], [])[0][7], '', '분모 0은 빈 값');
const legacyEvents = events.map((item, index) => legacyInsert({ ...item, kind: 'event', event_id: `legacy-${index}`, content_version: 'test' }).data);
const legacyFeedback = comments.map(item => legacyInsert({ ...item, kind: 'feedback' }).data);
const decoded = decodeLegacyRows([...legacyEvents, legacyEvents[0], { id: 'old', landingUrl: 'https://old.example/' }], [...legacyFeedback, legacyFeedback[0], { advice: '과거 의견' }]);
assert.equal(decoded.events.length, events.length);
assert.equal(decoded.feedback.length, comments.length);
assert.deepEqual(buildSummary(decoded.events, decoded.feedback), summary, '기존 두 시트로도 같은 출처별 집계가 나와야 함');
assert.deepEqual(parseCsv('\uFEFFid,advice\r\n1,"쉼표, 줄바꿈\n인용 ""문장"""\r\n'), [{ id: '1', advice: '쉼표, 줄바꿈\n인용 "문장"' }]);
console.log('PASS · 기록 입력·이메일 선택·미연결/실패/ID 확인 · 커뮤니티 집계·브라우저 중복·테스트 제외·피드백 구분');

// 브라우저 모듈의 유입 고정·재전송 ID·저장소 차단 동작도 검증한다.
const { createTracker, readLocal, writeLocal } = await import('../public/tracking.js');
const savedGlobals = { location: globalThis.location, localStorage: globalThis.localStorage, fetch: globalThis.fetch };
try {
  globalThis.location = { href: 'https://example.test/?utm=community-a', hostname: 'example.test', origin: 'https://example.test', pathname: '/' };
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  writeLocal('test', 'remember'); assert.equal(readLocal('test'), 'remember');
  const posts = [];
  globalThis.fetch = async (url, options) => {
    if (!options?.body) return Response.json({ enabled: true });
    const payload = JSON.parse(options.body); posts.push(payload);
    return Response.json({ ok: true, id: payload.event_id || payload.feedback_id });
  };
  const tracker = createTracker('test');
  await tracker.event('visit');
  assert.equal(posts.length, 1);
  globalThis.location.href = 'https://example.test/?utm=changed';
  await tracker.event('start', { run_id: 'run-1', gender: 'male' });
  assert.equal(posts.at(-1).source, 'community-a', '방문 중 URL 변경과 무관하게 출처 유지');
  assert.equal(posts[0].visit_id, posts.at(-1).visit_id);
  const sameBrowser = createTracker('test');
  assert.equal(sameBrowser.context.visitor_id, tracker.context.visitor_id);
  assert.notEqual(sameBrowser.context.visit_id, tracker.context.visit_id);
  let legacyAttempts = 0;
  globalThis.fetch = async (url, options) => {
    if (!options?.body) return Response.json({ enabled: true });
    legacyAttempts++;
    return Response.json({ ok: false }, { status: 502 });
  };
  await createTracker('test').event('visit');
  assert.equal(legacyAttempts, 1, '기존 insert API는 응답 유실 시 중복 쓰기 방지를 위해 자동 재시도하지 않음');
  globalThis.fetch = async () => Response.json({ enabled: false });
  const disabled = createTracker('test'); await disabled.event('visit');
  assert.equal(posts.length, 2, '미연결 서버에 행동 전송을 반복하지 않음');
} finally {
  for (const [key, value] of Object.entries(savedGlobals)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
}
console.log('PASS · 브라우저 유입 고정·익명 방문/판 구분·기존 API 중복 쓰기 방지·저장소 차단·미연결 전송 방지');
