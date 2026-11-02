import { publicCounts } from './lib/public-counts.mjs';

export default async function handler(request) {
  const json = (body, status = 200, extra = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
  if (request.method !== 'GET') return json({ ok: false }, 405);
  let target;
  try {
    target = new URL(process.env.APPS_SCRIPT_URL);
    if (target.protocol !== 'https:' || target.hostname !== 'script.google.com' || !target.pathname.endsWith('/exec')) throw new Error();
  } catch { return json({ ok: false }, 503); }
  try {
    for (const [key, value] of Object.entries({ action: 'read', table: 'tab_master', callback: 'swai_counts' })) target.searchParams.set(key, value);
    const response = await fetch(target, { signal: AbortSignal.timeout(12000) });
    const body = await response.text(), match = body.match(/^\s*swai_counts\(([\s\S]*)\);?\s*$/);
    const result = JSON.parse(match ? match[1] : body);
    if (!response.ok || result.success !== true || !Array.isArray(result.data)) throw new Error();
    // 원자료·ID·IP는 응답하지 않는다. 한국 날짜 경계 전에 캐시를 만료한다.
    const now = new Date(), counts = publicCounts(result.data, now);
    const midnight = Date.parse(counts.day + 'T00:00:00+09:00') + 86400000;
    const ttl = Math.max(1, Math.min(60, Math.floor((midnight - now.getTime()) / 1000)));
    return json({ ok: true, ...counts }, 200, { 'Netlify-CDN-Cache-Control': `public, durable, max-age=${ttl}` });
  } catch { return json({ ok: false }, 502); }
}
