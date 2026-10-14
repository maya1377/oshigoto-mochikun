import Phaser from 'phaser';
import { face, START, END, type State } from './model.ts';
export class Office extends Phaser.Scene {
  private state!:State;
  private art!:Phaser.GameObjects.Graphics;
  private hero!:Phaser.GameObjects.Container;
  private body!:Phaser.GameObjects.Graphics;
  private motion: boolean;
  constructor(initial:State) {super('Office');this.state=initial;this.motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;}
  create() {
    this.art=this.add.graphics(); this.body=this.add.graphics(); this.hero=this.add.container(0,0,[this.body]);
    this.paint();
    if(this.motion) this.tweens.add({targets:this.hero,y:3,duration:1500,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.game.canvas.setAttribute('aria-hidden','true');
    this.game.canvas.dataset.ready='true';
  }
  show(state:State) {this.state=state;if(this.art)this.paint();}
  paint() {
    const g=this.art,b=this.body,s=this.state;g.clear();b.clear();
    const rect=(x:number,y:number,w:number,h:number,c:number,r=0)=>{g.fillStyle(c);r?g.fillRoundedRect(x,y,w,h,r):g.fillRect(x,y,w,h);};
    const line=(x:number,y:number,x2:number,y2:number,c=0x386356,w=3)=>{g.lineStyle(w,c);g.lineBetween(x,y,x2,y2);};
    const late=(s.time-START)/(END-START);
    rect(0,0,800,420,0xe7eddc);rect(0,318,800,102,0xd5decd);
    for(let x=0;x<800;x+=90)line(x,318,x-35,420,0xc2cdbb,1);
    rect(32,34,216,184,0xfdf9ef,9);rect(42,44,196,164,late>.7?0xf4be91:0xbadce0,4);
    g.fillStyle(0xf8e0a0);g.fillCircle(200,79+late*91,20);
    rect(52,149,40,59,0xa6bfb0);rect(98,122,61,86,0x97b2a3);rect(169,156,59,52,0xb5c9b8);
    for(let x=108;x<154;x+=18)for(let y=134;y<202;y+=22)rect(x,y,8,10,0xe4e8c1);
    rect(135,44,6,164,0xfdf9ef);rect(42,118,196,6,0xfdf9ef);rect(40,215,200,8,0x688575,3);
    rect(306,50,232,114,0xb89a6c,8);rect(314,58,216,98,0xf5e3b7,4);
    rect(330,77,75,57,0xfff9e9,2);rect(432,83,78,57,0xf1c690,2);
    line(343,92,387,92,0xc0ba9c,3);line(343,105,377,105,0xc0ba9c,3);line(343,118,384,118,0xc0ba9c,3);line(444,100,497,100,0xaf8d6d,3);line(444,113,488,113,0xaf8d6d,3);
    g.fillStyle(0xd57359);g.fillCircle(364,73,4);g.fillCircle(468,81,4);
    g.fillStyle(0xfffcf2);g.fillCircle(665,91,39);g.lineStyle(4,0x386356);g.strokeCircle(665,91,39);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;line(665+Math.sin(a)*29,91-Math.cos(a)*29,665+Math.sin(a)*33,91-Math.cos(a)*33,0x81917a,2);}
    const hour=(s.time/60)%12*Math.PI/6,minute=(s.time%60)*Math.PI/30;
    line(665,91,665+Math.sin(hour)*20,91-Math.cos(hour)*20,0x386356,4);line(665,91,665+Math.sin(minute)*28,91-Math.cos(minute)*28,0x386356,2);
    rect(665,279,48,49,0xcba585,8);line(689,289,685,233,0x537d62,5);g.fillStyle(0x6c946c);g.fillEllipse(676,245,32,17);g.fillEllipse(702,261,32,17);
    rect(289,262,164,27,0x9bbaae,13);rect(311,286,120,88,0x789586,12);
    g.fillStyle(0x263e33,.1);g.fillEllipse(396,373,338,26);
    const hc=face(s); b.fillStyle(0xfffaed);b.lineStyle(4,0x386356);
    const v=(x:number,y:number)=>new Phaser.Math.Vector2(x,y); const points=[...new Phaser.Curves.CubicBezier(v(323,292),v(303,206),v(341,179),v(385,177)).getPoints(20),...new Phaser.Curves.CubicBezier(v(385,177),v(444,174),v(473,222),v(464,292)).getPoints(20)]; b.fillPoints(points,true);b.strokePoints(points,true);
    b.fillStyle(0xe9a390,.65);b.fillEllipse(346,251,23,10);b.fillEllipse(440,251,23,10);b.lineStyle(4,0x386356);
    if(hc==='happy'){b.beginPath();b.arc(361,235,8,Math.PI,Math.PI*2);b.strokePath();b.beginPath();b.arc(423,235,8,Math.PI,Math.PI*2);b.strokePath();}
    else if(hc==='exhausted'){for(const x of [361,423]){b.lineBetween(x-7,229,x+7,237);b.lineBetween(x+7,229,x-7,237);}}
    else {b.fillStyle(0x386356);b.fillEllipse(361,235,6,hc==='tired'?5:11);b.fillEllipse(423,235,6,hc==='tired'?5:11);}
    if(hc==='happy'||hc==='calm'){b.beginPath();b.arc(392,249,9,0,Math.PI);b.strokePath();}else b.lineBetween(385,258,401,258);
    b.fillStyle(0x24584d);b.fillTriangle(385,278,399,278,392,289);b.fillTriangle(392,285,383,302,403,302);
    if(s.fatigue>=70){b.fillStyle(0x6eacbb);b.fillEllipse(465,217,9,16);}
    rect(229,286,351,21,0xba916b,5);rect(243,305,19,92,0x8c7862);rect(546,305,19,92,0x8c7862);
    rect(370,268,105,17,0x8bada2,3);for(let x=377;x<468;x+=13)line(x,272,x,281,0xd1e0d5,2);
    rect(281,252,50,34,0xfff9e9,7);g.lineStyle(4,0xe8d7b2);g.strokeCircle(333,264,11);rect(282,254,47,4,0x678871,2);
    const pending=s.jobs.filter(j=>j.release<=s.time&&j.done<j.total).length;
    for(let i=0;i<Math.max(1,pending);i++){rect(503,278-i*5,59,5,0xfbf5df,1);line(507,278-i*5,546,278-i*5,0xc6b895,1);}
    if(s.status==='won'){g.fillStyle(0xe8ba5d);for(const [x,y] of [[300,173],[490,160],[518,208]]){g.fillTriangle(x,y-8,x-3,y+2,x+3,y+2);g.fillTriangle(x,y+8,x-3,y-2,x+3,y-2);g.fillTriangle(x-8,y,x+2,y-3,x+2,y+3);g.fillTriangle(x+8,y,x-2,y-3,x-2,y+3);}}
  }
}
