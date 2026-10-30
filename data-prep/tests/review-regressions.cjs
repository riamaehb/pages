const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const KEY = 'naga-data-lab-progress-v1';
const TASK = 'data-preparation-module5-checklist-v1';
(async () => {
 const browser = await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || undefined});
 try {
  const page = await browser.newPage();
  await page.route('**/*', route => {
   const url = new URL(route.request().url());
   if (url.hostname !== 'training.test') return route.abort();
   const file = path.join(base, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
   return fs.existsSync(file) ? route.fulfill({path:file}) : route.fulfill({status:404,body:'Missing'});
  });
  page.on('dialog', d => d.accept());
  await page.goto('http://training.test/');
  for(const n of [1,2,3,4,5,6,7,8,9,11]) {
   await page.locator(`.sidebar [data-nav="${n}"]`).click();
   const card=page.locator(`#module-${n} .quiz-card`);
   const correct=await card.getAttribute('data-correct');
   for (const value of [correct,String((Number(correct)+1)%3)]) {
    await card.locator(`input[value="${value}"]`).check();
    await card.locator('.quiz-submit').click();
    const explanation=await card.locator('template').evaluate(t=>t.content.textContent);
    assert.equal(await card.locator('.quiz-feedback').textContent(),(value===correct?'Correct. ':'Not quite. ')+explanation);
   }
  }
  const links=await page.locator('a[download]').evaluateAll(a=>a.map(el=>el.getAttribute('href')));
  for(const link of links) assert.ok(fs.existsSync(path.join(base,link)),link);
  await page.setViewportSize({width:390,height:844});
  await page.locator('#mobile-progress #export-progress').waitFor({state:'visible'});
  for(const id of ['export-progress','import-progress','reset-progress']) assert.ok(await page.locator('#'+id).isVisible());
  await page.locator('#mobile-menu').click();
  await page.locator('.mobile-nav [data-nav="7"]').click();
  assert.ok(await page.locator('#module-7').isVisible());
  assert.ok(await page.locator('#export-progress').isVisible());
  for(const width of [320,390,650]) {
   await page.setViewportSize({width,height:844});
   for(const n of [7,9]) {
    await page.evaluate(n=>location.hash='module-'+n,n);
    await page.locator('#module-'+n).waitFor({state:'visible'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Module ${n} overflows at ${width}px`);
    const wrapper=page.locator(`#module-${n} div.responsive-table`);
    assert.equal(await wrapper.evaluate(el=>getComputedStyle(el).overflowX),'auto');
   }
  }
  const backup={format:'naga-data-lab-progress',version:1,completion:{1:true,2:true},module5Checklist:{'m5-test':true}};
  async function importBackup(){await page.locator('#import-progress-file').setInputFiles({name:'progress.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForFunction(()=>document.querySelector('#storage-status').textContent.match(/^(Import failed:|Progress imported successfully\.)/));}
  for(const failAt of [1,2]) {
   for(const existing of [false,true]) {
    await page.evaluate(({KEY,TASK,existing,failAt})=>{
     localStorage.clear();
     if(existing){localStorage.setItem(KEY,'{"3":true}');localStorage.setItem(TASK,'{"m5-old":true}');}
    },{KEY,TASK,existing,failAt});
    await page.reload();
    await page.evaluate(failAt=>{const original=Storage.prototype.setItem;let calls=0;Storage.prototype.setItem=function(...args){if(++calls===failAt)throw new DOMException('Full','QuotaExceededError');return original.apply(this,args)}},failAt);
    await importBackup();
    assert.match(await page.locator('#storage-status').textContent(),/saved progress was not changed/);
    assert.ok(await page.locator('#storage-status').isVisible());
    assert.deepEqual(await page.evaluate(({KEY,TASK})=>[localStorage.getItem(KEY),localStorage.getItem(TASK)],{KEY,TASK}),existing?['{"3":true}','{"m5-old":true}']:[null,null]);
    await page.reload();
   }
  }
  await importBackup();
  assert.equal(await page.locator('#storage-status').textContent(),'Progress imported successfully.');
  await page.reload();
  assert.equal(await page.locator('#progress-label').textContent(),'3 of 6 modules complete');
  await page.setViewportSize({width:1280,height:900});
  await page.locator('.sidebar #export-progress').waitFor({state:'visible'});
  assert.equal(await page.locator('#export-progress').count(),1);
  console.log('PASS: ten quizzes and mobile table widths, downloads, mobile navigation/controls, breakpoint relocation, import success and failure rollback with existing/absent keys.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
