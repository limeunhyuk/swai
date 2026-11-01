// 기존 시트의 ‘확장 프로그램 > Apps Script’에서 이 함수를 한 번 실행한다.
// 기존 doGet/배포는 수정하지 않는다. 기존 데이터 값은 유지하고 오른쪽에 열과 서식을 추가한다.
function extendSwaiColumns() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet || spreadsheet.getId() !== '1vjLlxDEFvDrCS6gyeTJrcVk8VHM8LfXQbAwXqYQzfAk') throw new Error('기존 SWAI 스프레드시트에서 실행해주세요.');
  var master = ['id','landingUrl','ip','referer','time_stamp','utm','device'];
  var final = ['id','email','advice'];
  var details = ['기록형식','단계','진행방식','홍보코드','게시판','게시판코드','기록ID','방문ID','게임ID','선택ID','공고ID','콘텐츠버전','테스트'];
  var plans = [['tab_master', master, master.concat(details)], ['tab_final', final, final.concat(master.slice(1), details)]];
  // 두 탭을 먼저 검토한 뒤 변경한다.
  plans.forEach(function(plan) {
    var sheet = spreadsheet.getSheetByName(plan[0]);
    if (!sheet) throw new Error(plan[0] + ' 탭이 없습니다.');
    var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    plan[1].forEach(function(header,index) { if(headers[index] !== header) throw new Error(plan[0] + '의 기존 열 순서를 확인해주세요.'); });
    headers.forEach(function(header) { if (plan[2].indexOf(header) < 0) throw new Error(plan[0] + '에 예상하지 못한 열이 있습니다: ' + header); });
    if (new Set(headers).size !== headers.length) throw new Error(plan[0] + '에 중복 헤더가 있습니다.');
    plan.push(sheet, headers);
  });
  plans.forEach(function(plan) {
    var sheet = plan[3], headers = plan[4];
    var missing = plan[2].filter(function(header) { return headers.indexOf(header) < 0; });
    var all = headers.concat(missing);
    if (sheet.getMaxColumns() < all.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), all.length - sheet.getMaxColumns());
    if (missing.length) sheet.getRange(1,headers.length+1,1,missing.length).setValues([missing]);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,all.length).setFontWeight('bold').setBackground('#203b4a').setFontColor('#ffffff');
    sheet.getRange(1,1,Math.max(2,sheet.getLastRow()),all.length).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    sheet.setColumnWidths(1,all.length,130);
    ['landingUrl','referer'].forEach(function(header) { sheet.setColumnWidth(all.indexOf(header)+1,260); });
    if(plan[0] === 'tab_final') sheet.setColumnWidth(all.indexOf('advice')+1,360);
  });
  SpreadsheetApp.flush();
  console.log('추가 열·서식 적용 완료. 기존 행은 보존했습니다. 이제 웹 저장 형식을 3으로 전환할 수 있습니다.');
}
