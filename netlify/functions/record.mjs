import { campaignByCode, campaignSource } from '../../public/campaigns.js';
import { EVENT_LABELS } from '../../public/record-schema.js';
import { SHEET_SCHEMA_VERSION } from './storage-schema.mjs';

const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const idValid = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const textValid = (value, max) => typeof value === 'string' && value.length <= max;

export function validateRecord(input) {
  if (!input || !['event', 'feedback'].includes(input.kind)) return null;
  if (!idValid(input.visitor_id) || !idValid(input.visit_id) || !textValid(input.source, 80) || !input.source.trim() || !textValid(input.content_version, 60)) return null;
  const record = { kind: input.kind, visitor_id: input.visitor_id, visit_id: input.visit_id,
    run_id: input.run_id || '', source: input.source.trim(), content_version: input.content_version, is_test: input.is_test === true };
  if (input.mode !== undefined && !['game', 'instant'].includes(input.mode)) return null;
  record.mode = input.mode || 'game';
  const campaign = campaignByCode(input.campaign_code);
  if (input.campaign_code && !campaign) return null;
  Object.assign(record, { campaign_code: campaign?.code || '', board: campaign?.board || '', board_label: campaign?.label || campaign?.board || '',
    posted_date: campaign?.date || '', posted_time: campaign?.time || '', post_url: campaign?.postUrl || '', sequence: campaign?.sequence || '', referer: '' });
  if (campaign) record.source = campaignSource(campaign);
  if (input.referer) {
    try {
      const referer = new URL(input.referer);
      if (!['http:', 'https:'].includes(referer.protocol) || input.referer.length > 2000) return null;
      record.referer = referer.href;
    } catch { return null; }
  }
  if (input.landing_url) {
    try {
      const landing = new URL(input.landing_url);
      if (!['http:', 'https:'].includes(landing.protocol) || input.landing_url.length > 2000) return null;
      record.landing_url = landing.origin + landing.pathname + landing.search;
    } catch { return null; }
  }
  record.device = ['mobile', 'desktop'].includes(input.device) ? input.device : 'unknown';
  if (record.run_id && !idValid(record.run_id)) return null;
  if (input.kind === 'event') {
    if (!idValid(input.event_id) || !['visit', 'start', 'first_choice', 'complete', 'job_click', 'instant_start', 'instant_view'].includes(input.event_type)) return null;
    if (['instant_start', 'instant_view'].includes(input.event_type) && record.mode !== 'instant') return null;
    if (['start', 'first_choice', 'complete'].includes(input.event_type) && record.mode !== 'game') return null;
    if (input.event_type !== 'visit' && !record.run_id) return null;
    Object.assign(record, { event_id: input.event_id, event_type: input.event_type, choice_id: '', job_id: '', gender: '', mbti: '' });
    if (input.event_type === 'first_choice') { if (!idValid(input.choice_id)) return null; record.choice_id = input.choice_id; }
    if (input.event_type === 'job_click') { if (!idValid(input.job_id)) return null; record.job_id = input.job_id; }
    if (input.event_type === 'start') {
      if (input.gender && !['male', 'female'].includes(input.gender)) return null;
      if (input.mbti && !/^[IE][NS][TF][JP]$/.test(input.mbti)) return null;
      record.gender = input.gender || ''; record.mbti = input.mbti || '';
    }
  } else {
    if (!idValid(input.feedback_id) || !record.run_id || !textValid(input.text, 1000) || !textValid(input.email, 254)) return null;
    const text = input.text.trim(), email = input.email.trim();
    if ((!text && !email) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return null;
    Object.assign(record, { feedback_id: input.feedback_id, text, email });
  }
  return record;
}

const cellText = value => /^[=+\-@\t\r\n]/.test(value) ? "'" + value : value;
export function legacyInsert(record, now = new Date(), schema = 3) {
  const time = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
  const data = {
    id: record.visitor_id, landingUrl: record.landing_url || 'https://savecs.netlify.app/', ip: record.ip || 'unknown', referer: cellText(record.referer || ''),
    time_stamp: time, utm: cellText(record.source), device: record.device || 'unknown',
    '기록형식': schema === 3 ? 'swai-v3' : 'swai-v2', '단계': EVENT_LABELS[record.event_type || 'feedback'], '진행방식': record.mode === 'instant' ? '예시' : '게임',
    '홍보코드': record.campaign_code || '', '게시판': record.board_label || '', '게시판코드': record.board || '',
    '기록ID': record.event_id || record.feedback_id, '방문ID': record.visit_id, '게임ID': record.run_id || '',
    '선택ID': record.choice_id || '', '공고ID': record.job_id || '', '콘텐츠버전': record.content_version, '테스트': record.is_test === true
  };
  if (record.kind === 'feedback') {
    return { table: 'tab_final', data: { ...data, email: cellText(record.email), advice: schema === 3 ? cellText(record.text) : JSON.stringify({ schema: 'swai-v2', ...record }) } };
  }
  if (schema === 3) return { table: 'tab_master', data };
  const landing = new URL(record.landing_url || 'https://savecs.netlify.app/');
  for (const key of ['event_id', 'event_type', 'visitor_id', 'visit_id', 'run_id', 'content_version', 'choice_id', 'job_id', 'gender', 'mbti', 'mode', 'is_test', 'campaign_code', 'board', 'board_label', 'posted_date', 'posted_time', 'post_url', 'sequence']) {
    if (record[key] !== undefined && record[key] !== '') landing.searchParams.set(key, String(record[key]));
  }
  landing.searchParams.set('swai_v', '2');
  return { table: 'tab_master', data: { ...data, landingUrl: landing.href } };
}

async function saveLegacy(url, payload) {
  const insert = legacyInsert(payload, new Date(), SHEET_SCHEMA_VERSION), target = new URL(url);
  for (const [key, value] of Object.entries({ action: 'insert', table: insert.table, data: JSON.stringify(insert.data), callback: 'swai_saved' })) target.searchParams.set(key, value);
  const response = await fetch(target, { signal: AbortSignal.timeout(20000) });
  const body = await response.text();
  const match = body.match(/^\s*swai_saved\(([\s\S]*)\);?\s*$/);
  const result = match ? JSON.parse(match[1]) : JSON.parse(body);
  const acknowledged = result.data;
  const echoMatches = acknowledged?.id === insert.data.id &&
    (payload.kind === 'feedback' ? acknowledged.advice === insert.data.advice && acknowledged.email === insert.data.email : acknowledged.landingUrl === insert.data.landingUrl && acknowledged.utm === insert.data.utm);
  return response.ok && result.success === true && echoMatches;
}

export default async function handler(request, context = {}) {
  const url = process.env.APPS_SCRIPT_URL;
  let configured = false;
  try { const endpoint = new URL(url); configured = endpoint.protocol === 'https:' && endpoint.hostname === 'script.google.com' && endpoint.pathname.endsWith('/exec'); } catch { /* 미설정 */ }
  if (request.method === 'GET') return json({ enabled: configured, sheetSchema: SHEET_SCHEMA_VERSION });
  if (request.method !== 'POST') return json({ ok: false }, 405);
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false }, 403);
  const body = await request.text();
  if (body.length > 6000) return json({ ok: false }, 413);
  let payload;
  try { payload = validateRecord(JSON.parse(body)); } catch { return json({ ok: false }, 400); }
  if (!payload) return json({ ok: false }, 400);
  payload.ip = typeof context.ip === 'string' && context.ip ? context.ip : 'unknown';
  if (!configured) return json({ ok: false, code: 'not_configured' }, 503);
  try {
    const ok = await saveLegacy(url, payload);
    return json(ok ? { ok: true, id: payload.event_id || payload.feedback_id } : { ok: false }, ok ? 200 : 502);
  } catch { return json({ ok: false, code: 'save_failed' }, 502); }
}
