# 실제 모집 공고 — 발표용 스냅샷

확인일: 2026-11-02 (Asia/Seoul). 콘텐츠 버전: 2026-11-02.3.

사용자 요구: 계열마다 실제 공고를 몇 개씩 보여주되, 11월 6일 발표 전에 마감되는 공고는 제외한다.

## 수집 방법과 확인 범위

공식 채용 목록에서 상세 URL을 확인한 뒤 브라우저에서 각 원문의 공고명·업무·필요 역량·모집 조건·지원 링크를 읽어 `public/content.json`에 요약 저장했다. 외부 사이트를 게임 실행 때마다 요청하지 않는 발표용 정적 스냅샷이다. 자동 크롤러·정기 갱신·외부 채용 API 연동은 추가하지 않았다.

검색 결과에는 현재와 다른 제목·조건이 남아 있었다. 예를 들어 194868은 검색에서 AI DevOps Internship으로 나왔으나 현재 원문은 AI Solution Architect & Engineer Internship - Enterprise다. 현재 원문을 우선했다. 검색·터미널 HTTP 접근은 각각 403·네트워크 제한이 있었고, 공식 사이트의 정상 브라우저 열람으로 여섯 상세와 접수 링크를 확인했다.

아래 여섯 공고는 확인 당시 공식 ‘채용 중인 공고’ 목록에 있고, 상세에 ‘지원하기’ 링크가 있었다. **마감일은 여섯 원문 모두 미기재**다. 11월 6일 전 마감 날짜가 명시된 공고는 포함하지 않았다. 이를 ‘11월 6일까지 접수 보장’이나 확인된 ‘상시채용’으로 바꿔 쓰지 않는다. 날짜가 없는 공고는 기업이 발표 전에 닫을 가능성이 있어 발표 직전 원문 재확인이 필요하다.

## 반영한 공고

| 게임 계열 | 기업·실제 공고 | 조건 확인 |
| --- | --- | --- |
| 소프트웨어·플랫폼 개발 | 업스테이지 [AI Engineer - Agents](https://careers.upstage.ai/ko/o/194880) | 경력 무관·정규직. 관련 학사 또는 동등 실무, 서비스 개발·에이전트 운영 경험 |
| 소프트웨어·플랫폼 개발 | 타임리 AI [백엔드 개발자](https://careers.upstage.ai/ko/o/235255) | 경력 1년 이상·정규직. 타임리 AI 소속, Node.js·TypeScript·DB 실무 경험 |
| 데이터·AI | 업스테이지 [LLM Evaluation & Analysis](https://careers.upstage.ai/ko/o/217109) | 경력 무관·정규직. 평가·분석 또는 ML/NLP 국제 학회 논문 경험을 중점적으로 검토 |
| 데이터·AI | 업스테이지 [Post-training Internship](https://careers.upstage.ai/ko/o/194853) | 체험형 3~6개월·전일제, 학업 병행 불가. 후학습 및 국제 학회 제1저자/교신저자 출판 경험 필수 |
| 클라우드·인프라 | 업스테이지 [AI Solution Architect & Engineer Internship - Enterprise](https://careers.upstage.ai/ko/o/194868) | 전환형 인턴·전일제, 학업 병행 불가. 프로젝트·Git·Linux·Docker·HTTP 역량 |
| 클라우드·인프라 | 업스테이지 [Platform Software Engineer](https://careers.upstage.ai/ko/o/204306) | 경력 무관·정규직 표기지만 클라우드·Kubernetes·IaC의 실제 운영 경험 필요 |

추천 계열은 게임에서 이해하기 쉽게 분류한 것으로 기업의 공식 직군 분류와 반드시 같지는 않다. 추천 직무명도 게임의 설명용 이름이며 실제 공고명은 원문 그대로 별도 표시한다. 대학 졸업만으로 모든 공고의 자격을 충족한다고 안내하지 않는다.

## 발표 전 갱신

1. [공식 채용 목록](https://careers.upstage.ai/ko/upstage)과 위 상세를 다시 연다.
2. 마감·삭제·접수 종료 또는 11월 6일 전 마감이 확인되면 대체 공고를 고른다.
3. 업무·필수 조건을 요약하고 `url`, `checkedAt`, `deadline`, `deadlineLabel`을 갱신한다. 날짜 미기재는 `deadline: null`로 유지한다.
4. 콘텐츠 버전을 올리고 `npm test`, 화면의 상세·원문 링크를 확인한 뒤 기존 GitHub–Netlify 경로로 배포한다.
