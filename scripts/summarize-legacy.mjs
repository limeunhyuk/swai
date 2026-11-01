import { readFile } from 'node:fs/promises';
import { decodeLegacyRows, parseCsv } from './legacy-rows.mjs';
import { buildSummary, SUMMARY_HEADERS } from './summary.mjs';
const [visitsFile, feedbackFile] = process.argv.slice(2);
if (!visitsFile || !feedbackFile) throw new Error('사용법: node scripts/summarize-legacy.mjs tab_master.csv tab_final.csv');
const records = decodeLegacyRows(parseCsv(await readFile(visitsFile, 'utf8')), parseCsv(await readFile(feedbackFile, 'utf8')));
const summary = buildSummary(records.events, records.feedback);
// 원자료·이메일·브라우저 ID 대신 출처별 집계 결과만 출력한다.
console.log(JSON.stringify({ columns: SUMMARY_HEADERS, rows: summary }, null, 2));
