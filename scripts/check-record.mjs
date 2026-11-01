import assert from 'node:assert/strict';
import handler, { validateRecord, legacyInsert } from '../netlify/functions/record.mjs';
import { decodeLegacyRows, parseCsv } from './legacy-rows.mjs';
import { buildSummary } from './summary.mjs';

const base = { visitor_id: 'visitor-1', visit_id: 'visit-1', run_id: 'run-1', source: 'community-a', content_version: 'test', is_test: false };
const event = { ...base, kind: 'event', event_id: 'event-1', event_type: 'visit' };
assert(validateRecord(event));
assert(validateRecord({ ...event, event_type: 'start' }), '성별 없이 시작 가능');
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
  let savedTable, savedData;
  globalThis.fetch = async target => {
    const query = new URL(target).searchParams;
    assert.equal(query.get('action'), 'insert');
    savedTable = query.get('table');
    const data = JSON.parse(query.get('data'));
    savedData = data;
    return new Response(`swai_saved(${JSON.stringify({ success: true, data })})`);
  };
  assert.equal((await handler(request(event))).status, 200); assert.equal(savedTable, 'tab_master');
  assert.equal((await handler(request(feedback))).status, 200); assert.equal(savedTable, 'tab_final');
  assert.equal((await handler(request({ ...event, campaign_code: 'c1', referer: 'https://example.test/post/1', source: 'wrong' }), { ip: '203.0.113.7' })).status, 200);
  assert.equal(savedData.ip, '203.0.113.7'); assert.equal(savedData.referer, 'https://example.test/post/1');
  assert.equal(savedData.utm, 'ka'); assert.equal(savedData['홍보코드'], 'k1');
  assert.equal(validateRecord({ ...event, referer: 'javascript:alert(1)' }), null);
  assert.equal(validateRecord({ ...event, campaign_code: 'z999' }), null);
  const mapped = legacyInsert(validateRecord(event));
  assert.equal(mapped.data.id, base.visitor_id); assert.equal(mapped.data.utm, base.source);
  assert.equal(mapped.data.landingUrl, 'https://savecs.netlify.app/');
  assert.equal(mapped.data['기록ID'], event.event_id); assert.equal(mapped.data['단계'], '방문');
  for (const header of ['게시일','게시시각','홍보글URL']) assert.equal(Object.hasOwn(mapped.data, header), false);
  assert.equal(legacyInsert(validateRecord({ ...feedback, text: '보기 쉬운 의견' })).data.advice, '보기 쉬운 의견');
  assert.equal(JSON.parse(legacyInsert(validateRecord(feedback), new Date(), 2).data.advice).email, feedback.email);
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
const legacyEvents = events.map((item, index) => legacyInsert({ ...item, kind: 'event', event_id: `legacy-${index}`, content_version: 'test' }, new Date(), 2).data);
const legacyFeedback = comments.map(item => legacyInsert({ ...item, kind: 'feedback' }, new Date(), 2).data);
const decoded = decodeLegacyRows([...legacyEvents, legacyEvents[0], { id: 'old', landingUrl: 'https://old.example/' }], [...legacyFeedback, legacyFeedback[0], { advice: '과거 의견' }]);
assert.equal(decoded.events.length, events.length);
assert.equal(decoded.feedback.length, comments.length);
assert.deepEqual(buildSummary(decoded.events, decoded.feedback), summary, '기존 두 시트로도 같은 출처별 집계가 나와야 함');
const modernEvents = events.map((item,index) => legacyInsert({ ...item, kind: 'event', event_id: `legacy-${index}`, content_version: 'test' }).data);
const modernFeedback = comments.map(item => legacyInsert({ ...item, kind: 'feedback' }).data);
const mixed = decodeLegacyRows([...legacyEvents, ...modernEvents], [...legacyFeedback, ...modernFeedback]);
assert.equal(mixed.events.length, events.length); assert.equal(mixed.feedback.length, comments.length);
assert.deepEqual(buildSummary(mixed.events, mixed.feedback), summary, '구형·신형 기록이 섞여도 같은 집계');
assert.deepEqual(parseCsv('\uFEFFid,advice\r\n1,"쉼표, 줄바꿈\n인용 ""문장"""\r\n'), [{ id: '1', advice: '쉼표, 줄바꿈\n인용 "문장"' }]);
console.log('PASS · 기록 입력·이메일 선택·미연결/실패/ID 확인 · 커뮤니티 집계·브라우저 중복·테스트 제외·피드백 구분');

// 브라우저 모듈의 유입 고정·재전송 ID·저장소 차단 동작도 검증한다.
const { createTracker, readLocal, writeLocal, makeId } = await import('../public/tracking.js');
assert.match(makeId(), /^[A-Za-z0-9_-]{12}$/);
const savedGlobals = { location: globalThis.location, localStorage: globalThis.localStorage, fetch: globalThis.fetch, document: globalThis.document };
try {
  globalThis.location = { href: 'https://example.test/?utm=community-a', hostname: 'example.test', origin: 'https://example.test', pathname: '/' };
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  globalThis.document = { referrer: 'https://example.test/promotion/1' };
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
  assert.equal(posts[0].referer, 'https://example.test/promotion/1');
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

const { sourceForUrl, campaigns, campaignSource } = await import('../public/campaigns.js');
assert.equal(sourceForUrl(new URL('https://example.test/r/e01?utm=wrong')), campaignSource(campaigns[0]));
assert.equal(sourceForUrl(new URL('https://example.test/r/e01/')), campaignSource(campaigns[0]));
assert.equal(sourceForUrl(new URL('https://example.test/r/z99')), 'unregistered');
assert.equal(sourceForUrl(new URL('https://example.test/?utm=legacy')), 'legacy');
assert.equal(sourceForUrl(new URL('https://example.test/')), 'direct');
assert.equal(new Set(campaigns.map(item => item.code)).size, campaigns.length);
assert(campaigns.every(item => campaignSource(item).length <= 80));
const instant = { ...base, run_id: 'instant-1', mode: 'instant', kind: 'event', event_id: 'instant-event', event_type: 'instant_view' };
assert.equal(validateRecord(instant).mode, 'instant');
assert.equal(legacyInsert(validateRecord(instant)).data['진행방식'], '예시');
assert.equal(validateRecord({ ...instant, mode: 'bad' }), null);
const sourceA = 'everytime__yonsei-free__20261103__0900__p01';
const sourceB = 'everytime__yonsei-free__20261103__1900__p02';
const sampleEvents = [
  ...['visit','instant_start','instant_view','job_click'].map(event_type => ({ ...instant, source: sourceA, event_type })),
  ...['visit','start','complete','job_click'].map(event_type => ({ ...base, mode: 'game', source: sourceB, visit_id: 'visit-other', event_type }))
];
const split = buildSummary(sampleEvents, []);
const platform = split.find(row => row[0] === '플랫폼: ev');
assert.equal(platform[1], 1, '여러 게시물의 고유 브라우저 중복 제거');
assert.equal(platform[2], 2); assert.equal(platform[5], 1); assert.equal(platform[6], 1);
assert.equal(platform[13], 1); assert.equal(platform[14], 1); assert.equal(platform[15], 1); assert.equal(platform[16], 1);
assert.equal(split.find(row => row[0] === sourceA)[5], 0, '즉시 보기는 게임 완주가 아님');
assert.equal(split.find(row => row[0] === sourceA)[15], 1, '게임을 시작하지 않은 예시 공고 클릭 포함');
assert(split.some(row => row[0] === '게시판: ev__yonsei-free'));
assert(split.some(row => row[0] === '게시일: ev__yonsei-free__20261103'));
const kakao = new URL('https://example.test/c1');
assert.equal(sourceForUrl(kakao), 'ka');
assert.equal(sourceForUrl(new URL('https://example.test/k1')), 'ka');
assert.equal(validateRecord({ ...event, campaign_code: 'k1' }).campaign_code, 'k1');
assert.equal(validateRecord({ ...event, campaign_code: 'c1' }).campaign_code, 'k1');
assert.equal(sourceForUrl(new URL('https://example.test/d1')), 'dc');
assert.equal(sourceForUrl(new URL('https://example.test/d01')), 'dc');
assert.equal(sourceForUrl(new URL('https://example.test/f1')), 'fm');
assert.equal(sourceForUrl(new URL('https://example.test/e1')), 'ev');
assert.equal(sourceForUrl(new URL('https://example.test/a1')), 'ar');
const byPost = buildSummary([{ ...base, source: 'dc', board: 'web-game', campaign_code: 'd1', event_type: 'visit' }], []);
assert.equal(byPost.find(row => row[0] === '게시물: d1')[1], 1);
console.log('PASS · 짧은 링크 대응·기존 UTM·미등록 코드·게시 회차/플랫폼/게시판/날짜별 중복 제거·예시/게임 집계 분리');
