import Phaser from 'phaser';
import './style.css';
import { act, createGame, available, selectedJob, complete, cost, clock, END, type Action } from './model.ts';
import { Office } from './office.ts';
import { markup } from './markup.ts';
let state=createGame();
let locked=false;
document.querySelector<HTMLDivElement>('#app')!.innerHTML=markup(import.meta.env.BASE_URL);
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const scene=new Office(state);
new Phaser.Game({type:Phaser.CANVAS,parent:'office',width:800,height:420,transparent:true,scene:[scene],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true},fps:{target:30,forceSetTimeOut:true}});
function openDialog(dialog:HTMLDialogElement){ if(!dialog.open)dialog.showModal(); }
function render() {
  const active=state.status==='playing',job=selectedJob(state),ready=available(state);
  el('day').textContent=state.day.toString().padStart(2,'0');el('time').textContent=clock(state.time);el('fatigue').textContent=String(state.fatigue);
  const rem=END-state.time;el('remaining').textContent=rem?`定時まで${Math.floor(rem/60)}時間${rem%60?`${rem%60}分`:''}`:'定時です。おつかれさま！';
  el('done').textContent=String(state.jobs.filter(j=>j.done===j.total).length);
  const bar=el('fatigue-meter');bar.setAttribute('aria-valuenow',String(state.fatigue));bar.style.setProperty('--fill',`${state.fatigue}%`);bar.classList.toggle('danger',state.fatigue>=70);
  const mood=state.status==='won'?'退勤！もちもち復活。':state.status==='lost'?'今日はもう、おしまい。':state.fatigue>=70?'そろそろ休憩しよう。':state.fatigue>=40?'ちょっと、しょんぼり。':'まだ、もちもち。';
  el('fatigue-tip').textContent=mood;el('mood').textContent=mood;el('speech').textContent=state.speech;
  el('office').setAttribute('aria-label',`オフィスのモチくん。${mood} 疲労${state.fatigue}。`);
  el('selection').textContent=job?`取りかかる仕事：${job.title}`:'今届いている仕事は完了。次の仕事まで休憩しよう。';
  el<HTMLButtonElement>('work').disabled=!active||!job||locked;el<HTMLButtonElement>('rest').disabled=!active||locked;el<HTMLButtonElement>('defer').disabled=!active||!job||job.deferred||locked;
  const hint=el('work-hint');hint.replaceChildren();
  for(const [i,text] of ['30分',`進捗＋${job?Math.min(3,job.total-job.done):3}`,`疲労＋${cost(state)}`].entries()){if(i)hint.append(document.createTextNode(' / '));const part=document.createElement('span');part.className='cost-fragment';part.textContent=text;hint.append(part);}
  el('defer').title=job?.deferred?'この仕事はすでに先送りしたよ。':'';
  el('leave').hidden=!active||!complete(state);el<HTMLButtonElement>('leave').disabled=locked;
  el('inbox-count').textContent=`${ready.length}件待ち`;
  const jobs=el('jobs');jobs.replaceChildren();
  for(const j of state.jobs){
    const pending=j.release>state.time,done=j.done===j.total;
    const card=document.createElement('button');card.type='button';card.className=`job ${pending?'pending':''} ${done?'finished':''} ${j.id===state.selected?'selected':''}`;card.disabled=!active||pending||done||locked;card.setAttribute('aria-pressed',String(j.id===state.selected));card.dataset.job=j.id;
    const head=document.createElement('span');head.className='job-meta';head.textContent=pending?`${clock(j.release)} に届く予定`:done?'✓ 完了':j.deferred?'先送り済み / もう一息':'受付中';
    const title=document.createElement('b');title.textContent=pending?'これから届くおしごと':j.title;
    const desc=document.createElement('span');desc.className='job-detail';desc.textContent=pending?'先の予定も、忘れずに。':j.note;
    const progress=document.createElement('span');progress.className='job-progress';progress.textContent=`${j.done} / ${j.total}`;
    const dots=document.createElement('span');dots.className='job-dots';dots.setAttribute('aria-hidden','true');for(let i=0;i<j.total;i++){const dot=document.createElement('i');if(i<j.done)dot.className='filled';dots.append(dot);}
    card.append(head,title,desc,dots,progress);card.addEventListener('click',()=>dispatch({type:'select',id:j.id}));jobs.append(card);
  }
  const log=el('log');log.replaceChildren();for(const entry of state.log){const item=document.createElement('li');item.textContent=entry;log.append(item);}
  scene.show(state);document.body.dataset.status=state.status;
  if(state.status==='won'||state.status==='lost'){
    const won=state.status==='won';el('result-title').textContent=won?'定時退勤、大成功。':'今日は、ここまで。';el('result-stamp').textContent=won?'たいへんよく帰れました':'明日は、もう少しゆるく';el('result-reason').textContent=state.reason;
    el('result-done').textContent=`${state.jobs.filter(j=>j.done===j.total).length} / 6`;el('result-rests').textContent=`${state.rests}回`;el('result-peak').textContent=String(state.peak);
    el('result-tip').textContent=won?'ちゃんと休んだモチくんは、えらい。':state.fatigue>=100?'疲労70を目安に、先に休憩を入れてみよう。':'後から届く仕事のために、午後の時間を残しておこう。';
    openDialog(el<HTMLDialogElement>('result'));el('replay').focus();
  }
}
function dispatch(action:Action) {
  if(locked)return;
  const next=act(state,action);if(next===state)return;state=next;
  if(action.type!=='select'&&action.type!=='start'){locked=true;setTimeout(()=>{locked=false;render();},180);}
  render();
}
el('start').addEventListener('click',()=>{el<HTMLDialogElement>('intro').close();dispatch({type:'start'});el('work').focus();});
for(const type of ['work','rest','defer','leave'] as const)el(type).addEventListener('click',()=>dispatch({type}));
el('replay').addEventListener('click',()=>{el<HTMLDialogElement>('result').close();locked=false;state=createGame(state.day+1);state=act(state,{type:'start'});render();el('work').focus();});
for(const id of ['intro','result'])el(id).addEventListener('cancel',e=>e.preventDefault());
render();openDialog(el<HTMLDialogElement>('intro'));el('start').focus();
