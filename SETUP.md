# 기존 로그인 없는 저장 연결

현재 기본 연결은 `project_임시/script.js`와 수업 HTML의 기존 Apps Script `doGet`·JSONP insert 방식이다. Google 로그인·새 스프레드시트·새 탭·새 스크립트 배포 없이 기존 `tab_master`·`tab_final`에 저장한다. 실제 시트 편집 화면에 로그인하는 것과 이 공개 웹앱의 저장 호출은 별개다.

2026-11-02 기존 배포 주소에 테스트 방문 한 건과 가상 이메일만 입력한 피드백 한 건을 보내 모두 `success: true`와 요청 내용이 일치하는 저장 응답을 확인했다. 기존 행은 조회·수정·삭제하지 않았다. 테스트 출처는 `__swai_connection_test__`, `is_test=true`이며 이메일은 실제 수신자가 없는 `example.invalid` 주소다.

## 실행·배포 설정

- 로컬 `.env`의 `APPS_SCRIPT_URL`에 기존 `/exec` 주소를 사용한다. 이 주소는 기존 임시 코드에서 이미 준비했다.
- 새 비밀키나 인증 설정은 추가하지 않는다.
- `.env`는 Git에서 제외된다. 수정 후 로컬 서버를 다시 실행한다.
- Netlify 환경변수 `APPS_SCRIPT_URL`에 같은 기존 주소를 사용한다. 2026-11-02 GitHub main에 제품을 push하고 이 값을 Netlify에 설정한 뒤 재배포를 완료했다. 기록 함수와 화면은 동일 저장소에서 배포한다.

브라우저는 같은 사이트의 `/.netlify/functions/record`에 POST로 보내고, 함수가 기존 Apps Script의 `action=insert&table=...&data=...&callback=swai_saved`를 호출한다. Google의 JSONP 응답은 실행하지 않고 JSON만 파싱한다. 성공 여부와 반환 데이터가 요청과 일치해야 저장 성공으로 응답한다.

배포본 확인: 공개 사이트의 기록 설정 enabled:true, 12활동·4회 룰렛·이력서 완주, 모집 상세 열기, 이메일만 제출 후 저장 성공 표시와 입력 초기화를 확인했다. 점검은 `?utm=deploy-check&test=1`과 example.invalid 가상 이메일을 사용했다. 브라우저 오류·경고 없음. 원자료를 별도로 다시 읽어 모든 단계 행을 검증한 결과는 아니다.

## 기존 열에 저장되는 내용

| 기존 시트·열 | 저장 내용 |
| --- | --- |
| tab_master.id | 익명 브라우저 ID. 단계가 바뀌어도 같은 방문자는 같은 ID |
| tab_master.utm | 커뮤니티별 홍보 링크 출처 |
| tab_master.landingUrl | 페이지 주소와 event_type·event_id·visit_id·run_id·콘텐츠 버전·선택/모집 ID·테스트 구분 |
| tab_master.time_stamp | 한국 시간의 저장 요청 시각 |
| tab_master.ip / referer / device | unknown / 빈 값 / 모바일·데스크톱. 별도 IP 조회를 하지 않음 |
| tab_final.id / email | 익명 브라우저 ID / 선택 입력 이메일. 미입력은 빈 값 |
| tab_final.advice | 의견과 출처·방문/판/피드백 ID·테스트 구분을 담은 swai-v2 JSON |

열 추가 없이 기록을 남기기 위한 형식이다. 방문·시작·첫 선택·완료·모집 클릭이 모두 tab_master에 쌓이므로 **행 수 전체를 방문 횟수로 세지 않는다.** 방문은 event_type=visit, 고유 방문자는 해당 방문 행의 id로 구분한다. 과거 다른 아이디어의 행과 개발 테스트는 새 실험 통계에서 제외한다.

## 커뮤니티별 홍보 링크

예: `/?utm=everytime-yonsei`, `/?utm=community-b`. 출처가 없으면 `direct`, `utm_source`도 호환한다. 방문 때 정한 값을 후속 행동과 피드백까지 유지한다.

로컬 또는 `?test=1`은 테스트로 기록한다. 실제 홍보 링크에는 `test=1`을 넣지 않는다.

## 집계

기존 시트 두 탭은 그대로 사용하며 **현재 Google 시트에 새 자동 집계 탭을 만들지는 않았다.** 필터로 utm별 방문을 볼 수 있고, 두 탭을 CSV로 내보낸 뒤 다음 명령으로 전체·커뮤니티별 통계를 계산할 수 있다.

```text
node scripts/summarize-legacy.mjs tab_master.csv tab_final.csv
```

의견의 쉼표·줄바꿈·따옴표를 유지해 읽고, 같은 event_id·feedback_id는 중복 제거한다. swai-v2 기록만 대상으로 테스트를 제외하고 고유 브라우저·방문·시작·완료·모집 클릭률·피드백/의견/이메일 건수를 출력한다. 원자료나 이메일 값은 출력하지 않는다. 시작·완료 등 앞뒤 단계는 같은 방문·같은 판으로 연결한다. 분모가 0인 비율은 빈 값으로 둔다.

`scripts/summary.mjs`의 buildSummary가 집계 규칙을 소유한다. Google에 별도 스크립트를 배포할 필요 없이 위 명령에서 분석한다. 향후 시트 안의 자동 집계 탭이 필요할 때만 Google 편집 설정을 별도 진행한다.

## 응답 유실과 재시도

기존 insert API는 행 중복 방지 기능이 없다. 응답이 늦어져도 자동으로 같은 기록을 다시 쓰지 않는다. 피드백은 성공 확인 후에만 입력을 지우며, 응답을 확인하지 못하면 입력을 유지한다. 사용자가 같은 피드백을 다시 보내면 같은 feedback_id를 유지해 분석 시 중복을 제거한다. 저장소의 물리적 중복 행까지 방지한다고 주장하지 않는다.

`npm test`는 외부 시트에 쓰지 않는다. `node scripts/check-live-connection.mjs`는 명시적으로 연결을 점검할 때만 사용하는 명령으로, 가상 테스트 두 행을 추가한다.
