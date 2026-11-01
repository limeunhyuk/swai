// 기존 API에 가상 테스트 두 행만 추가한다. 과거 원자료를 읽거나 삭제하지 않는다.
import { randomUUID } from 'node:crypto';
import handler from '../netlify/functions/record.mjs';
process.loadEnvFile(new URL('../.env', import.meta.url));
if (!process.env.APPS_SCRIPT_URL) throw new Error('기존 배포 주소 없음');
const base = { visitor_id: randomUUID(), visit_id: randomUUID(), run_id: randomUUID(),
  source: '__swai_connection_test__', content_version: '2026-11-02.2', is_test: true,
  landing_url: 'http://127.0.0.1:4173/', device: 'desktop' };
const payloads = [
  { ...base, kind: 'event', event_type: 'visit', event_id: randomUUID() },
  { ...base, kind: 'feedback', feedback_id: randomUUID(), text: '', email: 'swai-connection-test@example.invalid' }
];
for (const payload of payloads) {
  const request = new Request('http://localhost/.netlify/functions/record', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(payload) });
  const response = await handler(request), result = await response.json();
  const accepted = response.ok && result.ok && result.id === (payload.event_id || payload.feedback_id);
  console.log(JSON.stringify({ kind: payload.kind, status: response.status, acknowledged: Boolean(accepted), is_test: true }));
  if (!accepted) process.exitCode = 1;
}
