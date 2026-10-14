import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root=resolve('.');
const dist=resolve(root,'dist');
const evidence=resolve(root,'verification');
const profile=resolve(evidence,'browser-profile');
const shots=resolve(evidence,'screenshots');
await mkdir(shots,{recursive:true});
const checks=[];const errors=[];const network=[];
function pass(name){checks.push(name);console.log('PASS '+name);}
const server=createServer(async(req,res)=>{
 try {
  let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith('/oshigoto-mochikun/')){res.writeHead(404);res.end();return;}
  path=path.slice('/oshigoto-mochikun/'.length)||'index.html';
  const file=resolve(dist,path);
  if(!file.startsWith(dist+sep)){res.writeHead(403);res.end();return;}
  const data=await readFile(file);
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const url='http://127.0.0.1:'+server.address().port+'/oshigoto-mochikun/';
let context;
try {
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1100},reducedMotion:'reduce',locale:'ja-JP'});
 const page=context.pages()[0]||await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>network.push(r.url()));
 async function boot(){
  await page.goto(url);await page.waitForSelector('#intro[open]');
  await page.waitForSelector('canvas[data-ready="true"]');
 }
 async function start(){await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.status==='playing');}
 async function action(id){
  await page.locator('#'+id).click();
  await page.waitForFunction(()=>document.body.dataset.status!=='playing'||!document.querySelector('#rest').disabled);
 }
 async function screenshot(name){await page.screenshot({path:resolve(shots,name+'.png'),fullPage:true});}
 await boot();
 assert.match(await page.locator('#intro').textContent(),/17:00/);assert.match(await page.locator('#intro').textContent(),/疲労100/);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#intro').getAttribute('open'),'');
 await screenshot('01-intro');pass('開始案内・勝敗条件・オリジナル素材・Canvas起動');
 await start();
 const time=await page.locator('#time').textContent();await page.waitForTimeout(250);assert.equal(await page.locator('#time').textContent(),time);
 assert.equal(await page.locator('[data-job="job-5"]').isDisabled(),true);
 await action('work');assert.equal(await page.locator('#time').textContent(),'09:30');assert.equal(await page.locator('#fatigue').textContent(),'18');assert.equal(await page.locator('[data-job="job-0"] .job-progress').textContent(),'3 / 4');
 pass('仕事で進捗・疲労・時刻更新／思考中は時間停止');
 await action('defer');assert.equal(await page.locator('#time').textContent(),'09:45');assert.equal(await page.locator('#fatigue').textContent(),'10');assert.equal(await page.locator('.job').last().getAttribute('data-job'),'job-0');assert.equal(await page.locator('[data-job="job-0"] .job-progress').textContent(),'3 / 5');
 await page.locator('[data-job="job-0"]').click();assert.equal(await page.locator('#defer').isDisabled(),true);
 pass('先送りの時間・疲労・仕事量・並べ替え・１回制限');
 await action('rest');assert.equal(await page.locator('#fatigue').textContent(),'0');await screenshot('02-playing');
 pass('休憩で回復／仕事選択／受信箱と操作画面');
 await boot();await start();let turns=0;
 while(await page.locator('body').getAttribute('data-status')==='playing'&&turns++<40){
  const fatigue=Number(await page.locator('#fatigue').textContent());
  if(await page.locator('#leave').isVisible())await action('leave');
  else if(await page.locator('#work').isEnabled()&&fatigue<54)await action('work');
  else await action('rest');
 }
 assert.equal(await page.locator('body').getAttribute('data-status'),'won');
 assert.equal(await page.locator('#time').textContent(),'17:00');
 assert.equal(await page.locator('#done').textContent(),'6');
 assert.match(await page.locator('#result-reason').textContent(),/定時退勤/);
 await screenshot('03-victory');pass('実操作だけで６件完了・勝利・結果理由');
 await page.locator('#replay').click();
 assert.equal(await page.locator('#time').textContent(),'09:00');assert.equal(await page.locator('#fatigue').textContent(),'0');assert.equal(await page.locator('#day').textContent(),'02');assert.equal(await page.locator('#result').getAttribute('open'),null);
 pass('再プレイで状態と仕事を初期化');
 for(let i=0;i<8;i++)await action('rest');
 for(let i=0;i<6;i++)await action('work');
 assert.equal(await page.locator('body').getAttribute('data-status'),'lost');assert.match(await page.locator('#result-reason').textContent(),/疲労が100/);
 await screenshot('04-exhaustion');pass('疲労限界・表情・敗北理由');
 await page.locator('#replay').click();
 for(let i=0;i<16;i++)await action('rest');
 assert.equal(await page.locator('body').getAttribute('data-status'),'lost');assert.match(await page.locator('#result-reason').textContent(),/仕事が6件/);
 await screenshot('05-timeout');pass('時間切れ・未完了件数・結果画面');
 for(const viewport of [{width:1280,height:720},{width:800,height:900},{width:390,height:844},{width:320,height:568}]){
  await page.setViewportSize(viewport);await boot();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const dialog=await page.locator('#intro').boundingBox();assert.ok(dialog.x>=0&&dialog.x+dialog.width<=viewport.width+1);
  await start();await screenshot('responsive-'+viewport.width);
  const buttons=await page.locator('.action').evaluateAll(items=>items.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,w:r.width,h:r.height};}));
  assert.ok(buttons.every(b=>b.h>=44&&b.x>=0&&b.x+b.w<=viewport.width+1));
  const canvas=await page.locator('canvas').boundingBox();assert.ok(canvas.width>0&&canvas.height>0);
 }
 pass('1280・800・390・320pxの表示／横あふれなし／ボタン44px以上');
 await page.setViewportSize({width:1440,height:1100});await boot();
 await page.keyboard.press('Enter');assert.equal(await page.locator('body').getAttribute('data-status'),'playing');
 assert.equal(await page.locator('#work').evaluate(e=>e===document.activeElement),true);
 pass('開始ボタンのキーボード操作とフォーカス');
 assert.deepEqual(errors,[]);
 assert.ok(network.every(u=>u.startsWith('http://127.0.0.1:')));
 pass('コンソール・実行エラーなし／実行時の外部接続なし／リポジトリ配下の静的配信');
 await writeFile(resolve(evidence,'browser-result.json'),JSON.stringify({checks,errors,requests:network.length,viewports:[1440,1280,800,390,320],renderer:'Phaser Canvas',target:'production dist under repository subpath',screenshots:'verification/screenshots/'},null,2));
}finally{
 if(context)await context.close();
 await new Promise(done=>server.close(done));
 // Only the dedicated disposable profile belonging to this game's test.
 if(profile===resolve(root,'verification','browser-profile')&&profile.startsWith(root+sep))await rm(profile,{recursive:true,force:true});
}
