import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,writeFile,rm,readFile } from 'node:fs/promises';
import { resolve,sep } from 'node:path';
const root=resolve('.');
const profile=resolve(root,'verification','published-profile');
const output=resolve(root,'verification','screenshots');
const url='https://maya1377.github.io/oshigoto-mochikun/';
const errors=[],requests=[];let context;
await mkdir(output,{recursive:true});
try {
 context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1440,height:1100},reducedMotion:'reduce',locale:'ja-JP'});
 const page=context.pages()[0];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
 const response=await page.goto(url);
 assert.equal(response.status(),200);await page.waitForSelector('canvas[data-ready="true"]');await page.waitForSelector('#intro[open]');
 const html=await readFile(resolve(root,'dist/index.html'),'utf8');
 const localAssets=[...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map(m=>new URL(m[1],url).href);
 const loaded=await page.locator('script[src],link[rel="stylesheet"]').evaluateAll(es=>es.map(e=>e.src||e.href));
 assert.ok(localAssets.length>=2);assert.ok(localAssets.every(a=>loaded.includes(a)));
 await page.locator('#start').click();
 await page.waitForFunction(()=>document.body.dataset.status==='playing');
 async function action(id){await page.locator('#'+id).click();await page.waitForFunction(()=>document.body.dataset.status!=='playing'||!document.querySelector('#rest').disabled);}
 await action('work');assert.equal(await page.locator('#fatigue').textContent(),'18');assert.equal(await page.locator('.cost-fragment').count(),3);
 await action('defer');assert.equal(await page.locator('#time').textContent(),'09:45');assert.equal(await page.locator('#fatigue').textContent(),'10');
 await action('rest');assert.equal(await page.locator('#fatigue').textContent(),'0');
 await page.screenshot({path:resolve(output,'10-published-playing.png'),fullPage:true});
 let count=0;
 while(await page.locator('body').getAttribute('data-status')==='playing'&&count++<40){
  if(await page.locator('#leave').isVisible())await action('leave');
  else if(await page.locator('#work').isEnabled()&&Number(await page.locator('#fatigue').textContent())<54)await action('work');
  else await action('rest');
 }
 assert.equal(await page.locator('body').getAttribute('data-status'),'won');assert.equal(await page.locator('#done').textContent(),'6');
 await page.screenshot({path:resolve(output,'11-published-victory.png'),fullPage:true});
 await page.locator('#replay').click();assert.equal(await page.locator('#time').textContent(),'09:00');assert.equal(await page.locator('#fatigue').textContent(),'0');
 const licenses=await context.request.get(new URL('THIRD_PARTY_NOTICES.txt',url).href);assert.equal(licenses.status(),200);assert.match(await licenses.text(),/Richard Davey/);
 assert.deepEqual(errors,[]);assert.ok(requests.every(u=>u.startsWith('https://maya1377.github.io/oshigoto-mochikun/')));
 await writeFile(resolve(root,'verification','published-result.json'),JSON.stringify({url,status:response.status(),matchedBuildAssets:localAssets,checks:['開始とCanvas描画','最終版アセットとローカルビルドの一致','仕事・先送り・休憩','通常操作で勝利','再プレイ','ライセンス配信','エラー・外部API接続なし'],errors,requests:requests.length},null,2));
 console.log('PASS Published game: exact build, actions, victory, replay, license, no errors');
} finally {
 if(context)await context.close();
 if(profile===resolve(root,'verification','published-profile')&&profile.startsWith(root+sep))await rm(profile,{recursive:true,force:true});
}
