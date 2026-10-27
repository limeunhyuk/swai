export function createGame(content, profile) {
  if (!content.profile.genders.some(({ id }) => id === profile.gender) ||
      !content.profile.mbti.includes(profile.mbti)) {
    throw new Error('성별과 MBTI를 모두 선택해주세요.');
  }
  return {
    screen: 'play', sceneIndex: 0, profile: { ...profile }, selected: false,
    stats: Object.fromEntries(content.stats.map(stat => [stat.id, stat.initial])),
    history: []
  };
}

// 계산과 화면이 같은 규칙을 사용한다. 선택 후에는 다음 학기까지 다시 반영하지 않는다.
export function choose(content, state, choiceId) {
  if (state.screen !== 'play' || state.selected) return state;
  const scene = content.scenes[state.sceneIndex];
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
    history: [...state.history, {
      sceneId: scene.id, choiceId: choice.id, label: choice.label, changes
    }]
  };
}

export function advance(content, state) {
  if (state.screen !== 'play' || !state.selected) return state;
  if (state.sceneIndex === content.scenes.length - 1) return { ...state, screen: 'result' };
  return { ...state, sceneIndex: state.sceneIndex + 1, selected: false };
}
