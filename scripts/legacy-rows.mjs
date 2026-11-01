// 기존 시트의 열을 바꾸지 않고 저장한 v0.2 기록만 분석용 구조로 복원한다.
export function decodeLegacyRows(visits, feedback) {
  const events = [];
  for (const row of visits) {
    try {
      const query = new URL(row.landingUrl).searchParams;
      if (query.get('swai_v') !== '2' || !query.get('event_id')) continue;
      const record = Object.fromEntries(query);
      events.push({ ...record, source: row.utm, visitor_id: row.id, is_test: query.get('is_test') === 'true' });
    } catch { /* 예전 아이디어 기록·일반 URL은 새 실험에 합치지 않는다. */ }
  }
  const comments = [];
  for (const row of feedback) {
    try {
      const record = JSON.parse(row.advice);
      if (record.schema === 'swai-v2' && record.kind === 'feedback' && record.feedback_id) comments.push(record);
    } catch { /* 예전 의견은 보존하며 새 집계에서는 제외한다. */ }
  }
  const unique = (rows, key) => [...new Map(rows.map(row => [row[key], row])).values()];
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
