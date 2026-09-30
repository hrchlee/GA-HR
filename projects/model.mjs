export const STATUSES={todo:'진행 대기',doing:'진행 중',blocked:'막힘',done:'완료'};
export const uid=()=>crypto.randomUUID();
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function addDays(value,n){const date=new Date(value+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10);}
export function daysBetween(a,b){return Math.round((Date.parse(b)-Date.parse(a))/86400000);}
export function dayRange(a,b){if(!validDate(a)||!validDate(b)||a>b||daysBetween(a,b)>730)throw Error('일정 범위는 시작일부터 최대 2년까지 설정해주세요.');return Array.from({length:daysBetween(a,b)+1},(_,i)=>addDays(a,i));}
export function normalizeEmails(text){const emails=[...new Set(text.split(/[,;\s]+/).map(x=>x.trim().toLowerCase()).filter(Boolean))];if(emails.length>50||emails.some(x=>!/^\S+@[^\s@]+\.[^\s@]+$/.test(x)))throw Error('참여자 이메일을 확인해주세요. 최대 50명까지 등록할 수 있습니다.');return emails;}
export function safeUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
export function validateProject(p){if(!p.name?.trim()||p.name.length>100)throw Error('프로젝트명은 1~100자로 입력해주세요.');dayRange(p.start,p.end);return {...p,name:p.name.trim()};}
export function deriveProgress(checklist,status){const total=checklist.length,done=checklist.filter(c=>c.done).length;let next=status;if(total){if(done===total)next='done';else if(next==='done')next='doing';else if(next==='todo'&&done>0)next='doing';}const percent=total?(done===total?100:Math.floor(done/total*100)):(next==='done'?100:0);return {status:next,percent,done,total};}
export function validateTask(t){if(!t.title?.trim()||t.title.length>150)throw Error('업무명은 1~150자로 입력해주세요.');dayRange(t.start,t.end);if(!Object.hasOwn(STATUSES,t.status))throw Error('업무 상태를 확인해주세요.');if(t.link&&!safeUrl(t.link))throw Error('자료 링크는 http 또는 https 주소로 입력해주세요.');if(t.checklist.length>50||t.logs.length>200)throw Error('하위 업무는 50개, 기록은 200개까지 저장할 수 있습니다.');
const checklist=t.checklist.map(c=>{const text=String(c.text||'').trim();if(!text||text.length>200)throw Error('하위 업무명은 1~200자로 입력해주세요.');const start=c.start||t.start,end=c.end||t.end;if(!validDate(start)||!validDate(end)||start>end)throw Error(`하위 업무 "${text}"의 시작일과 마감일을 확인해주세요.`);if(start<t.start||end>t.end)throw Error(`하위 업무 "${text}"의 일정은 업무 기간(${t.start} ~ ${t.end}) 안에 설정해주세요.`);const done=!!c.done;return {id:c.id||uid(),text,start,end,done,doneAt:done?(validDate(c.doneAt)?c.doneAt:today()):''};});
const {status,percent}=deriveProgress(checklist,t.status);if(status==='blocked'&&!t.blocker?.trim())throw Error('막힌 이유를 입력해주세요.');return {...t,title:t.title.trim(),owner:t.owner.trim(),checklist,status,percent};}
export function assertRevision(current,expected){if(current!==expected)throw Error('다른 사람이 이 업무를 수정했습니다. 입력 내용은 유지됩니다. 최신 내용을 확인한 뒤 다시 수정해주세요.');}
export function summary(tasks,date=today()){const done=tasks.filter(t=>t.status==='done').length;return {total:tasks.length,done,late:tasks.filter(t=>t.end<date&&t.status!=='done').length,unassigned:tasks.filter(t=>!t.owner).length,blocked:tasks.filter(t=>t.status==='blocked').length,percent:tasks.length?Math.round(tasks.reduce((s,t)=>s+t.percent,0)/tasks.length):0};}
export function demoData(){const start=addDays(today(),-5),end=addDays(today(),18),d=n=>addDays(today(),n);
const defs=[['프로젝트 범위와 일정 확정','기획','이서연',-5,-3,'todo',[['목표와 범위 정의',-5,-5,1],['일정 초안 작성',-4,-4,1],['팀 검토 회의',-3,-3,1]]],
['유관부서 요구사항 취합','기획','김민준',-4,1,'doing',[['요청 양식 배포',-4,-3,1],['1차 의견 수집',-3,-1,1],['2차 의견 수집',-1,0,1],['요구사항 정리',0,1,0]]],
['필요 자료 및 기준 정리','준비','',-2,3,'todo',[['기존 자료 확인',-2,0,0],['기준안 작성',1,3,0]]],
['시스템 접근 권한 확보','준비','박지수',-3,-1,'blocked',[['권한 신청서 제출',-3,-3,1],['담당 부서 승인',-2,-1,0],['접속 테스트',-1,-1,0]]],
['담당자별 실행 업무 진행','실행','이서연',1,10,'todo',[['1주차 실행',1,4,0],['2주차 실행',5,8,0],['결과 취합',9,10,0]]],
['중간 점검 및 피드백 반영','실행','김민준',7,12,'todo',[['중간 점검 회의',7,7,0],['피드백 반영',8,12,0]]],
['최종 검토 및 결과 공유','마무리','',12,16,'todo',[['최종 보고서 작성',12,14,0],['결과 공유회',15,16,0]]]];
return {projects:[{id:'demo',name:'4분기 업무 운영체계 정비',description:'준비부터 결과 공유까지, 팀의 진행상황을 한눈에 확인합니다.',start,end,ownerUid:'demo',ownerEmail:'demo@example.com',memberEmails:['demo@example.com'],version:1}],
tasks:defs.map(([title,phase,owner,a,b,status,subs],i)=>validateTask({id:'demo-'+i,title,phase,owner,start:d(a),end:d(b),status,percent:0,blocker:status==='blocked'?'담당 부서의 접근 권한 승인 대기':'',link:'',version:1,checklist:subs.map(([text,x,y,done])=>({id:uid(),text,start:d(x),end:d(y),done:!!done,doneAt:done?d(y):''})),logs:i===1?[{id:uid(),date:today(),note:'각 부서 의견 취합 중입니다. 남은 2개 부서는 내일 확인합니다.',status:'doing',percent:75,author:'김민준',createdAt:new Date().toISOString()}]:[]}))};}
