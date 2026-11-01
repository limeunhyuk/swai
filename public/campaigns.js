// 게시 일정 미배정 링크. 실제 홍보 전에 scripts/add-campaign.mjs로 날짜·시각을 확정한다.
export const campaigns = [
  { code: 'e01', platform: 'everytime', board: 'yonsei-free', date: '', time: '', sequence: 1 },
  { code: 'e02', platform: 'everytime', board: 'yonsei-free', date: '', time: '', sequence: 2 },
  { code: 'e03', platform: 'everytime', board: 'yonsei-cs', date: '', time: '', sequence: 1 },
  { code: 'k01', platform: 'kakao', board: 'group01', date: '', time: '', sequence: 1 },
  { code: 'd01', platform: 'dcinside', board: 'board01', date: '', time: '', sequence: 1 },
  { code: 'a01', platform: 'arcalive', board: 'board01', date: '', time: '', sequence: 1 },
  { code: 'f01', platform: 'fmkorea', board: 'board01', date: '', time: '', sequence: 1 }
];

export function campaignSource(item) {
  return `${item.platform}__${item.board}__${item.date || 'undated'}__${item.time || '0000'}__p${String(item.sequence).padStart(2, '0')}`;
}

export function sourceForUrl(url) {
  const alias = /^\/r\/([a-z][0-9]{2,4})\/?$/.exec(url.pathname)?.[1];
  if (alias) {
    const item = campaigns.find(item => item.code === alias);
    return item ? campaignSource(item) : 'unregistered';
  }
  return (url.searchParams.get('utm')?.trim() || url.searchParams.get('utm_source')?.trim() || 'direct').slice(0, 80);
}
