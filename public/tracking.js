import { sourceForUrl } from './campaigns.js';

const memory = new Map();
export function readLocal(key, fallback = '') {
  try { return localStorage.getItem(key) ?? memory.get(key) ?? fallback; }
  catch { return memory.get(key) ?? fallback; }
}
export function writeLocal(key, value) {
  memory.set(key, String(value));
  try { localStorage.setItem(key, String(value)); } catch { /* 저장 차단 시 현재 페이지에서만 기억한다. */ }
}
export const makeId = () => crypto.randomUUID();
export function createTracker(version) {
  const params = new URL(location.href).searchParams;
  let visitor = readLocal('swai.visitor');
  if (!visitor) { visitor = makeId(); writeLocal('swai.visitor', visitor); }
  const context = { visitor_id: visitor, visit_id: makeId(), content_version: version,
    landing_url: location.origin + location.pathname,
    device: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    source: sourceForUrl(new URL(location.href)),
    is_test: params.get('test') === '1' || ['localhost', '127.0.0.1'].includes(location.hostname) };
  async function send(payload) {
    const response = await fetch('/.netlify/functions/record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(25000), keepalive: true });
    const result = await response.json();
    if (!response.ok || !result.ok || result.id !== (payload.event_id || payload.feedback_id)) throw new Error('저장 실패');
    return result;
  }
  let ready;
  function available() {
    return ready ||= (async () => {
      try {
        const response = await fetch('/.netlify/functions/record', { signal: AbortSignal.timeout(4000) });
        const result = await response.json();
        return response.ok && result.enabled === true;
      }
      catch { return false; }
    })();
  }
  return { context,
    available,
    event(type, extra = {}) {
      const payload = { ...context, ...extra, kind: 'event', event_type: type, event_id: makeId() };
      return (async () => {
        if (!await available()) return;
        // 기존 insert API는 중복 방지 기능이 없어 응답 유실 때 자동으로 다시 쓰지 않는다.
        try { await send(payload); } catch { /* 다시 쓰지 않고 게임 진행을 계속한다. */ }
      })();
    },
    feedback(payload) { return send({ ...context, ...payload, kind: 'feedback' }); }
  };
}
