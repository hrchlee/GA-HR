import {sheetsConfig} from './sheets-config.mjs';
import {assertRevision,validateTask,validateProject,uid} from './model.mjs';
const emptyBoard=()=>({schemaVersion:1,revision:0,projects:[],tasks:{}});
const NAME_KEY='moa-board-name';
function loadName(storage){try{return (storage?.getItem(NAME_KEY)||'').trim();}catch{return '';}}
function saveName(storage,name){try{storage?.setItem(NAME_KEY,name);}catch{}}
export async function createStore({fetcher=globalThis.fetch,config=sheetsConfig,intervals=true,storage=globalThis.localStorage}={}){
 const endpoint=String(config.endpoint||'');
 const saved=loadName(storage);
 const user={uid:'team',email:saved||'이름 미설정',named:!!saved,canEdit:true};
 let board=emptyBoard(),authCallback=()=>{},projectsCallback=null,projectsError=()=>{},timer=null,queue=Promise.resolve();
 const taskSubscribers=new Set();
 function ensureEndpoint(){if(!/^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[^/]+\/exec$/.test(endpoint))throw Error('데이터 저장소 주소가 설정되지 않았습니다. 관리자가 sheets-config.mjs에 웹 앱 주소를 입력해야 합니다.');}
 async function call(options){ensureEndpoint();let res;try{res=await fetcher(options?endpoint:`${endpoint}?t=${Date.now()}`,{cache:'no-store',redirect:'follow',...(options||{})});}catch{throw Error('데이터 저장소에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해주세요.');}
  if(!res.ok)throw Error('데이터 저장소가 응답하지 않습니다. 잠시 후 다시 시도해주세요.');
  let data;try{data=await res.json();}catch{throw Error('데이터 저장소 응답을 읽지 못했습니다. 웹 앱 액세스 권한이 "모든 사용자"인지 확인해주세요.');}
  if(data.error)throw Error(data.error);return data;}
 async function read(){const data=await call();const b=data.board;if(!b||b.schemaVersion!==1||!Array.isArray(b.projects)||!b.tasks||typeof b.tasks!=='object')throw Error('지원하지 않는 프로젝트 데이터 형식입니다.');return b;}
 function emit(){projectsCallback?.([...board.projects].sort((a,b)=>a.start.localeCompare(b.start)));for(const s of taskSubscribers)s.callback(board.tasks[s.pid]||[],false);}
 async function refresh(){try{const next=await read();if(next.revision>=board.revision){board=next;emit();}}catch(e){projectsError(e);}}
 function schedule(){clearInterval(timer);if(intervals)timer=setInterval(refresh,30000);}
 function mutate(change){const run=async()=>{for(let attempt=0;attempt<3;attempt++){const latest=await read(),next=structuredClone(latest);change(next);next.revision=latest.revision+1;next.updatedAt=new Date().toISOString();next.updatedBy=user.email;const body=JSON.stringify({expectedRevision:latest.revision,board:next});if(body.length>4000000)throw Error('프로젝트 데이터가 저장 한도에 가까워졌습니다. 관리자에게 문의해주세요.');
   let data;try{data=await call({method:'POST',body});}catch(e){if(/연결하지 못했습니다/.test(e.message))throw Error('저장 결과를 확인하지 못했습니다. 입력을 복사해 두고 새로고침하여 반영 여부를 확인해주세요.');throw e;}
   if(data.conflict){if(attempt<2)continue;throw Error('다른 변경사항과 겹쳤습니다. 입력을 유지했으니 잠시 후 다시 저장해주세요.');}
   board=next;emit();return;}};const result=queue.then(run,run);queue=result.catch(()=>{});return result;}
 return {
  setName(name){const v=String(name||'').trim().slice(0,30);if(!v)return;user.email=v;user.named=true;saveName(storage,v);},
  async login(name){this.setName(name);},
  async logout(){},
  watchAuth(callback){authCallback=callback;queueMicrotask(()=>callback(user));return ()=>{authCallback=()=>{};};},
  stopProjects(){projectsCallback=null;clearInterval(timer);timer=null;},
  watchProjects(_user,callback,error){projectsCallback=callback;projectsError=error;refresh();schedule();},
  watchTasks(pid,callback,error){const s={pid,callback,error};taskSubscribers.add(s);queueMicrotask(()=>{if(taskSubscribers.has(s))callback(board.tasks[pid]||[],false);});return ()=>taskSubscribers.delete(s);},
  refresh,
  async saveProject(input){const data=validateProject(input),id=data.id||uid();await mutate(b=>{const at=b.projects.findIndex(p=>p.id===id);if(data.id){if(at<0)throw Error('프로젝트가 삭제되었습니다.');assertRevision(b.projects[at].version,data.version);if((b.tasks[id]||[]).some(t=>t.start<data.start||t.end>data.end))throw Error('업무가 새 프로젝트 기간을 벗어납니다. 업무 일정을 먼저 조정해주세요.');b.projects[at]={...b.projects[at],name:data.name,description:data.description,start:data.start,end:data.end,version:data.version+1};}else{b.projects.push({id,name:data.name,description:data.description,start:data.start,end:data.end,ownerUid:user.uid,ownerLogin:user.email,version:1});b.tasks[id]=[];}});return id;},
  async saveTask(pid,input){const data=validateTask(input),id=data.id||uid();await mutate(b=>{const p=b.projects.find(p=>p.id===pid);if(!p)throw Error('프로젝트가 삭제되었습니다.');if(data.start<p.start||data.end>p.end)throw Error('업무 일정은 프로젝트 기간 안에 설정해주세요.');const rows=b.tasks[pid]||[],at=rows.findIndex(t=>t.id===id);if(data.id){if(at<0)throw Error('다른 사람이 이 업무를 삭제했습니다.');assertRevision(rows[at].version,data.version);}const record={...data,id,version:data.id?data.version+1:1,updatedAt:new Date().toISOString(),updatedBy:user.email};if(at<0)rows.push(record);else rows[at]=record;b.tasks[pid]=rows;});return id;},
  async deleteTask(pid,task){await mutate(b=>{const rows=b.tasks[pid]||[],current=rows.find(t=>t.id===task.id);if(!current)return;assertRevision(current.version,task.version);b.tasks[pid]=rows.filter(t=>t.id!==task.id);});},
  destroy(){clearInterval(timer);taskSubscribers.clear();projectsCallback=null;authCallback=()=>{};}
 };
}
