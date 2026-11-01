import { readFile, writeFile } from 'node:fs/promises';
import { campaigns, campaignPath, campaignSource } from '../public/campaigns.js';

// 예약: 날짜/시각에 -를 사용. 실제 게시 후 같은 코드에 날짜/시각/원문 주소를 한 번 등록한다.
const [code, platform, board, rawDate, rawTime, sequence, postUrl = ''] = process.argv.slice(2);
const date = rawDate === '-' ? '' : rawDate, time = rawTime === '-' ? '' : rawTime;
if (!/^[a-z][0-9]{1,4}$/.test(code || '') || !['kakao','everytime','dcinside','arcalive','fmkorea'].includes(platform) ||
    !/^[a-z0-9-]{1,24}$/.test(board || '') || !/^\d{8}$|^$/.test(date ?? 'invalid') || !/^([01]\d|2[0-3])[0-5]\d$|^$/.test(time ?? 'invalid') ||
    Boolean(date) !== Boolean(time) || !/^[1-9]\d?$/.test(sequence || '')) {
  throw new Error('사용법: node scripts/add-campaign.mjs d1 dcinside web-game YYYYMMDD HHmm 1 [홍보글URL] (예약은 날짜/시각 모두 -)');
}
if (date) {
  const day = date.slice(0,4) + '-' + date.slice(4,6) + '-' + date.slice(6);
  if (new Date(day).toISOString().slice(0,10) !== day) throw new Error('올바른 게시 날짜를 입력해주세요.');
}
if (postUrl) {
  const url = new URL(postUrl);
  if (!['http:','https:'].includes(url.protocol) || postUrl.length > 1500 || !date) throw new Error('게시 일시와 HTTP(S) 원문 주소를 확인해주세요.');
}
const existing = campaigns.find(item => item.code === code);
if (existing && (existing.platform !== platform || existing.board !== board || existing.sequence !== Number(sequence))) throw new Error('예약한 코드의 출처는 바꿀 수 없습니다. 새 코드를 사용해주세요.');
if (existing?.date && (existing.date !== date || existing.time !== time || (existing.postUrl && existing.postUrl !== postUrl))) throw new Error('이미 게시 정보가 확정된 코드입니다. 새 글에는 새 코드를 사용해주세요.');
const item = { ...existing, code, platform, board, date, time, sequence: Number(sequence), postUrl: postUrl || existing?.postUrl || '' };
const list = existing ? campaigns.map(row => row.code === code ? item : row) : [...campaigns, item];
const path = new URL('../public/campaigns.js', import.meta.url);
const original = await readFile(path, 'utf8');
await writeFile(path, original.replace(/export const campaigns = \[[\s\S]*?\n\];/, 'export const campaigns = ' + JSON.stringify(list,null,2) + ';'));
const table = list.map(row => '| ' + [row.code, campaignSource(row), row.label || row.board, row.date || '미배정', row.time || '미배정', row.sequence, '[열기](https://savecs.netlify.app' + campaignPath(row) + ')', row.postUrl ? '[원문](' + row.postUrl + ')' : '미등록', row.date ? '게시 일시 등록' : '예약·미게시'].join(' | ') + ' |').join('\n');
await writeFile(new URL('../PROMOTION.md', import.meta.url), '# 홍보 링크 관리표\n\n후보별 예약이며 실제 게시 이력이 아닙니다. 카카오톡 대화방은 아직 미지정입니다. 새 글은 새 코드, 기존 글 수정은 같은 링크입니다. 게시 후 한국 날짜·시각·원문 주소를 등록하고 변경을 배포합니다. 재등록 시 출처·확정 일시를 바꾸지 않습니다.\n\n| 코드 | UTM | 게시판·대화방 | 게시일 | 시각 | 회차 | 홍보용 링크 | 실제 홍보글 | 상태 |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n' + table + '\n');
console.log('등록 완료: https://savecs.netlify.app' + campaignPath(item) + '\n코드·관리표 변경을 기존 GitHub–Netlify 경로로 배포한 후 사용하세요.');
