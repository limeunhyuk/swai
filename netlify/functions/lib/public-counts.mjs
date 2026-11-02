import { decodeLegacyRows } from '../../../scripts/legacy-rows.mjs';

const dayFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
export function koreanDay(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}:\d{2}$/.test(value)) return value.slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dayFormatter.format(date);
}

export function publicCounts(rows, now = new Date()) {
  const day = koreanDay(now);
  const events = decodeLegacyRows(rows, []).events.filter(row => row.is_test !== true);
  const count = list => ({
    visitors: new Set(list.filter(row => row.event_type === 'visit' && row.visitor_id).map(row => row.visitor_id)).size,
    students: new Set(list.filter(row => row.event_type === 'start' && row.mode !== 'instant' && row.run_id).map(row => row.run_id)).size
  });
  return { day, today: count(events.filter(row => koreanDay(row.occurred_at) === day)), total: count(events), updatedAt: now.toISOString() };
}
