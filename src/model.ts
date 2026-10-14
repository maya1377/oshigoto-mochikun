export const START = 9 * 60;
export const END = 17 * 60;
export const WORK_MINUTES = 30;
export const REST_MINUTES = 30;
export const DEFER_MINUTES = 15;
export const REST_RECOVERY = 32;
export interface Job { id: string; title: string; note: string; release: number; total: number; done: number; deferred: boolean; }
export interface State { day: number; status: 'ready' | 'playing' | 'won' | 'lost'; time: number; fatigue: number; peak: number; jobs: Job[]; selected: string | null; speech: string; log: string[]; reason: string; actions: number; rests: number; defers: number; }
export type Action = { type: 'start' | 'work' | 'rest' | 'defer' | 'leave' } | { type: 'select'; id: string };
const plans = [
  {release:0,total:4,titles:['朝のメール返信','受信箱のお片づけ','おはよう報告'],note:'「取り急ぎ」が３通ある。'},
  {release:30,total:3,titles:['会議用の資料づくり','議事録を整える','朝会の宿題'],note:'この会議、メールでもよかった気がする。'},
  {release:90,total:5,titles:['数字を合わせる','表計算の迷路','月次レポート'],note:'合計だけ、なぜか１違う。'},
  {release:210,total:4,titles:['ちょっとだけ修正','赤字の海を泳ぐ','例の「あれ」の確認'],note:'「ちょっと」の定義を知りたい。'},
  {release:300,total:3,titles:['社内チャット返信','既読の向こう側','午後の問い合わせ'],note:'スタンプだけでは終われなかった。'},
  {release:390,total:3,titles:['退勤前のひと仕事','最後の確認です','本日の締め作業'],note:'このあとに「最後」は来ない。約束。'},
];
export function clock(minutes: number) { return `${Math.floor(minutes / 60).toString().padStart(2,'0')}:${(minutes % 60).toString().padStart(2,'0')}`; }
export function createGame(day=1): State {
  return {day,status:'ready',time:START,fatigue:0,peak:0,jobs:plans.map((p,i)=>({id:`job-${i}`,title:p.titles[(day-1)%p.titles.length],note:p.note,release:START+p.release,total:p.total,done:0,deferred:false})),selected:'job-0',speech:'今日は、無理せず帰りたい。',log:[],reason:'',actions:0,rests:0,defers:0};
}
export function available(s: State) { return s.jobs.filter(j=>j.release<=s.time && j.done<j.total); }
export function selectedJob(s: State) { return available(s).find(j=>j.id===s.selected); }
export function complete(s: State) { return s.jobs.every(j=>j.done===j.total); }
export function cost(s: State) { return s.fatigue>=70?22:18; }
export function face(s: State) { return s.status==='won'?'happy':s.status==='lost'?'exhausted':s.fatigue>=70?'exhausted':s.fatigue>=40?'tired':'calm'; }
function record(s:State,text:string) { s.log.unshift(`${clock(s.time)}　${text}`); s.log=s.log.slice(0,10); }
export function act(previous: State, action: Action): State {
  if(action.type==='start') {
    if(previous.status!=='ready') return previous;
    const s=structuredClone(previous); s.status='playing'; s.speech='了解です。まずはメールから。'; record(s,'出勤。定時までに６件を片づけよう。'); return s;
  }
  if(previous.status!=='playing') return previous;
  if(action.type==='select') {
    if(!available(previous).some(j=>j.id===action.id)) return previous;
    return {...previous,selected:action.id};
  }
  const target=selectedJob(previous);
  if((action.type==='work'||action.type==='defer')&&!target) return previous;
  if(action.type==='defer'&&target?.deferred) return previous;
  if(action.type==='leave'&&!complete(previous)) return previous;
  const s=structuredClone(previous); const oldTime=s.time; s.actions++;
  if(action.type==='work'&&target) {
    const job=s.jobs.find(j=>j.id===target.id)!; const n=Math.min(3,job.total-job.done); job.done+=n; s.fatigue=Math.min(100,s.fatigue+cost(previous)); s.time+=WORK_MINUTES;
    s.speech=s.fatigue>=85?'もう帰りたい……。':job.done===job.total?'承知しました。ひとつ、完了！':'了解です。あと少し。';
    record(s,`${job.title}を${n}進めた${job.done===job.total?'。完了！':'。'}`);
  } else if(action.type==='rest') {
    s.time+=REST_MINUTES; s.fatigue=Math.max(0,s.fatigue-REST_RECOVERY); s.rests++; s.speech='お茶って、えらい。'; record(s,'30分休憩。疲労を32回復。');
  } else if(action.type==='defer'&&target) {
    const index=s.jobs.findIndex(j=>j.id===target.id); const [job]=s.jobs.splice(index,1); job.deferred=true; job.total+=1; s.jobs.push(job); s.time+=DEFER_MINUTES; s.fatigue=Math.max(0,s.fatigue-8); s.defers++; s.selected=available(s).find(j=>j.id!==job.id)?.id ?? job.id;
    s.speech='明日の自分に……いや、今日中だった。'; record(s,`${job.title}を後回し。引き継ぎメモで仕事量＋1。`);
  } else if(action.type==='leave') {
    s.fatigue=Math.max(0,s.fatigue-Math.floor((END-s.time)/REST_MINUTES)*REST_RECOVERY); s.time=END; s.speech='おつかれさまでした！'; record(s,'残り時間はひと休みして、定時退勤。');
  }
  s.time=Math.min(END,s.time); s.peak=Math.max(s.peak,s.fatigue);
  const arrivals=s.jobs.filter(j=>j.release>oldTime&&j.release<=s.time);
  if(arrivals.length) { record(s,`${arrivals.length}件の新しい仕事が届いた。`); s.speech=`「${arrivals[0].title}」が届いた。聞いてない。`; }
  if(!selectedJob(s)) s.selected=available(s)[0]?.id??null;
  if(s.fatigue>=100) {s.status='lost';s.reason='疲労が100に達した。休憩も立派なおしごと。';s.speech='限界です。今日はここまで。';}
  else if(s.time>=END) {s.status=complete(s)?'won':'lost';s.reason=complete(s)?'必要な６件を完了。疲労を限界にせず、定時退勤できた！':`17:00になったけど、仕事が${s.jobs.filter(j=>j.done<j.total).length}件残っていた。`;s.speech=s.status==='won'?'おつかれさまでした。もう帰る！':'無理です。定時が足りない。';}
  return s;
}
