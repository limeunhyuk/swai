import { EVENT_LABELS } from '../public/record-schema.js';
import { campaigns } from '../public/campaigns.js';

// 기존 URL/JSON 기록과 열을 분리한 새 기록을 함께 읽는다. 과거 행을 수정하지 않는다.
export function decodeLegacyRows(visits, feedback) {
  const fromColumns = row => ({ visitor_id: row.id, visit_id: row['방문ID'], run_id: row['게임ID'], source: row.utm,
    mode: row['진행방식'] === '예시' ? 'instant' : 'game', event_type: Object.keys(EVENT_LABELS).find(key => EVENT_LABELS[key] === row['단계']),
    campaign_code: row['홍보코드'] || '', board: row['게시판코드'] || '', posted_date: row['게시일'] || '', posted_time: row['게시시각'] || '',
    post_url: row['홍보글URL'] || '', content_version: row['콘텐츠버전'], choice_id: row['선택ID'] || '', job_id: row['공고ID'] || '',
    is_test: row['테스트'] === true || ['TRUE', 'true'].includes(row['테스트']) });
  const events = [];
  for (const row of visits) {
    if (row['기록형식'] === 'swai-v3' && row['기록ID']) {
      events.push({ ...fromColumns(row), event_id: row['기록ID'] }); continue;
    }
    try {
      const query = new URL(row.landingUrl).searchParams;
      if (query.get('swai_v') !== '2' || !query.get('event_id')) continue;
      const record = Object.fromEntries(query);
      events.push({ ...record, source: row.utm, visitor_id: row.id, is_test: query.get('is_test') === 'true' });
    } catch { /* 예전 아이디어 기록·일반 URL은 새 실험에 합치지 않는다. */ }
  }
  const comments = [];
  for (const row of feedback) {
    if (row['기록형식'] === 'swai-v3' && row['기록ID']) {
      comments.push({ ...fromColumns(row), feedback_id: row['기록ID'], text: row.advice || '', email: row.email || '' }); continue;
    }
    try {
      const record = JSON.parse(row.advice);
      if (record.schema === 'swai-v2' && record.kind === 'feedback' && record.feedback_id) comments.push(record);
    } catch { /* 예전 의견은 보존하며 새 집계에서는 제외한다. */ }
  }
  const unique = (rows, key) => [...new Map(rows.map(row => {
    const item = campaigns.find(item => item.code === row.campaign_code);
    return [row[key], item ? { ...row, board: item.board, posted_date: item.date || row.posted_date, posted_time: item.time || row.posted_time, post_url: item.postUrl || row.post_url } : row];
  })).values()];
  return { events: unique(events, 'event_id'), feedback: unique(comments, 'feedback_id') };
}

export function parseCsv(text) {
  const rows = [], row = [];
  let value = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(value); value = '';
      if (char !== ',') {
        if (char === '\r' && text[index + 1] === '\n') index++;
        rows.push(row.splice(0));
      }
    } else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.filter(values => values.some(Boolean)).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}
