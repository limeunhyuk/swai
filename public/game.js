export const INITIAL_GPA = 3.5;

export function createGame(content, profile, random = Math.random) {
  if (!content.profile.genders.some(({ id }) => id === profile.gender)) {
    throw new Error('성별을 선택해주세요.');
  }
  const scenes = content.semesters.flatMap(semester => {
    const pool = [...semester.life];
    for (let index = pool.length - 1; index > 0; index--) {
      const pick = Math.floor(random() * (index + 1));
      [pool[index], pool[pick]] = [pool[pick], pool[index]];
    }
    return [semester.career, ...pool.slice(0, 1)].map(id => content.scenes.find(scene => scene.id === id));
  });
  const surname = (profile.surname || '').trim() || '김';
  const givenName = (profile.givenName || '').trim() || '컴공';
  return {
    screen: 'play', sceneIndex: 0, scenes,
    profile: { ...profile, surname, givenName, name: surname + givenName }, selected: false,
    stats: Object.fromEntries(content.stats.map(stat => [stat.id, stat.initial])),
    history: [], experiences: [], grades: [], gpa: INITIAL_GPA
  };
}

// 계산과 화면이 같은 규칙을 사용한다. 선택 후에는 다음 이야기까지 다시 반영하지 않는다.
export function choose(content, state, choiceId) {
  if (state.screen !== 'play' || state.selected) return state;
  const scene = state.scenes[state.sceneIndex];
  const choice = scene.choices.find(item => item.id === choiceId);
  if (!choice) return state;
  const stats = { ...state.stats };
  const changes = {};
  for (const [id, effect] of Object.entries(choice.effects)) {
    const definition = content.stats.find(stat => stat.id === id);
    stats[id] = Math.max(definition.min, Math.min(definition.max, stats[id] + effect));
    changes[id] = stats[id] - state.stats[id];
  }
  return {
    ...state, selected: true, stats,
    experiences: choice.experience ? [...state.experiences, { ...choice.experience, year: scene.year, semester: scene.semester }] : state.experiences,
    history: [...state.history, {
      sceneId: scene.id, year: scene.year, semester: scene.semester,
      choiceId: choice.id, label: choice.label, feedback: choice.feedback, changes
    }]
  };
}

export function advance(content, state) {
  if (state.screen === 'grade') {
    if (state.grades.length !== Math.floor(state.sceneIndex / 2) + 1) return state;
    return state.sceneIndex === state.scenes.length - 1
      ? { ...state, screen: 'result' }
      : { ...state, screen: 'play', sceneIndex: state.sceneIndex + 1, selected: false };
  }
  if (state.screen !== 'play' || !state.selected) return state;
  if ((state.sceneIndex + 1) % 2 === 0) return { ...state, screen: 'grade' };
  return { ...state, sceneIndex: state.sceneIndex + 1, selected: false };
}

// 시연용 누적 평점. 학업 스탯을 조금 반영하며 학점별 정교한 계산은 하지 않는다.
export function rollGrade(content, state, random = Math.random) {
  const semester = Math.floor(state.sceneIndex / 2);
  if (state.screen !== 'grade' || state.grades.length !== semester) return state;
  const base = [3.60, 3.55, 3.77, 3.94][semester];
  const gpa = Math.round(Math.min(4.5, base + (state.stats.study + state.stats.inquiry * 0.3) * 0.012 + (random() - 0.5) * 0.04) * 100) / 100;
  const scene = state.scenes[state.sceneIndex];
  return { ...state, gpa, grades: [...state.grades, { year: scene.year, semester: scene.semester, gpa, previous: state.gpa }] };
}
