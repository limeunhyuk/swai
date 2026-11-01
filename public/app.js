import { INITIAL_GPA, MAX_GPA, createGame, choose, advance, rollGrade, currentScene, resultCareer, createExample } from './game.js';
import { createTracker, readLocal, writeLocal, makeId } from './tracking.js';

const app = document.querySelector('#app');
let content, state, tracker, recording = false;
let profile = { surname: '', givenName: '' };
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const nameLabel = () => escape(state.profile.name);
const profileLabel = () => content.careers.find(item => item.id === state.direction)?.label || '나의 준비 방향 찾기';
const semesterLabel = item => `${item.year}학년 ${item.semester}학기`;
const gpaLabel = value => Number(value).toFixed(2);
const track = (type, extra = {}) => tracker.event(type, { run_id: state.runId, mode: state.mode, ...extra });

function statsPanel(changes = {}) {
  return `<section class="stats-panel" aria-label="캐릭터 스탯">${['공부', '생활'].map(group => `<div class="stat-group"><h3>${group}<span>${group === '공부' ? '차곡차곡 쌓은 경험' : '지금의 생활 여력'}</span></h3><div class="stat-grid ${group === '생활' ? 'life' : ''}">${content.stats.filter(stat => stat.group === group).map(stat => {
    const changed = Object.hasOwn(changes, stat.id), delta = changes[stat.id];
    return `<div class="stat ${changed ? 'changed' : ''}"><span class="stat-label">${escape(stat.label)}</span><div class="stat-numbers"><strong>${state.stats[stat.id]}</strong><span class="stat-max">/10</span>${changed ? `<span class="delta ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : ''}">${delta > 0 ? '+' : ''}${delta}</span>` : ''}</div><div class="${group === '공부' ? 'stat-cells' : 'stat-track'}" role="meter" aria-label="${escape(stat.label)}" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${state.stats[stat.id]}">${group === '공부' ? Array.from({ length: 10 }, (_, index) => `<span class="${index < state.stats[stat.id] ? 'filled' : ''}"></span>`).join('') : `<span style="width:${state.stats[stat.id] * 10}%"></span>`}</div></div>`;
  }).join('')}</div></div>`).join('')}</section>`;
}

function showStart() {
  app.innerHTML = `<section class="start-screen"><div class="eyebrow"><span class="status-dot"></span> CAMPUS LIFE SIMULATOR</div>
    <h1 tabindex="-1">컴공으로<br><span>살아남기<span class="cursor" aria-hidden="true">_</span></span></h1>
    <p class="intro">3학년의 시작부터 졸업까지.<br>과제도, 연애도, 취업 준비도 내 선택대로.</p>
    <div class="journey"><span class="journey-icon" aria-hidden="true">&lt;/&gt;</span><div><strong>4학기, 8번의 선택</strong><p>대학 생활의 끝에서 나만의 이력서를 만나보세요.</p></div><span class="journey-end" aria-hidden="true">↗</span></div>
    <div class="home-actions"><div><button class="primary instant-button" id="instant-button">이력서 즉시 확인 <span aria-hidden="true">↗</span></button><p>예시 이력서와 추천 직무, 실제 채용공고를 바로 확인해요.</p></div><div><button class="secondary" id="setup-button">3학년 시작하기 <span aria-hidden="true">→</span></button><p>8번의 선택으로 나만의 대학 생활과 이력서를 만들어요.</p></div></div>
    <p class="local-notice">${recording ? '방문·플레이 흐름은 익명으로 기록돼요.' : '미리보기 · 현재는 체험 기록과 의견을 저장할 수 없어요.'}</p></section>`;
  document.querySelector('#instant-button').addEventListener('click', showInstant);
  document.querySelector('#setup-button').addEventListener('click', () => { showSetup(); focusHeading(); });
}

function showSetup() {
  app.innerHTML = `<section class="start-screen"><p class="eyebrow">MY CAMPUS LIFE</p><h1 tabindex="-1">나의 3학년 시작</h1><form id="profile-form" class="setup-card"><h2>이름을 정해주세요</h2><div class="name-fields"><div><label class="field-label" for="surname">성 <span>선택</span></label><input id="surname" name="surname" maxlength="12" placeholder="김" value="${escape(profile.surname)}" autocomplete="off"></div><div><label class="field-label" for="given-name">이름 <span>선택</span></label><input id="given-name" name="givenName" maxlength="20" placeholder="컴공" value="${escape(profile.givenName)}" autocomplete="off"></div></div><p class="field-note">비워둔 칸은 ‘김’과 ‘컴공’으로 채워져요.</p><div class="starting-grade"><div><span>지금까지의 누적 학점</span><strong>${gpaLabel(INITIAL_GPA)} <small>/ ${MAX_GPA}</small></strong></div><p>1~2학년을 마쳤어요.<br>이제 3학년 1학기를 시작해요.</p></div><button class="primary" id="start-button">3학년 시작하기 <span aria-hidden="true">→</span></button></form><button class="text-button" id="home-button">처음으로</button></section>`;
  document.querySelector('#home-button').addEventListener('click', () => { showStart(); focusHeading(); });
  document.querySelector('#profile-form').addEventListener('submit', event => {
    event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return;
    const data = new FormData(form); profile = { surname: data.get('surname'), givenName: data.get('givenName') };
    state = { ...createGame(content, profile), runId: makeId() }; track('start'); showPlay(); focusHeading();
  });
}

function showInstant() {
  if (document.querySelector('#instant-status')) return;
  const raw = Number(readLocal('swai.example', '0'));
  const index = Number.isSafeInteger(raw) && raw >= 0 ? raw % content.careers.length : 0;
  writeLocal('swai.example', (index + 1) % content.careers.length);
  state = { ...createExample(content, content.careers[index].id), runId: makeId() }; track('instant_start');
  app.innerHTML = '<section class="instant-loading"><p class="eyebrow">PREVIEW</p><h1 tabindex="-1">예시 대학 생활을<br>준비하고 있어요</h1><p id="instant-status" role="status">3학년 1학기 실행중…</p><div class="loading-track"><span></span></div></section>'; focusHeading();
  let term = 0;
  const timer = setInterval(() => {
    term++;
    if (term === content.semesters.length) { clearInterval(timer); track('instant_view'); showResult(); focusHeading(); }
    else document.querySelector('#instant-status').textContent = semesterLabel(content.semesters[term]) + ' 실행중…';
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 400);
}

function direction(effects) {
  return Object.entries(effects).map(([id, effect]) => `<span class="effect ${effect > 0 ? 'positive' : 'negative'}" aria-label="${escape(content.stats.find(stat => stat.id === id).label)} ${effect > 0 ? '+' : ''}${effect}">${escape(content.stats.find(stat => stat.id === id).label)} ${(effect > 0 ? '↑' : '↓').repeat(Math.abs(effect))}</span>`).join('');
}

function gradeChart() {
  const grades = [{ label: '2학년', gpa: INITIAL_GPA }, ...state.grades.map(item => ({ label: `${item.year}-${item.semester}`, gpa: item.gpa }))];
  const points = grades.map((item, index) => ({ ...item, x: 24 + index * 78, y: 88 - (item.gpa - 3.3) / 1.2 * 64 }));
  const description = grades.map(item => `${item.label} ${gpaLabel(item.gpa)}`).join(', ');
  return `<div class="gpa-chart"><svg viewBox="0 0 360 120" role="img" aria-label="누적 학점 변화: ${description}"><line class="gpa-baseline" x1="24" y1="99" x2="336" y2="99"/><polyline class="gpa-line" points="${points.map(item => `${item.x},${item.y}`).join(' ')}"/>${points.map(item => `<circle class="gpa-point" cx="${item.x}" cy="${item.y}" r="3"/><text class="gpa-value" x="${item.x}" y="${item.y - 12}">${gpaLabel(item.gpa)}</text><text class="gpa-term" x="${item.x}" y="117">${item.label}</text>`).join('')}</svg></div>`;
}

function showPlay() {
  const scene = currentScene(content, state), entry = state.selected ? state.history.at(-1) : undefined;
  const selected = entry && scene.choices.find(choice => choice.id === entry.choiceId);
  const termEnd = (state.sceneIndex + 1) % 2 === 0;
  const reviewing = scene.id === 'career41' && !state.selected;
  const choices = reviewing ? (state.changingDirection ? scene.choices.slice(1) : scene.choices.slice(0, 1)) : scene.choices;
  app.innerHTML = `<section class="play-screen"><div class="player-line"><span class="mini-profile"><span aria-hidden="true">&lt;/&gt;</span>${nameLabel()}</span><span>${escape(profileLabel())}</span></div>
    <div class="semester-heading"><div><p class="eyebrow">MY CAMPUS LIFE</p><h1 tabindex="-1">${semesterLabel(scene)}</h1></div><span class="step-count"><strong>${state.sceneIndex % 2 + 1}</strong> / 2</span></div>
    <div class="semester-track" aria-label="총 8번 중 ${state.history.length}번 선택 완료">${state.scenes.map((item, index) => `<span class="${index < state.history.length ? 'done' : ''} ${index === state.sceneIndex ? 'current' : ''}"></span>`).join('')}</div>
    <div class="gpa-strip"><span>누적 학점 <strong>${gpaLabel(state.gpa)}</strong> / ${MAX_GPA}</span><span>쌓은 경험 ${state.experiences.length}개</span></div>${statsPanel(entry?.changes)}
    <section class="scene-card" aria-labelledby="scene-title"><div class="scene-meta"><span class="badge">${escape(scene.kind)}</span><span>EPISODE ${String(state.sceneIndex + 1).padStart(2, '0')}</span></div><h2 id="scene-title">${escape(scene.prompt)}</h2><p class="scene-hint">${state.selected ? '나의 선택이 대학 생활에 남았어요.' : '이 상황에서 나는 어떻게 할까?'}</p>
    <div class="choices">${choices.map((choice, index) => `<button class="choice ${choice.id === selected?.id ? 'is-selected' : ''}" data-choice="${choice.id}" ${state.selected ? 'disabled' : ''}><span class="choice-letter" aria-hidden="true">${choice.id === selected?.id ? '✓' : String.fromCharCode(65 + index)}</span><span class="choice-body"><span class="choice-label">${escape(choice.label)}</span><span class="effects">${direction(choice.effects)}</span></span></button>`).join('')}${reviewing ? `<button class="choice" id="change-direction">${state.changingDirection ? '기존 방향으로 돌아가기' : '다른 준비 방향 살펴보기'} <span aria-hidden="true">→</span></button>` : ''}</div>
    ${selected ? `<div class="feedback" role="status"><p class="feedback-label">이번 선택으로</p><p>${escape(selected.feedback)}</p><div class="actual-changes">${Object.entries(entry.changes).map(([id, delta]) => `<span class="effect ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : ''}">${escape(content.stats.find(stat => stat.id === id).label)} ${delta > 0 ? '+' : ''}${delta}${delta !== selected.effects[id] ? ' (한계값 도달)' : ''}</span>`).join('')}</div>${selected.experience ? `<p class="experience-earned">+ 이력서에 ‘${escape(selected.experience.title)}’ 추가</p>` : ''}</div><button class="primary" id="next-button">${termEnd ? '학기 마무리 · 학점 룰렛' : '다음 이야기'} <span aria-hidden="true">→</span></button>` : ''}</section><p class="play-note">${state.sceneIndex + 1} / 8개의 순간 · 어떤 선택을 해도 졸업까지 갈 수 있어요.</p></section>`;
  document.querySelector('#change-direction')?.addEventListener('click', () => { state = { ...state, changingDirection: !state.changingDirection }; showPlay(); });
  document.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
    const next = choose(content, state, button.dataset.choice); if (next === state) return; state = next;
    if (state.history.length === 1) track('first_choice', { choice_id: button.dataset.choice });
    showPlay(); document.querySelector('#next-button').focus({ preventScroll: true });
    document.querySelector('#next-button').scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }));
  document.querySelector('#next-button')?.addEventListener('click', () => {
    state = advance(content, state); if (state.screen === 'grade') showGrade(); else showPlay(); focusHeading();
  });
}

function showGrade() {
  const scene = state.scenes[state.sceneIndex];
  app.innerHTML = `<section class="grade-screen"><p class="eyebrow">SEMESTER COMPLETE</p><h1 tabindex="-1">${semesterLabel(scene)} 끝!</h1><p class="muted">두 번의 선택 뒤, 이번 학기 성적표가 도착했어요.</p><div class="roulette-card"><div class="roulette-pointer" aria-hidden="true">▼</div><div class="roulette-window"><div id="grade-reel" class="grade-reel" aria-hidden="true">3.5<br>3.0<br>4.0<br>3.2<br>3.8</div></div><p id="grade-status" role="status">지금 누적 학점은 ${gpaLabel(state.gpa)} / ${MAX_GPA}</p></div><div id="grade-result"></div><p class="play-note">이번 학기의 학업·탐구 경험이 반영돼요.</p></section>`;

    document.querySelector('#grade-reel').classList.add('rolling');
    document.querySelector('#grade-status').textContent = '이번 학기를 정리하는 중…';
    setTimeout(() => {
      state = rollGrade(content, state);
      const grade = state.grades.at(-1), delta = Math.round((grade.gpa - grade.previous) * 100) / 100;
      document.querySelector('.roulette-window').innerHTML = `<strong class="grade-number">${gpaLabel(grade.gpa)}</strong>`;
      document.querySelector('#grade-status').innerHTML = `누적 학점 <strong>${gpaLabel(grade.gpa)} / ${MAX_GPA}</strong> <span class="${delta >= 0 ? 'positive' : 'negative'}">(${delta > 0 ? '+' : ''}${delta.toFixed(2)})</span>`;
      document.querySelector('#grade-result').innerHTML = `<div class="grade-history">${state.grades.map(item => `<span>${semesterLabel(item)}<strong>${gpaLabel(item.gpa)}</strong></span>`).join('')}</div><p class="muted grade-comment">${delta >= 0 ? '이번 학기의 경험이 쌓였어요. 다음 순간도 내 선택으로.' : '조금 내려가도 괜찮아요. 대학 생활은 학점만으로 채워지지 않으니까요.'}</p><button class="primary" id="continue-button">${state.sceneIndex === state.scenes.length - 1 ? '나의 이력서 보기' : '다음 학기 시작하기'} <span aria-hidden="true">→</span></button>`;
      document.querySelector('#continue-button').addEventListener('click', () => {
        state = advance(content, state);
        if (state.screen === 'result') {
          state.career = resultCareer(content, state); track('complete'); showResult();
        } else showPlay();
        focusHeading();
      });
      document.querySelector('#continue-button').focus({ preventScroll: true });
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 1200);
}

function showResult() {
  const career = state.career;
  const instant = state.mode === 'instant';
  app.innerHTML = `<section class="result-screen"><p class="eyebrow">MY NEXT CHAPTER</p><div class="graduation-heading"><h1 tabindex="-1">${instant ? '미리 만나보는<br>예시 이력서' : '대학 생활이<br>한 장의 이력서가 되었어요.'}</h1><p class="muted">${instant ? '미리 준비한 캐릭터의 예시예요. 직접 선택하면 다른 기록이 남아요.' : `8번의 선택으로 남긴 ${nameLabel()}의 기록`}</p></div>
    <article class="resume" aria-labelledby="resume-title"><div class="resume-top"><div><p class="resume-kicker">CURRICULUM VITAE</p><h2 id="resume-title">${nameLabel()}</h2><p>컴퓨터공학 전공 · 졸업</p></div><span class="resume-seal">CLASS<br>COMPLETE</span></div>
    <section class="resume-section"><h3>학력</h3><div class="resume-education"><div><strong>컴퓨터공학 학사</strong><p>4학년 2학기 수료</p></div><div class="resume-gpa"><strong>${gpaLabel(state.gpa)}</strong><span> / ${MAX_GPA}</span></div></div>${gradeChart()}</section>
    <section class="resume-section"><h3>경험 · 프로젝트</h3>${state.experiences.length ? state.experiences.map(item => `<div class="resume-experience"><div><span>${item.year}-${item.semester} · ${escape(item.type)}</span><h4>${escape(item.title)}</h4><p>${escape(item.detail)}</p></div></div>`).join('') : '<p>아직 등록한 경험이 없어요.</p>'}</section><p class="resume-footnote">대학 생활 게임에서 만든 캐릭터 이력서</p></article>
    <details class="history"><summary>내 선택과 성장 보기 <span>8개의 순간</span></summary>${statsPanel()}<ol>${state.history.map(entry => `<li><span>${entry.year}-${entry.semester}</span><p>${escape(entry.label)}</p></li>`).join('')}</ol></details>
    <section class="career-card"><p class="eyebrow">CAREER PATH</p><h2>졸업 후 추천 진로</h2><p class="career-family">${escape(career.label)}</p><h3>${escape(career.title)}</h3><div class="career-field"><span>함께 탐색할 취업 분야</span><strong>${escape(career.field)}</strong></div><p>${escape(career.description)}</p><p class="career-notice">선택한 준비 방향에 연결한 진로 예시예요. 실제 지원 자격은 공고에서 확인해주세요.</p></section>
    <section class="jobs" aria-labelledby="jobs-title"><div class="section-heading"><h2 id="jobs-title">이런 모집을 살펴보세요</h2><span>${career.jobs.length} POSITIONS</span></div>${career.jobs.map(job => `<a class="job-card" href="${escape(job.url)}" target="_blank" rel="noopener noreferrer" data-job="${job.id}"><div class="job-top"><span>${escape(job.company)}</span><span class="badge">${escape(job.conditions[0])}</span></div><h3>${escape(job.title)}</h3><p>${escape(job.description)}</p><p class="job-conditions">${escape(job.conditions.slice(1).join(' · '))}</p><p class="job-date">${escape(job.deadlineLabel)} · ${escape(job.checkedAt)} 확인</p><span class="job-link">실제 채용공고 보기 <span aria-hidden="true">↗</span></span></a>`).join('')}<p class="muted jobs-note">기업 채용 페이지에서 확인한 실제 공고예요. 최신 접수 여부와 자세한 조건은 원문에서 확인해주세요.</p></section>
    <section class="suggestions" aria-labelledby="feedback-title"><h2 id="feedback-title">어떤 대학 생활이었나요?</h2><p class="muted">기억에 남은 순간이나 더 있었으면 하는 이야기를 남겨주세요.</p><form id="feedback-form"><label for="feedback-text" class="sr-only">의견 (선택)</label><textarea id="feedback-text" maxlength="1000" rows="4" placeholder="연애 사건이 더 있었으면 좋겠어요…" aria-describedby="feedback-limit"></textarea>
    <label class="field-label email-label" for="feedback-email">이메일 <span>선택 · 입력하지 않아도 돼요</span></label><input id="feedback-email" name="email" type="email" maxlength="254" placeholder="name@example.com" autocomplete="email"><div class="feedback-actions"><span id="feedback-limit"><span id="character-count">0</span> / 1,000자</span><button class="secondary" id="send-feedback" type="submit">보내기 <span aria-hidden="true">↗</span></button></div><p id="feedback-status" class="form-status" role="status">의견이나 이메일 중 하나만 남겨도 괜찮아요.</p></form></section>
    <button class="primary replay-button" id="replay-button">${instant ? '직접 나의 대학생활 만들어보기' : '다른 대학생활 만들어보기'} <span aria-hidden="true">↻</span></button></section>`;
  document.querySelectorAll('[data-job]').forEach(link => link.addEventListener('click', () => { track('job_click', { job_id: link.dataset.job }); }));
  const textarea = document.querySelector('#feedback-text'), email = document.querySelector('#feedback-email'); let pending;
  textarea.addEventListener('input', () => { document.querySelector('#character-count').textContent = textarea.value.length; });
  document.querySelector('#feedback-form').addEventListener('submit', async event => {
    event.preventDefault(); const text = textarea.value.trim(), address = email.value.trim();
    const status = document.querySelector('#feedback-status'), button = document.querySelector('#send-feedback');
    if (!text && !address) { status.textContent = '의견이나 이메일 중 하나를 입력해주세요.'; return; }
    if (!recording) { status.textContent = '지금은 의견을 저장할 수 없어요. 작성한 내용은 그대로 두었어요.'; return; }
    if (!pending || pending.text !== text || pending.email !== address) pending = { feedback_id: makeId(), run_id: state.runId, mode: state.mode, text, email: address };
    button.disabled = true; textarea.disabled = true; email.disabled = true; status.textContent = '의견을 보내고 있어요…';
    try { await tracker.feedback(pending); textarea.value = ''; email.value = ''; pending = undefined; document.querySelector('#character-count').textContent = '0'; status.textContent = '보내주셔서 감사합니다. 잘 저장했어요.'; }
    catch { status.textContent = '저장 응답을 확인하지 못했어요. 입력한 내용은 그대로 두었어요.'; }
    finally { button.disabled = false; textarea.disabled = false; email.disabled = false; }
  });
  document.querySelector('#replay-button').addEventListener('click', () => { if (instant) showSetup(); else showStart(); focusHeading(); });
}

function focusHeading() { window.scrollTo({ top: 0, behavior: 'instant' }); document.querySelector('main h1')?.focus({ preventScroll: true }); }
try {
  const response = await fetch('/content.json'); if (!response.ok) throw new Error('Content unavailable');
  content = await response.json(); tracker = createTracker(content.version); showStart();
  tracker.available().then(enabled => {
    recording = enabled; if (enabled) tracker.event('visit');
    const notice = document.querySelector('.local-notice'); if (notice && enabled) notice.textContent = '방문·플레이 흐름은 익명으로 기록돼요.';
  });
} catch {
  app.innerHTML = '<section class="setup-card"><h1>새 학기를 불러오지 못했어요.</h1><p>연결을 확인하고 다시 시도해주세요.</p><button class="primary" id="reload">다시 불러오기</button></section>';
  document.querySelector('#reload').addEventListener('click', () => window.location.reload());
} finally { app.setAttribute('aria-busy', 'false'); }
