import { readFile, writeFile } from 'node:fs/promises';
import { campaigns, campaignSource } from '../public/campaigns.js';

// 한 번 확정해 배포한 코드는 수정하지 않고 새 게시물에 새 코드를 발급한다.
const [code, platform, board, date, time, sequence] = process.argv.slice(2);
if (!/^[a-z][0-9]{2,4}$/.test(code || '') || !['kakao','everytime','dcinside','arcalive','fmkorea'].includes(platform) ||
    !/^[a-z0-9-]{1,24}$/.test(board || '') || !/^\d{8}$/.test(date || '') || !/^([01]\d|2[0-3])[0-5]\d$/.test(time || '') || !/^[1-9]\d?$/.test(sequence || '')) {
  throw new Error('사용법: node scripts/add-campaign.mjs e04 everytime yonsei-free YYYYMMDD HHmm 1 (한국 시간)');
}
const day = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}`;
if (new Date(day).toISOString().slice(0,10) !== day) throw new Error('올바른 게시 날짜를 입력해주세요.');
const existing = campaigns.find(item => item.code === code);
if (existing?.date) throw new Error('이미 확정된 코드입니다. 새 코드를 사용해주세요.');
const item = { code, platform, board, date, time, sequence: Number(sequence) };
if (campaignSource(item).length > 80) throw new Error('출처 코드는 80자 이내여야 합니다.');
const list = existing ? campaigns.map(row => row.code === code ? item : row) : [...campaigns, item];
const path = new URL('../public/campaigns.js', import.meta.url);
const original = await readFile(path, 'utf8');
await writeFile(path, original.replace(/export const campaigns = \[[\s\S]*?\n\];/, `export const campaigns = ${JSON.stringify(list,null,2)};`));
const table = list.map(row => `| ${row.code} | ${row.platform} | ${row.board} | ${row.date || '미배정'} | ${row.time || '미배정'} | ${row.sequence} | https://savecs.netlify.app/r/${row.code} | 미게시·사용자 확인 필요 |`).join('\n');
await writeFile(new URL('../PROMOTION.md', import.meta.url), `# 홍보 링크 관리표\n\n시간은 한국 시간입니다. 날짜·시각 미배정 링크는 예약용입니다. 새 게시물은 새 코드, 기존 글 수정은 같은 링크를 사용합니다. 게시 여부는 실제 게시 후 수동 갱신합니다.\n\n| 코드 | 플랫폼 | 게시판·대화방 별칭 | 게시일 | 게시시각 | 회차 | 홍보용 링크 | 게시 여부 |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${table}\n`);
console.log(`등록 완료: https://savecs.netlify.app/r/${code}\n코드·관리표 변경을 기존 GitHub–Netlify 경로로 배포한 후 사용하세요.`);
