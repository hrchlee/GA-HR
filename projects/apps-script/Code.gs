/**
 * 모아 프로젝트 보드 - 구글 시트 저장소
 * 이 스크립트는 연결된 구글 시트에 보드 데이터를 저장합니다.
 *  - "data" 시트: 앱이 읽고 쓰는 원본 데이터 (직접 수정하지 마세요)
 *  - "업무현황" 시트: 사람이 보기 쉬운 업무 목록 (저장할 때마다 자동 갱신)
 */
const DATA_SHEET = 'data';
const VIEW_SHEET = '업무현황';
const CHUNK = 40000;   // 셀 1개 최대 50,000자 제한 대비
const STATUS = { todo: '진행 대기', doing: '진행 중', blocked: '막힘', done: '완료' };

function emptyBoard_() { return { schemaVersion: 1, revision: 0, projects: [], tasks: {} }; }

function dataSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(DATA_SHEET) || ss.insertSheet(DATA_SHEET);
}

function readBoard_() {
  const sh = dataSheet_();
  const rows = sh.getLastRow();
  if (!rows) return emptyBoard_();
  const text = sh.getRange(1, 1, rows, 1).getValues()
    .map(r => String(r[0] || '').replace(/^J/, '')).join('');
  return text ? JSON.parse(text) : emptyBoard_();
}

function writeBoard_(board) {
  const sh = dataSheet_();
  const text = JSON.stringify(board);
  const chunks = [];
  // 각 조각 앞에 'J'를 붙여 시트가 숫자·날짜·수식으로 해석하지 않게 합니다.
  for (let i = 0; i < text.length; i += CHUNK) chunks.push(['J' + text.slice(i, i + CHUNK)]);
  sh.clearContents();
  sh.getRange(1, 1, chunks.length, 1).setNumberFormat('@').setValues(chunks);
}

function safe_(v) {
  const s = v == null ? '' : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function writeView_(board) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(VIEW_SHEET) || ss.insertSheet(VIEW_SHEET);
  const rows = [['프로젝트', '단계', '업무', '담당자', '시작일', '마감일', '상태', '진행률(%)', '최근 수정자', '최근 수정']];
  board.projects.forEach(p => (board.tasks[p.id] || []).forEach(t => rows.push([
    safe_(p.name), safe_(t.phase), safe_(t.title), safe_(t.owner || '미지정'), t.start, t.end,
    STATUS[t.status] || t.status, t.percent, safe_(t.updatedBy), t.updatedAt || ''
  ])));
  sh.clearContents();
  sh.getRange(1, 1, rows.length, rows[0].length).setNumberFormat('@').setValues(rows);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  try { return json_({ board: readBoard_() }); }
  catch (e) { return json_({ error: '데이터를 읽지 못했습니다: ' + e.message }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); }
  catch (err) { return json_({ conflict: true }); }
  try {
    const req = JSON.parse(e.postData.contents);
    const next = req.board;
    if (!next || next.schemaVersion !== 1 || !Array.isArray(next.projects) || typeof next.tasks !== 'object') {
      return json_({ error: '저장할 데이터 형식이 올바르지 않습니다.' });
    }
    const current = readBoard_();
    if (current.revision !== req.expectedRevision || next.revision !== current.revision + 1) {
      return json_({ conflict: true });
    }
    writeBoard_(next);
    try { writeView_(next); } catch (viewErr) { /* 보기용 시트 오류는 저장에 영향 없음 */ }
    return json_({ ok: true, revision: next.revision });
  } catch (err) {
    return json_({ error: '저장하지 못했습니다: ' + err.message });
  } finally {
    lock.releaseLock();
  }
}
