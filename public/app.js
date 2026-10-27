import { createGame, choose, advance } from './game.js';

const app = document.querySelector('#app');
let content;
let state;
const profile = { gender: '', mbti: '' };

function escape(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function profileLabel() {
  return `${content.profile.genders.find(item => item.id === state.profile.gender).label} · ${state.profile.mbti}`;
}

function statsPanel(changes = {}) {
  return `<section class="stats-panel" aria-label="캐릭터 스탯">
    ${['공부', '생활'].map(group => `<div class="stat-group">
      <h3>${group}<span>${group === '공부' ? '차곡차곡 쌓은 경험' : '지금의 생활 여력'}</span></h3>
      <div class="stat-grid ${group === '생활' ? 'life' : ''}">
        ${content.stats.filter(stat => stat.group === group).map(stat => {
          const changed = Object.hasOwn(changes, stat.id);
          const delta = changes[stat.id];
          return `<div class="stat ${changed ? 'changed' : ''}">
            <span class="stat-label">${escape(stat.label)}</span>
            <div class="stat-numbers"><strong>${state.stats[stat.id]}</strong><span class="stat-max">/10</span>
              ${changed ? `<span class="delta ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : ''}">${delta > 0 ? '+' : ''}${delta}</span>` : ''}
            </div>
            <div class="stat-track" role="meter" aria-label="${escape(stat.label)}" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${state.stats[stat.id]}"><span style="width:${state.stats[stat.id] * 10}%"></span></div>
          </div>`;
        }).join('')}
      </div>
    </div>`).join('')}
  </section>`;
}

function showStart() {
  app.innerHTML = `<section class="start-screen">
    <div class="eyebrow"><span class="status-dot"></span> CAMPUS LIFE SIMULATOR</div>
    <h1 tabindex="-1">컴공으로<br><span>살아남기<span class="cursor" aria-hidden="true">_</span></span></h1>
    <p class="intro">과제도, 알바도, 친구도.<br>어떤 대학 생활을 만들어갈까요?</p>
    <div class="journey" aria-label="8학기, 8번의 선택, 그리고 졸업">
      <span class="journey-icon" aria-hidden="true">&lt;/&gt;</span>
      <div><strong>8학기, 8번의 선택</strong><p>나만의 대학 생활에서 실제 진로 탐색까지.</p></div>
      <span class="journey-end" aria-hidden="true">↗</span>
    </div>
    <form id="profile-form" class="setup-card">
      <div class="section-heading"><h2>새내기 프로필</h2><span>01 / START</span></div>
      <p class="muted setup-description">키워보고 싶은 가상 컴공생을 설정해주세요.</p>
      <fieldset><legend>캐릭터 성별 <span>필수</span></legend>
        <div class="gender-options">${content.profile.genders.map(gender => `<label class="gender-option"><input type="radio" name="gender" value="${gender.id}" required><span>${escape(gender.label)}</span></label>`).join('')}</div>
      </fieldset>
      <label class="field-label" for="mbti">캐릭터 MBTI <span>필수</span></label>
      <select id="mbti" name="mbti" required><option value="">유형을 선택해주세요</option>${content.profile.mbti.map(type => `<option value="${type}">${type}</option>`).join('')}</select>
      <p class="profile-note">프로필은 자유롭게 골라도 좋아요. 선택지와 성장에는 영향을 주지 않아요.</p>
      <button class="primary" id="start-button" disabled>대학 생활 시작하기 <span aria-hidden="true">→</span></button>
      <p class="setup-hint" id="setup-hint" aria-live="polite">성별과 MBTI를 고르면 시작할 수 있어요.</p>
    </form>
    <p class="local-notice">1차 체험판 · 플레이 기록과 의견은 서버에 저장되지 않아요.</p>
  </section>`;
  const form = document.querySelector('#profile-form');
  form.addEventListener('change', () => {
    const data = new FormData(form);
    profile.gender = data.get('gender') || '';
    profile.mbti = data.get('mbti') || '';
    const ready = Boolean(profile.gender && profile.mbti);
    document.querySelector('#start-button').disabled = !ready;
    document.querySelector('#setup-hint').textContent = ready ? '준비 완료! 나만의 1학기를 시작해보세요.' : '성별과 MBTI를 고르면 시작할 수 있어요.';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!profile.gender || !profile.mbti) return;
    state = createGame(content, profile);
    showPlay();
    focusHeading();
  });
}

function direction(effects) {
  return Object.entries(effects).map(([id, effect]) => {
    const stat = content.stats.find(item => item.id === id);
    return `<span class="effect ${effect > 0 ? 'positive' : 'negative'}">${escape(stat.label)} ${effect > 0 ? '↑' : '↓'}</span>`;
  }).join('');
}

function showPlay() {
  const scene = content.scenes[state.sceneIndex];
  const entry = state.selected ? state.history.at(-1) : undefined;
  const selected = entry && scene.choices.find(choice => choice.id === entry.choiceId);
  app.innerHTML = `<section class="play-screen">
    <div class="player-line"><span class="mini-profile"><span aria-hidden="true">&lt;/&gt;</span> 가상 컴공생</span><span>${escape(profileLabel())}</span></div>
    <div class="semester-heading"><div><p class="eyebrow">MY CAMPUS LIFE</p><h1 tabindex="-1">${scene.year}학년 ${scene.semester}학기</h1></div><span class="step-count"><strong>${state.sceneIndex + 1}</strong> / 8</span></div>
    <div class="semester-track" aria-label="총 8학기 중 ${state.history.length}학기 선택 완료">${content.scenes.map((item, index) => `<span class="${index < state.history.length ? 'done' : ''} ${index === state.sceneIndex ? 'current' : ''}"></span>`).join('')}</div>
    ${statsPanel(entry?.changes)}
    <section class="scene-card" aria-labelledby="scene-title">
      <div class="scene-meta"><span class="badge">${scene.kind}</span><span>EPISODE ${String(state.sceneIndex + 1).padStart(2, '0')}</span></div>
      <h2 id="scene-title">${escape(scene.prompt)}</h2>
      <p class="scene-hint">${state.selected ? '이번 학기의 선택을 마쳤어요.' : '이번 학기, 나의 선택은?'}</p>
      <div class="choices">${scene.choices.map((choice, index) => `<button class="choice ${choice.id === selected?.id ? 'is-selected' : ''}" data-choice="${choice.id}" ${state.selected ? 'disabled' : ''}>
        <span class="choice-letter" aria-hidden="true">${choice.id === selected?.id ? '✓' : String.fromCharCode(65 + index)}</span>
        <span class="choice-body"><span class="choice-label">${escape(choice.label)}</span><span class="effects">${direction(choice.effects)}</span></span>
      </button>`).join('')}</div>
      ${selected ? `<div class="feedback" role="status"><p class="feedback-label">이번 선택으로</p><p>${escape(selected.feedback)}</p><div class="actual-changes">${Object.entries(entry.changes).map(([id, delta]) => {
        const stat = content.stats.find(item => item.id === id);
        const capped = delta !== selected.effects[id];
        return `<span class="effect ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : ''}">${escape(stat.label)} ${delta > 0 ? '+' : ''}${delta}${capped ? ` (${state.stats[id] === stat.max ? '상한' : '하한'} 도달)` : ''}</span>`;
      }).join('')}</div></div><button class="primary" id="next-button">${state.sceneIndex === content.scenes.length - 1 ? '졸업 결과 보기' : '다음 학기로'} <span aria-hidden="true">→</span></button>` : ''}
    </section>
    <p class="play-note">${state.selected ? '선택은 한 학기에 한 번만 반영돼요.' : '↑ 상승 · ↓ 하락 · 어떤 선택을 해도 졸업까지 갈 수 있어요.'}</p>
  </section>`;
  document.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
    const next = choose(content, state, button.dataset.choice);
    if (next === state) return;
    state = next;
    showPlay();
    document.querySelector('#next-button').focus({ preventScroll: true });
    document.querySelector('#next-button').scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }));
  document.querySelector('#next-button')?.addEventListener('click', () => {
    state = advance(content, state);
    if (state.screen === 'result') showResult();
    else showPlay();
    focusHeading();
  });
}

function showResult() {
  const result = content.result;
  app.innerHTML = `<section class="result-screen">
    <div class="eyebrow"><span class="status-dot"></span> CHAPTER COMPLETE</div>
    <div class="graduation-heading"><span class="graduation-symbol" aria-hidden="true">✳</span><h1 tabindex="-1">${escape(result.title)}</h1><p class="muted">여덟 번의 선택이 나만의 대학 생활이 되었어요.</p></div>
    <div class="result-profile"><span>가상 컴공생 · ${escape(profileLabel())}</span><span class="badge">8 / 8학기 완료</span></div>
    ${statsPanel()}
    <details class="history"><summary>내 8학기 선택 보기 <span>8개의 순간</span></summary><ol>${state.history.map((entry, index) => `<li><span>${content.scenes[index].year}학년 ${content.scenes[index].semester}학기</span><p>${escape(entry.label)}</p></li>`).join('')}</ol></details>
    <section class="career-card" aria-labelledby="career-title">
      <p class="eyebrow">NEXT CHAPTER</p><h2 id="career-title">${escape(result.careerTitle)}</h2>
      <h3>${escape(result.role)}</h3><p>${escape(result.description)}</p>
      <p class="career-notice">${escape(result.notice)}</p>
    </section>
    <section class="jobs" aria-labelledby="jobs-title"><div class="section-heading"><h2 id="jobs-title">실제 공고 살펴보기</h2><span>2 POSITIONS</span></div>
      ${result.jobs.map(job => `<article class="job-card"><div class="job-top"><span>${escape(job.company)}</span><span class="badge">${escape(job.experience)}</span></div><h3>${escape(job.title)}</h3><p>${escape(job.description)}</p><a class="job-link" href="${escape(job.url)}" target="_blank" rel="noopener noreferrer">공고 보기 <span aria-hidden="true">↗</span><span class="sr-only"> · ${escape(job.company)} · 새 탭</span></a><p class="job-date">${job.checkedAt} 확인 · ${escape(job.deadline)}</p></article>`).join('')}
      <p class="muted jobs-note">모집 상태와 지원 요건은 공고 원문에서 확인해주세요.</p>
    </section>
    <section class="suggestions" aria-labelledby="feedback-title"><h2 id="feedback-title">건의사항</h2><p class="muted">아쉬운 점이나 개선했으면 하는 점을 자유롭게 적어주세요.</p>
      <form id="feedback-form"><label for="feedback-text" class="sr-only">건의사항 내용</label><textarea id="feedback-text" name="feedback" rows="4" maxlength="1000" placeholder="어떤 순간이 가장 기억에 남았나요?" aria-describedby="feedback-limit feedback-status" required></textarea>
      <div class="feedback-actions"><span id="feedback-limit"><span id="character-count">0</span> / 1,000자</span><button class="secondary" type="submit">보내기 <span aria-hidden="true">↗</span></button></div>
      <p id="feedback-status" class="form-status" role="status">1차 체험판에서는 의견이 서버에 저장되지 않아요.</p></form>
    </section>
  </section>`;
  const textarea = document.querySelector('#feedback-text');
  textarea.addEventListener('input', () => {
    document.querySelector('#character-count').textContent = textarea.value.length;
  });
  document.querySelector('#feedback-form').addEventListener('submit', event => {
    event.preventDefault();
    document.querySelector('#feedback-status').textContent = textarea.value.trim()
      ? '아직 저장 서버가 연결되지 않아 전송하지 못했어요. 작성한 내용은 그대로 두었어요.'
      : '공백을 제외한 의견을 입력해주세요.';
  });
}

function focusHeading() {
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.querySelector('main h1').focus({ preventScroll: true });
}

try {
  const response = await fetch('./content.json');
  if (!response.ok) throw new Error('Content unavailable');
  content = await response.json();
  showStart();
} catch {
  app.innerHTML = '<section class="setup-card"><h1>새 학기를 불러오지 못했어요.</h1><p>연결을 확인하고 다시 시도해주세요.</p><button class="primary" id="reload">다시 불러오기</button></section>';
  document.querySelector('#reload').addEventListener('click', () => window.location.reload());
} finally {
  app.setAttribute('aria-busy', 'false');
}
