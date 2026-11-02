// 실제 게시 전 예약 링크. 게시 일시와 원문 주소는 게시 후 등록한다.
export const platformCodes = { dcinside: 'dc', fmkorea: 'fm', everytime: 'ev', arcalive: 'ar', kakao: 'ka' };
export const campaigns = [
  {
    "code": "e01",
    "platform": "everytime",
    "board": "yonsei-free",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "e02",
    "platform": "everytime",
    "board": "yonsei-free",
    "date": "",
    "time": "",
    "sequence": 2
  },
  {
    "code": "e03",
    "platform": "everytime",
    "board": "yonsei-cs",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "k01",
    "platform": "kakao",
    "board": "group01",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "d01",
    "platform": "dcinside",
    "board": "board01",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "a01",
    "platform": "arcalive",
    "board": "board01",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "f01",
    "platform": "fmkorea",
    "board": "board01",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "a1",
    "platform": "arcalive",
    "board": "indie-game",
    "label": "인디게임 채널",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "a2",
    "platform": "arcalive",
    "board": "ai-chat",
    "label": "AI 채팅 채널",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "d1",
    "platform": "dcinside",
    "board": "web-game",
    "label": "웹게임 갤러리",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "d2",
    "platform": "dcinside",
    "board": "2d-indie-dev",
    "label": "2D 인디 게임 개발 갤러리",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "d3",
    "platform": "dcinside",
    "board": "programming",
    "label": "프로그래밍 갤러리",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "d4",
    "platform": "dcinside",
    "board": "ai-game-dev",
    "label": "AI 게임 개발 갤러리",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "e1",
    "platform": "everytime",
    "board": "campus-free",
    "label": "캠퍼스 자유게시판",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "e2",
    "platform": "everytime",
    "board": "campus-promotion",
    "label": "캠퍼스 홍보게시판",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "e3",
    "platform": "everytime",
    "board": "campus-cs",
    "label": "캠퍼스 컴과게시판",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "e4",
    "platform": "everytime",
    "board": "campus-career",
    "label": "캠퍼스 취업게시판",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "e5",
    "platform": "everytime",
    "board": "union-free",
    "label": "연합 자유게시판",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "e6",
    "platform": "everytime",
    "board": "union-game",
    "label": "연합 게임게시판",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "e7",
    "platform": "everytime",
    "board": "union-career",
    "label": "연합 취업게시판",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "e8",
    "platform": "everytime",
    "board": "union-promotion",
    "label": "연합 홍보게시판",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "f1",
    "platform": "fmkorea",
    "board": "ai",
    "label": "인공지능 AI 게시판",
    "date": "",
    "time": "",
    "sequence": 1
  },
  {
    "code": "k1",
    "platform": "kakao",
    "board": "chat-unspecified",
    "label": "카카오톡 대화방 미지정",
    "date": "",
    "time": "",
    "sequence": 1,
    "postUrl": ""
  },
  {
    "code": "d5",
    "platform": "dcinside",
    "board": "web-game-dev",
    "date": "",
    "time": "",
    "sequence": 1,
    "postUrl": "",
    "label": "웹게임 개발 갤러리"
  },
  {
    "code": "k2",
    "platform": "kakao",
    "board": "chat-unspecified",
    "date": "",
    "time": "",
    "sequence": 2,
    "postUrl": "",
    "label": "카카오톡 대화방 미지정"
  }
];

export const campaignSource = item => platformCodes[item.platform] || item.platform;
export const campaignPath = item => /^[a-z]0[0-9]+$/.test(item.code) ? '/r/' + item.code : '/' + item.code;
export const campaignByCode = code => campaigns.find(item => item.code === (code === 'c1' ? 'k1' : code));
export function campaignForUrl(url) {
  const code = /^\/(?:r\/)?([a-z][0-9]{1,4})\/?$/.exec(url.pathname)?.[1];
  return code ? campaignByCode(code) : undefined;
}
export function sourceForUrl(url) {
  const item = campaignForUrl(url);
  if (item) return campaignSource(item);
  if (/^\/(?:r\/)?[a-z][0-9]{1,4}\/?$/.test(url.pathname)) return 'unregistered';
  const source = (url.searchParams.get('utm')?.trim() || url.searchParams.get('utm_source')?.trim() || 'direct').slice(0, 80);
  return platformCodes[source] || source;
}
