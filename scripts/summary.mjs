export const SUMMARY_HEADERS = ['유입 출처', '고유 방문 브라우저', '방문 횟수', '시작 횟수', '시작 브라우저', '완료 브라우저', '모집 클릭 브라우저', '시작률', '완료율', '모집 클릭률', '피드백 제출', '의견 포함', '이메일 포함'];

export function buildSummary(events, feedback) {
  events = events.filter(row => row.is_test !== true && row.is_test !== 'TRUE');
  feedback = feedback.filter(row => row.is_test !== true && row.is_test !== 'TRUE');
  const sources = [...new Set(events.concat(feedback).map(row => row.source))].sort();
  return [null, ...sources].map(source => {
    const rows = events.filter(row => source === null || row.source === source);
    const comments = feedback.filter(row => source === null || row.source === source);
    const visits = rows.filter(row => row.event_type === 'visit');
    const visitKeys = new Set(visits.map(row => row.visit_id + ':' + row.visitor_id));
    const starts = rows.filter(row => row.event_type === 'start' && visitKeys.has(row.visit_id + ':' + row.visitor_id));
    const runKeys = new Set(starts.map(row => row.visit_id + ':' + row.visitor_id + ':' + row.run_id));
    const unique = (list, key) => new Set(list.map(row => row[key])).size;
    const stage = type => unique(rows.filter(row => row.event_type === type && runKeys.has(row.visit_id + ':' + row.visitor_id + ':' + row.run_id)), 'visitor_id');
    const visitors = unique(visits, 'visitor_id'), started = unique(starts, 'visitor_id'), completed = stage('complete'), clicked = stage('job_click');
    return [source === null ? '전체' : source, visitors, unique(visits, 'visit_id'), unique(starts, 'run_id'), started, completed, clicked,
      visitors ? started / visitors : '', started ? completed / started : '', started ? clicked / started : '',
      unique(comments, 'feedback_id'), comments.filter(row => String(row.text).trim()).length, comments.filter(row => String(row.email).trim()).length];
  });
}
