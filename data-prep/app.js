(()=>{'use strict';
const root=document;
const KEY='naga-data-lab-progress-v1';
const TASK_KEY='data-preparation-module5-checklist-v1';
const VALID_MODULES=[1,2,3,4,5,6,7,8,9,11];
const status=root.getElementById('storage-status');
// Move the existing controls so listeners, IDs, and live status stay shared.
const progressControls=root.querySelector('.sidebar-bottom');
const desktopProgress=root.querySelector('.sidebar');
const mobileProgress=root.getElementById('mobile-progress');
const mobileLayout=window.matchMedia('(max-width: 790px)');
function placeProgressControls(){
 (mobileLayout.matches?mobileProgress:desktopProgress).appendChild(progressControls);
}
placeProgressControls();
mobileLayout.addEventListener('change',placeProgressControls);

function saveImportedProgress(completion,checklist){
 const entries=[[KEY,JSON.stringify(completion)],[TASK_KEY,JSON.stringify(checklist)]];
 const previous=entries.map(([key])=>localStorage.getItem(key));
 let written=0;
 try{
  for(const [key,value] of entries){localStorage.setItem(key,value);written++;}
 }catch(error){
  try{
   for(let i=written-1;i>=0;i--){
    if(previous[i]===null)localStorage.removeItem(entries[i][0]);
    else localStorage.setItem(entries[i][0],previous[i]);
   }
  }catch(rollbackError){
   throw Error('Storage failed and earlier saved values could not be restored. Export your current progress before reloading.');
  }
  throw Error('Browser storage is unavailable. Your saved progress was not changed.');
 }
}

function notify(msg,isError=false){if(status){status.textContent=msg;status.classList.toggle('storage-error',isError)}}
function readObject(key){try{const data=JSON.parse(localStorage.getItem(key)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{}}catch(e){notify('Saved progress could not be read. Export a backup if possible before changing anything.',true);return {}}}
function saveObject(key,obj){try{localStorage.setItem(key,JSON.stringify(obj));return true}catch(e){notify('Progress could not be saved in this browser. Please check browser storage settings.',true);return false}}
let completed=readObject(KEY),taskState=readObject(TASK_KEY);
const navs=[...root.querySelectorAll('[data-nav]')],panels=[...root.querySelectorAll('.module-panel')],drawer=root.getElementById('mobile-drawer'),menu=root.getElementById('mobile-menu');
function progress(){const core=[1,2,3,4,5,6].filter(n=>completed[n]).length,optional=[7,8,9,10].filter(n=>completed[n]).length,pct=Math.round(core/6*100);
 root.querySelectorAll('.done-checkbox').forEach(el=>el.checked=!!completed[el.dataset.done]);
 root.querySelectorAll('.nav-item[data-nav]').forEach(el=>el.classList.toggle('completed',VALID_MODULES.includes(Number(el.dataset.nav))&&!!completed[Number(el.dataset.nav)===11?10:el.dataset.nav]));
 root.getElementById('progress-label').textContent=core+' of 6 modules complete';root.getElementById('progress-fill').style.width=pct+'%';root.getElementById('rail-progress').textContent=pct+'%';root.getElementById('rail-progress-fill').style.width=pct+'%';
 root.getElementById('optional-progress-label').textContent=optional+' of 4 additional modules complete';root.getElementById('optional-progress-fill').style.width=(optional/4*100)+'%';}
// Count in-site module navigation as anonymous page views. The GoatCounter script
// handles the initial page load; this function handles subsequent SPA navigation.
function trackModuleView(n){
 const gc=window.goatcounter;
 if(!gc||typeof gc.count!=='function')return;
 const heading=root.querySelector('#module-'+n+' h1');
 gc.count({path:location.pathname+'#module-'+n,title:heading?heading.textContent.trim():'Module '+n,event:true});
}
function show(n,scroll=true){n=Number(n);if(!root.getElementById('module-'+n))n=1;panels.forEach(el=>el.hidden=Number(el.dataset.module)!==n);navs.forEach(el=>{const active=Number(el.dataset.nav)===n;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});drawer.hidden=true;menu.setAttribute('aria-expanded','false');if(scroll)window.scrollTo({top:0,behavior:'instant'});history.replaceState(null,'','#module-'+n);if(scroll)trackModuleView(n)}
navs.forEach(el=>el.addEventListener('click',()=>show(el.dataset.nav)));
root.querySelectorAll('[data-next]').forEach(el=>el.addEventListener('click',()=>show(el.dataset.next)));
root.querySelectorAll('.done-checkbox').forEach(el=>el.addEventListener('change',()=>{completed[el.dataset.done]=el.checked;saveObject(KEY,completed);progress()}));
root.getElementById('reset-progress').addEventListener('click',()=>{if(!confirm('Clear only module completion checkmarks? Your Module 5 checklist will remain saved. Consider exporting a backup first.'))return;completed={};try{localStorage.removeItem(KEY);notify('Module completion checkmarks cleared. Module 5 checklist was preserved.')}catch(e){notify('Could not clear saved checkmarks.',true)}progress()});
menu.addEventListener('click',()=>{drawer.hidden=!drawer.hidden;menu.setAttribute('aria-expanded',String(!drawer.hidden))});
root.querySelectorAll('.quiz-submit').forEach(btn=>btn.addEventListener('click',()=>{const card=btn.closest('.quiz-card'),choice=card.querySelector('input:checked'),feedback=card.querySelector('.quiz-feedback');if(!choice){feedback.className='quiz-feedback incorrect';feedback.textContent='Choose an answer first.';return}const correct=Number(choice.value)===Number(card.dataset.correct);feedback.className='quiz-feedback '+(correct?'correct':'incorrect');feedback.textContent=(correct?'Correct. ':'Not quite. ')+card.querySelector('template').content.textContent}));
root.querySelectorAll('.copy-btn').forEach(btn=>btn.addEventListener('click',async()=>{const code=btn.parentElement.querySelector('code');if(!code)return;try{await navigator.clipboard.writeText(code.textContent);btn.textContent='Copied ✓'}catch(e){const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(code);selection.removeAllRanges();selection.addRange(range);btn.textContent='Select & copy'}setTimeout(()=>btn.textContent='Copy formula',2200)}));
const tasks=[...root.querySelectorAll('[data-task]')];
function updateTasks(){tasks.forEach(el=>el.checked=!!taskState[el.dataset.task]);const el=root.querySelector('.checklist-status');if(el)el.textContent=tasks.filter(t=>t.checked).length+' of '+tasks.length+' steps checked'}
tasks.forEach(el=>el.addEventListener('change',()=>{taskState[el.dataset.task]=el.checked;saveObject(TASK_KEY,taskState);updateTasks()}));
// Backups are local-only. Preserve unknown completion keys for future compatibility.
root.getElementById('export-progress').addEventListener('click',()=>{const backup={format:'naga-data-lab-progress',version:1,exportedAt:new Date().toISOString(),completion:completed,module5Checklist:taskState};const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='naga-training-progress-backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Progress backup downloaded. Keep it somewhere safe.');});
const fileInput=root.getElementById('import-progress-file');root.getElementById('import-progress').addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',async()=>{const file=fileInput.files&&fileInput.files[0];if(!file)return;try{if(file.size>100000)throw Error('Backup is unexpectedly large.');const data=JSON.parse(await file.text());if(!data||data.format!=='naga-data-lab-progress'||data.version!==1||!data.completion||typeof data.completion!=='object'||Array.isArray(data.completion)||!data.module5Checklist||typeof data.module5Checklist!=='object'||Array.isArray(data.module5Checklist))throw Error('This is not a supported progress backup.');for(const [k,v] of Object.entries(data.completion)){if(!/^\d{1,3}$/.test(k)||typeof v!=='boolean')throw Error('Invalid module completion data.')}for(const [k,v] of Object.entries(data.module5Checklist)){if(!/^m5-[a-zA-Z0-9_-]+$/.test(k)||typeof v!=='boolean')throw Error('Invalid checklist data.')}if(!confirm('Import progress from this file? Existing completion and checklist entries will be combined; imported values take precedence for matching entries.'))return;const mergedCompletion={...completed,...data.completion},mergedTasks={...taskState,...data.module5Checklist};saveImportedProgress(mergedCompletion,mergedTasks);completed=mergedCompletion;taskState=mergedTasks;progress();updateTasks();notify('Progress imported successfully.');}catch(e){notify('Import failed: '+e.message,true)}finally{fileInput.value=''}});
updateTasks();progress();const initial=(location.hash.match(/^#module-(\d+)$/)||[])[1];show(initial||1,false);window.addEventListener('hashchange',()=>{const m=location.hash.match(/^#module-(\d+)$/);if(m)show(m[1],false)});
})();