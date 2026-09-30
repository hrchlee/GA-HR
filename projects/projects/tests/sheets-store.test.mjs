import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../sheets-store.mjs';
const endpoint='https://script.google.com/macros/s/TEST/exec';
function server(){let board={schemaVersion:1,revision:0,projects:[],tasks:{}},forced=false;const writes=[];return {writes,get board(){return board;},forceConflict(){forced=true;},async fetcher(url,options={}){if(options.method!=='POST')return Response.json({board});const req=JSON.parse(options.body);if(forced){forced=false;board={...board,revision:board.revision+1};return Response.json({conflict:true});}if(req.expectedRevision!==board.revision)return Response.json({conflict:true});board=req.board;writes.push(req);return Response.json({ok:true});}};}
const mem=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const project={name:'테스트 프로젝트',description:'독립 보드',start:'2026-09-01',end:'2026-10-31'};
const task={id:null,title:'준비 업무',phase:'준비',owner:'',start:'2026-09-30',end:'2026-10-02',status:'doing',percent:40,blocker:'',link:'',checklist:[],logs:[],version:0};
const make=async(s,storage=mem())=>createStore({fetcher:s.fetcher,config:{endpoint},intervals:false,storage});
test('주소 미설정 시 안내 오류',async()=>{const a=await createStore({fetcher:async()=>{},config:{endpoint:'여기에'},intervals:false,storage:mem()});await assert.rejects(a.saveProject(project),/주소가 설정되지/);});
test('로그인 없이 저장하고 이름이 기록된다',async()=>{const s=server(),st=mem(),a=await make(s,st);a.setName('이창훈');const pid=await a.saveProject(project);await a.saveTask(pid,task);assert.equal(s.board.projects[0].name,project.name);assert.equal(s.board.tasks[pid][0].updatedBy,'이창훈');assert.equal(st.getItem('moa-board-name'),'이창훈');const b=await make(s,st);let u;b.watchAuth(x=>u=x);await Promise.resolve();assert.equal(u.named,true);});
test('같은 업무 동시 수정 시 오래된 저장 거부',async()=>{const s=server(),a=await make(s),b=await make(s),pid=await a.saveProject(project);await a.saveTask(pid,task);const old=structuredClone(s.board.tasks[pid][0]);await a.saveTask(pid,{...old,title:'먼저'});await assert.rejects(b.saveTask(pid,{...old,title:'나중'}),/다른 사람이/);assert.equal(s.board.tasks[pid][0].title,'먼저');});
test('서로 다른 업무 편집은 합쳐진다',async()=>{const s=server(),a=await make(s),b=await make(s),pid=await a.saveProject(project);await a.saveTask(pid,task);await a.saveTask(pid,{...task,title:'다른 업무'});const [one,two]=structuredClone(s.board.tasks[pid]);await a.saveTask(pid,{...one,title:'A'});await b.saveTask(pid,{...two,title:'B'});assert.deepEqual(s.board.tasks[pid].map(t=>t.title),['A','B']);});
test('리비전 충돌 시 재시도',async()=>{const s=server(),a=await make(s);s.forceConflict();await a.saveProject(project);assert.equal(s.board.projects.length,1);assert.equal(s.writes.length,1);});
