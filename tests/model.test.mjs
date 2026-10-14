import test from 'node:test';
import assert from 'node:assert/strict';
import { act, createGame, available, selectedJob, complete, cost, face, clock, START, END } from '../src/model.ts';
const start = day => act(createGame(day),{type:'start'});
test('出勤前は時計も行動も止まり、開始は一度だけ',()=>{
 const initial=createGame(); assert.equal(initial.time,START);assert.equal(initial.jobs.length,6);
 assert.equal(act(initial,{type:'work'}),initial);
 const s=act(initial,{type:'start'});assert.equal(s.status,'playing');assert.equal(act(s,{type:'start'}),s);assert.equal(initial.status,'ready');
});
test('仕事は対象だけ最大3進み、時間と疲労が変化する',()=>{
 const s=start();const t=act(s,{type:'work'});
 assert.equal(t.jobs[0].done,3);assert.equal(t.jobs[1].done,0);assert.equal(t.time,START+30);assert.equal(t.fatigue,18);
 assert.equal(available(t).length,2);assert.equal(s.jobs[0].done,0);
 const u=act(t,{type:'work'});assert.equal(u.jobs[0].done,4);assert.equal(u.selected,'job-1');
});
test('休憩は32回復、0未満にせず30分使う',()=>{
 let s=act(start(),{type:'work'});s=act(s,{type:'rest'});
 assert.equal(s.fatigue,0);assert.equal(s.time,START+60);assert.equal(s.rests,1);
 const high={...s,fatigue:75,peak:75};assert.equal(act(high,{type:'rest'}).fatigue,43);
});
test('先送りは15分、疲労-8、仕事量+1、最後へ移動、同一仕事は1回',()=>{
 const s=act(start(),{type:'work'});const t=act(s,{type:'defer'});
 assert.equal(t.time,s.time+15);assert.equal(t.fatigue,10);assert.equal(t.jobs.at(-1).id,'job-0');assert.equal(t.jobs.at(-1).total,5);assert.equal(t.jobs.at(-1).done,3);
 assert.equal(t.selected,'job-1');assert.equal(t.defers,1);
 const u=act(t,{type:'select',id:'job-0'});assert.equal(act(u,{type:'defer'}),u);
});
test('未到着の仕事は選べず、先の仕事がある間は退勤できない',()=>{
 const s=start();assert.equal(act(s,{type:'select',id:'job-5'}),s);assert.equal(act(s,{type:'leave'}),s);
 let t=s;while(available(t).length){t=act(t,{type:'work'});}
 assert.equal(t.status,'playing');assert.equal(t.selected,null);assert.equal(act(t,{type:'work'}),t);assert.equal(act(t,{type:'defer'}),t);
 const u=act(t,{type:'rest'});assert.ok(u.time>t.time);
});
test('全パターンで休憩を挟む戦略が定時までに成功する',()=>{
 for(let day=1;day<=3;day++){
  let s=start(day);let count=0;
  while(s.status==='playing'&&count++<40) {
   if(complete(s))s=act(s,{type:'leave'});
   else s=act(s,{type:available(s).length&&s.fatigue<54?'work':'rest'});
  }
  assert.equal(s.status,'won');assert.equal(s.time,END);assert.equal(s.jobs.filter(j=>j.done===j.total).length,6);assert.ok(s.fatigue<100);assert.ok(s.rests>0);assert.equal(face(s),'happy');
  assert.equal(act(s,{type:'rest'}),s);assert.equal(act(s,{type:'work'}),s);
 }
});
test('疲労限界は敗北となり、理由を説明する',()=>{
 let s=start();for(let i=0;i<8;i++)s=act(s,{type:'rest'});
 for(let i=0;i<6;i++)s=act(s,{type:'work'});
 assert.equal(s.status,'lost');assert.equal(s.fatigue,100);assert.match(s.reason,/疲労が100/);assert.equal(face(s),'exhausted');
});
test('定時に未完了なら敗北、時間が定時を超えない',()=>{
 let s=start();for(let i=0;i<16;i++)s=act(s,{type:'rest'});
 assert.equal(s.status,'lost');assert.equal(s.time,END);assert.match(s.reason,/仕事が6件/);
});
test('定時ちょうどの完了は勝利、同時疲労100は敗北',()=>{
 let s=start();s.time=END-30;s.jobs.forEach(j=>j.done=j.total);s.jobs[5].done=0;s.selected='job-5';
 assert.equal(act(s,{type:'work'}).status,'won');
 s.fatigue=90;assert.equal(act(s,{type:'work'}).status,'lost');
});
test('焦りによる疲労増加と表情は状態に応じる',()=>{
 const s=start();assert.equal(cost(s),18);assert.equal(face(s),'calm');assert.equal(cost({...s,fatigue:70}),22);assert.equal(face({...s,fatigue:45}),'tired');
});
test('ランダムな1000プレイで進行不能・範囲外・仕事超過がない',()=>{
 let seed=20261014;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 let wins=0,losses=0;
 for(let n=0;n<1000;n++){
  let s=start(n%3+1);let turns=0;
  while(s.status==='playing'&&turns++<40){
   const jobs=available(s);if(jobs.length)s=act(s,{type:'select',id:jobs[Math.floor(random()*jobs.length)].id});
   const r=random();let type=complete(s)?'leave':!selectedJob(s)?'rest':r<.62?'work':r<.83?'rest':selectedJob(s).deferred?'work':'defer';
   s=act(s,{type});
   assert.ok(s.time>=START&&s.time<=END);assert.ok(s.fatigue>=0&&s.fatigue<=100);
   assert.ok(s.jobs.every(j=>j.done>=0&&j.done<=j.total));assert.ok(!available(s).length||selectedJob(s));assert.ok(s.log.length<=10);
  }
  assert.notEqual(s.status,'playing');if(s.status==='won')wins++;else losses++;
 }
 assert.ok(wins>0);assert.ok(losses>0);
});
test('再プレイ用の新規状態は独立し、日替わりで仕事名が変わる',()=>{
 const a=start();a.jobs[0].done=4;a.fatigue=90;const b=createGame(2);
 assert.equal(b.time,START);assert.equal(b.fatigue,0);assert.ok(b.jobs.every(j=>!j.done&&!j.deferred));assert.notEqual(a.jobs[0].title,b.jobs[0].title);assert.equal(clock(START),'09:00');
});
