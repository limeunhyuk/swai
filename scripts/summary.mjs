import { platformCodes } from '../public/campaigns.js';

export const SUMMARY_HEADERS = ['유입 출처', '고유 방문 브라우저', '방문 횟수', '게임 시작 횟수', '게임 시작 브라우저', '게임 완료 브라우저', '게임 모집 클릭 브라우저', '게임 시작률', '게임 완료율', '게임 모집 클릭률', '피드백 제출', '의견 포함', '이메일 포함', '즉시 보기 시작 브라우저', '예시 도달 브라우저', '예시 모집 클릭 브라우저', '예시 모집 클릭률'];

export function buildSummary(events, feedback) {
  events = events.filter(row => row.is_test !== true && row.is_test !== 'TRUE');
  feedback = feedback.filter(row => row.is_test !== true && row.is_test !== 'TRUE');
  const sources = [...new Set(events.concat(feedback).map(row => row.source))].sort();
  const scopes = [{ label: '전체', match: () => true }, ...sources.map(source => ({ label: source, match: row => row.source === source }))];
  const dimensions = row => {
    const parts = row.source.split('__'), platform = platformCodes[parts[0]] || parts[0];
    if (!Object.values(platformCodes).includes(platform)) return [];
    return [platform, row.board || parts[1] || '', row.posted_date || parts[2] || 'undated'];
  };
  for (const [name, depth] of [['플랫폼', 1], ['게시판', 2], ['게시일', 3]]) {
    const keyFor = row => { const parts = dimensions(row); return parts.length && (depth === 1 || parts[1]) ? parts.slice(0, depth).join('__') : ''; };
    for (const key of new Set(events.concat(feedback).map(keyFor).filter(Boolean))) {
      scopes.push({ label: `${name}: ${key}`, match: row => keyFor(row) === key });
    }
  }
  for (const code of new Set(events.concat(feedback).map(row => row.campaign_code).filter(Boolean))) {
    scopes.push({ label: `게시물: ${code}`, match: row => row.campaign_code === code });
  }
  return scopes.map(({ label, match }) => {
    const rows = events.filter(match);
    const comments = feedback.filter(match);
    const visits = rows.filter(row => row.event_type === 'visit');
    const visitKeys = new Set(visits.map(row => row.visit_id + ':' + row.visitor_id));
    const starts = rows.filter(row => row.event_type === 'start' && visitKeys.has(row.visit_id + ':' + row.visitor_id));
    const runKeys = new Set(starts.map(row => row.visit_id + ':' + row.visitor_id + ':' + row.run_id));
    const unique = (list, key) => new Set(list.map(row => row[key])).size;
    const stage = type => unique(rows.filter(row => row.event_type === type && runKeys.has(row.visit_id + ':' + row.visitor_id + ':' + row.run_id)), 'visitor_id');
    const visitors = unique(visits, 'visitor_id'), started = unique(starts, 'visitor_id'), completed = stage('complete'), clicked = stage('job_click');
    const instantStarts = rows.filter(row => row.event_type === 'instant_start' && visitKeys.has(row.visit_id + ':' + row.visitor_id));
    const instantRuns = new Set(instantStarts.map(row => row.visit_id + ':' + row.visitor_id + ':' + row.run_id));
    const views = rows.filter(row => row.event_type === 'instant_view' && instantRuns.has(row.visit_id + ':' + row.visitor_id + ':' + row.run_id));
    const viewedRuns = new Set(views.map(row => row.visit_id + ':' + row.visitor_id + ':' + row.run_id));
    const instantClicked = unique(rows.filter(row => row.event_type === 'job_click' && row.mode === 'instant' && viewedRuns.has(row.visit_id + ':' + row.visitor_id + ':' + row.run_id)), 'visitor_id');
    const viewed = unique(views, 'visitor_id');
    return [label, visitors, unique(visits, 'visit_id'), unique(starts, 'run_id'), started, completed, clicked,
      visitors ? started / visitors : '', started ? completed / started : '', started ? clicked / started : '',
      unique(comments, 'feedback_id'), comments.filter(row => String(row.text).trim()).length, comments.filter(row => String(row.email).trim()).length,
      unique(instantStarts, 'visitor_id'), viewed, instantClicked, viewed ? instantClicked / viewed : ''];
  });
}
