# 홍보 링크 관리표

게시 일정은 아직 정하지 않았습니다. 아래는 예약 코드이며 실제 게시 기록이 아닙니다. 플랫폼·게시판 별칭과 한국 시간의 게시 날짜·시각을 확정하려면 다음 명령으로 등록한 뒤 commit/push합니다. 확정한 코드는 재사용하지 않습니다.

`node scripts/add-campaign.mjs e04 everytime yonsei-free YYYYMMDD HHmm 1`

| 코드 | 플랫폼 | 게시판·대화방 별칭 | 게시일 | 시각 | 회차 | 홍보용 링크 | 게시 여부 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| e01 | everytime | yonsei-free | 미배정 | 미배정 | 1 | https://savecs.netlify.app/r/e01 | 미게시 |
| e02 | everytime | yonsei-free | 미배정 | 미배정 | 2 | https://savecs.netlify.app/r/e02 | 미게시 |
| e03 | everytime | yonsei-cs | 미배정 | 미배정 | 1 | https://savecs.netlify.app/r/e03 | 미게시 |
| k01 | kakao | group01 | 미배정 | 미배정 | 1 | https://savecs.netlify.app/r/k01 | 미게시 |
| d01 | dcinside | board01 | 미배정 | 미배정 | 1 | https://savecs.netlify.app/r/d01 | 미게시 |
| a01 | arcalive | board01 | 미배정 | 미배정 | 1 | https://savecs.netlify.app/r/a01 | 미게시 |
| f01 | fmkorea | board01 | 미배정 | 미배정 | 1 | https://savecs.netlify.app/r/f01 | 미게시 |

`group01`, `board01`은 실제 방·게시판이 정해지기 전의 별칭입니다. 날짜 미배정은 통계에서 undated로 구분됩니다. 새 글마다 새 코드를 만들고 같은 글 수정은 링크를 유지합니다. 전달된 링크도 원래 코드로 집계됩니다.
