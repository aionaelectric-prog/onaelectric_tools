/* Ona Electric — Tools Manager */
const LS = {get(k){try{return localStorage.getItem(k)}catch(e){return null}}, set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const TABLES = ['tools','people','projects','moves','cons','consLog'];
const STATUS = ['متاحة','مع موظف','تحتاج صيانة','عطل','مفقودة','مستبعدة'];
const COND = [['سليمة','متاحة'],['بها عيب بسيط','متاحة'],['تحتاج صيانة','تحتاج صيانة'],['عطل','عطل'],['مفقودة','مفقودة']];
const DEFAULT_CATS = ['عدة كهربائية','عدة يدوية','جهاز قياس','معدات سلامة','معدات ميكانيكية','مفكات','مفاتيح','ماكينات','بكر كابلات','أخرى'];
const tagClass = s => ({'متاحة':'t-ok','سليمة':'t-ok','مع موظف':'t-out','تحتاج صيانة':'t-warn','بها عيب بسيط':'t-warn'})[s] || 't-bad';

let lang = LS.get('tm_lang') === 'en' ? 'en' : 'ar';
let S, remote = null;               // remote = {url,key} when connected
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const t = k => I18N[lang][k] ?? I18N.ar[k] ?? k;
const v = s => lang === 'en' ? (VAL_EN[s] || s) : s;     // translate a stored value
const today = () => new Date().toISOString().slice(0,10);
const uid = p => p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
const byId = (arr,id) => arr.find(x => x.id === id);
const pName = id => byId(S.people,id)?.name || '—';
const prName = id => byId(S.projects,id)?.name || '—';
const num = x => parseFloat(x) || 0;

function toast(m){const e=$('toast');e.textContent=m;e.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove('on'),2600);}
function setSync(state){const e=$('sync');e.className='sync'+(state==='ok'?' ok':state==='err'?' err':'');e.textContent=t('sync.'+state);e.dataset.s=state;}

/* ---------- data layer ---------- */
function fresh(){return{settings:{company:'ONA Electric Industries',formNo:0,categories:DEFAULT_CATS.slice()},tools:[],people:[],projects:[],moves:[],cons:[],consLog:[]};}
function cacheKey(){return remote?'tm_cache_remote':'tm_data_local';}
function saveCache(){LS.set(cacheKey(),JSON.stringify(S));}
function loadCache(){try{return JSON.parse(LS.get(cacheKey()))}catch(e){return null}}

function fromSheet(d){
  const o=fresh(); TABLES.forEach(k=>o[k]=d[k]||[]);
  (d.settings||[]).forEach(r=>{ if(r.key==='categories') o.settings.categories=r.value.split(',').map(s=>s.trim()).filter(Boolean); else if(r.key==='formNo') o.settings.formNo=parseInt(r.value)||0; else o.settings[r.key]=r.value; });
  return o;
}
async function apiGet(){
  const r = await fetch(remote.url+'?key='+encodeURIComponent(remote.key),{redirect:'follow'});
  const j = await r.json(); if(!j.ok) throw new Error(j.error==='bad_key'?t('msg.badKey'):j.error); return j.data;
}
async function apiPost(body){
  const r = await fetch(remote.url,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({key:remote.key},body))});
  const j = await r.json(); if(!j.ok) throw new Error(j.error==='bad_key'?t('msg.badKey'):j.error); return j;
}
async function boot(){
  const url = LS.get('tm_url') || (window.APP_CONFIG && APP_CONFIG.API_URL) || '';
  const key = LS.get('tm_key') || '';
  remote = url && key ? {url,key} : null;
  if(!remote){ S = loadCache() || fresh(); setSync('local'); banner(t('msg.localMode')); render(); return; }
  S = loadCache() || fresh(); render(); setSync('loading');
  try{ S = fromSheet(await apiGet()); saveCache(); setSync('ok'); banner(''); }
  catch(e){ setSync('err'); banner(t('msg.loadFail')+' ('+e.message+')'); }
  render();
}
function banner(m){const b=$('banner');b.textContent=m;b.classList.toggle('hide',!m);}

/* apply ops locally, then push to sheet. ops: {op:'upsert'|'delete', table, row|id} */
function applyLocal(ops){
  ops.forEach(o=>{
    if(o.table==='settings'){ if(o.row.key==='categories') S.settings.categories=o.row.value.split(','); else S.settings[o.row.key]=o.row.value; return; }
    const arr=S[o.table], id=o.op==='delete'?o.id:o.row.id, i=arr.findIndex(x=>x.id===id);
    if(o.op==='delete'){ if(i>=0) arr.splice(i,1); } else { if(i>=0) arr[i]=o.row; else arr.push(o.row); }
  });
}
async function commit(ops, extra){
  if(!remote){
    if(extra && extra.action==='nextFormNo'){ S.settings.formNo=(S.settings.formNo||0)+1; ops.forEach(o=>{if(o.row&&o.row.formNo==='__NEW__')o.row.formNo=String(S.settings.formNo)}); }
    applyLocal(ops); saveCache(); return {formNo:S.settings.formNo};
  }
  setSync('saving'); document.body.style.cursor='progress';
  try{
    const res = await apiPost(Object.assign({ops},extra||{}));
    if(res.formNo){ S.settings.formNo=res.formNo; ops.forEach(o=>{if(o.row&&o.row.formNo==='__NEW__')o.row.formNo=String(res.formNo)}); }
    applyLocal(ops); saveCache(); setSync('ok'); return res;
  }catch(e){ setSync('err'); toast(t('msg.saveFail')+e.message); throw e; }
  finally{ document.body.style.cursor=''; }
}
const up = (table,row)=>({op:'upsert',table,row});
const del = (table,id)=>({op:'delete',table,id});

/* ---------- helpers ---------- */
function lastOut(toolId){for(let i=S.moves.length-1;i>=0;i--){const m=S.moves[i];if(m.toolId===toolId)return m.type==='صرف'?m:null;}return null;}
function nextCode(prefix,list,pad){const n=list.map(x=>parseInt(String(x.code||'').split('-').pop())||0);return prefix+'-'+String((n.length?Math.max(...n):0)+1).padStart(pad,'0');}
function opts(id,arr,first){const el=$(id),cur=el.value;el.innerHTML=(first!==undefined?`<option value="">${esc(first)}</option>`:'')+arr.map(([k,n])=>`<option value="${esc(k)}">${esc(n)}</option>`).join('');if([...el.options].some(o=>o.value===cur))el.value=cur;}
function consStats(c){let inQ=0,outQ=0;S.consLog.forEach(l=>{if(l.consId!==c.id)return;if(l.type==='صرف')outQ+=num(l.qty);else inQ+=num(l.qty);});const rem=inQ-outQ;return{inQ,outQ,rem,pct:inQ>0?Math.round(rem/inQ*100):0};}
function bar(p,min){min=num(min)||20;const col=p<=min?'var(--bad)':p<=min*2?'var(--warn)':'var(--ok)';return `<div style="display:flex;gap:8px;align-items:center"><div class="bar"><i style="width:${Math.max(0,p)}%;background:${col}"></i></div><b class="num">${p}%</b></div>`;}
const tag = s => `<span class="tag ${tagClass(s)}">${esc(v(s))}</span>`;
function busy(btn,fn){return async()=>{btn.disabled=true;try{await fn()}catch(e){}finally{btn.disabled=false}}}

/* ---------- i18n / theme ---------- */
function applyLang(){
  document.documentElement.lang=lang; document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  document.querySelectorAll('[data-i18n]').forEach(e=>e.textContent=t(e.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach(e=>e.placeholder=t(e.dataset.i18nPh));
  $('btnLang').textContent=t('langBtn'); document.title=lang==='ar'?'برنامج العِدَد — Ona Electric':'Ona Electric Tools';
  updThemeBtn(); if($('sync').dataset.s) setSync($('sync').dataset.s);
}
function curTheme(){const a=document.documentElement.dataset.theme;return a||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}
function updThemeBtn(){$('btnTheme').textContent=t('theme')[curTheme()==='dark'?'light':'dark'];}
$('btnTheme').onclick=()=>{const n=curTheme()==='dark'?'light':'dark';document.documentElement.dataset.theme=n;LS.set('tm_theme',n);updThemeBtn();};
$('btnLang').onclick=()=>{lang=lang==='ar'?'en':'ar';LS.set('tm_lang',lang);applyLang();render();};

/* ---------- navigation ---------- */
$('nav').onclick=e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('main>section').forEach(s=>s.classList.toggle('hide',s.id!=='p-'+b.dataset.p));render();};

function render(){
  if(!S) return;
  $('coName').textContent=S.settings.company||'';
  const cats=S.settings.categories.map(c=>[c,v(c)]), people=S.people.map(p=>[p.id,p.name]), projs=S.projects.map(p=>[p.id,p.name]);
  opts('tCat',cats);opts('outCat',cats,t('all'));opts('tFilterCat',cats,t('all'));opts('rCat',cats,t('all'));
  opts('tFilterSt',STATUS.map(s=>[s,v(s)]),t('all'));
  opts('outPerson',people,t('choose'));opts('retPerson',people,t('all'));opts('rPerson',people,t('all'));opts('mvPerson',people,'—');
  opts('outProject',projs,t('choose'));opts('rProject',projs,t('all'));opts('mvProject',projs,'—');
  opts('mvItem',S.cons.map(c=>[c.id,c.name]));
  opts('mvType',[['صرف',lang==='ar'?'صرف لمشروع':'Issue to project'],['توريد',v('توريد')]]);
  opts('rType',[['صرف',v('صرف')],['إرجاع',v('إرجاع')]],t('all'));
  renderDash();renderPool();renderRet();renderTools();renderCons();renderPeople();renderProjects();renderReport();renderSettings();
}

/* ---------- dashboard ---------- */
function renderDash(){
  const c=k=>S.tools.filter(x=>x.status===k).length;
  const low=S.cons.filter(x=>consStats(x).pct<=num(x.min||20)).length;
  $('stats').innerHTML=[[S.tools.length,'st.total'],[c('متاحة'),'st.avail'],[c('مع موظف'),'st.out'],[c('تحتاج صيانة')+c('عطل'),'st.maint'],[c('مفقودة'),'st.lost'],[low,'st.low']].map(([n,l])=>`<div class="stat"><b>${n}</b><span>${t(l)}</span></div>`).join('');
  const outs=S.tools.filter(x=>x.status==='مع موظف').map(x=>({x,m:lastOut(x.id)}));
  $('dashOut').innerHTML=outs.length?outs.map(({x,m})=>`<tr><td>${esc(x.code)} — ${esc(x.name)}</td><td>${esc(pName(m?.personId))}</td><td>${esc(prName(m?.projectId))}</td><td class="num">${esc(m?.date||'')}</td></tr>`).join(''):`<tr><td colspan="4" class="muted">${t('ret.none')}</td></tr>`;
  $('dashCons').innerHTML=S.cons.length?S.cons.map(x=>{const s=consStats(x);return `<tr><td>${esc(x.name)}</td><td class="num">${s.rem} ${esc(x.unit)}</td><td>${bar(s.pct,x.min)}</td></tr>`}).join(''):`<tr><td colspan="3" class="muted">${t('none')}</td></tr>`;
}

/* ---------- check out (drag & drop) ---------- */
let cart=[], selected=new Set();
function renderPool(){
  const q=$('outSearch').value.trim().toLowerCase(),cat=$('outCat').value;
  const list=S.tools.filter(x=>x.status==='متاحة'&&!cart.includes(x.id)&&(!cat||x.category===cat)&&(!q||(x.name+x.code).toLowerCase().includes(q)));
  $('pool').innerHTML=list.length?list.map(x=>`<div class="chip${selected.has(x.id)?' sel':''}" draggable="true" data-id="${x.id}">${esc(x.name)}<small>${esc(x.code)} · ${esc(v(x.category))}</small></div>`).join(''):`<div class="muted">${t('out.none')}</div>`;
  $('cart').innerHTML=cart.length?`<div class="pool" style="min-height:0">${cart.map(id=>{const x=byId(S.tools,id);return x?`<div class="chip" data-id="${id}">${esc(x.name)}<small>${esc(x.code)} · ${t('out.remove')}</small></div>`:''}).join('')}</div>`:`<div class="ph">${t('out.drop')} ⬇<br><small>${t('out.dropHint')}</small></div>`;
  $('cartCount').textContent=cart.length?`(${cart.length} ${t('out.pieces')})`:'';
}
$('pool').addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c)return;const id=c.dataset.id;if(e.ctrlKey||e.metaKey||e.shiftKey){selected.has(id)?selected.delete(id):selected.add(id);c.classList.toggle('sel');}else{cart.push(id);selected.delete(id);renderPool();}});
$('pool').addEventListener('dragstart',e=>{const c=e.target.closest('.chip');if(!c)return;const ids=selected.has(c.dataset.id)?[...selected]:[c.dataset.id];e.dataTransfer.setData('text/plain',JSON.stringify(ids));});
const cartEl=$('cart');
cartEl.addEventListener('dragover',e=>{e.preventDefault();cartEl.classList.add('over');});
cartEl.addEventListener('dragleave',()=>cartEl.classList.remove('over'));
cartEl.addEventListener('drop',e=>{e.preventDefault();cartEl.classList.remove('over');try{JSON.parse(e.dataTransfer.getData('text/plain')).forEach(id=>{if(!cart.includes(id))cart.push(id);});}catch(_){}selected.clear();renderPool();});
cartEl.addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c)return;cart=cart.filter(x=>x!==c.dataset.id);renderPool();});
$('outSearch').oninput=renderPool;$('outCat').onchange=renderPool;
$('clearCart').onclick=()=>{cart=[];selected.clear();renderPool();};
$('doOut').onclick=busy($('doOut'),async()=>{
  const personId=$('outPerson').value,projectId=$('outProject').value,date=$('outDate').value||today(),notes=$('outNotes').value.trim();
  if(!personId)return toast(t('msg.pickPerson'));
  if(!cart.length)return toast(t('msg.emptyCart'));
  const ops=[];
  cart.forEach(id=>{const x=byId(S.tools,id);
    ops.push(up('moves',{id:uid('M'),formNo:'__NEW__',type:'صرف',toolId:id,toolCode:x.code,toolName:x.name,personId,personName:pName(personId),projectId,projectName:projectId?prName(projectId):'',date,cond:'',notes}));
    ops.push(up('tools',Object.assign({},x,{status:'مع موظف'})));});
  const res=await commit(ops,{action:'nextFormNo'});
  printForm(+res.formNo);cart=[];$('outNotes').value='';render();toast(t('msg.outDone')+res.formNo);
});

/* ---------- return ---------- */
function renderRet(){
  const pf=$('retPerson').value;
  const rows=S.tools.filter(x=>x.status==='مع موظف').map(x=>({x,m:lastOut(x.id)})).filter(r=>!pf||r.m?.personId===pf);
  $('retBody').innerHTML=rows.length?rows.map(({x,m})=>`<tr><td><input type="checkbox" class="rck" data-id="${x.id}" style="min-width:0" aria-label="${esc(x.code)}"></td><td>${esc(x.code)}</td><td>${esc(x.name)}</td><td>${esc(v(x.category))}</td><td>${esc(pName(m?.personId))}</td><td>${esc(prName(m?.projectId))}</td><td class="num">${esc(m?.date||'')}</td><td><select class="rcond" data-id="${x.id}" style="min-width:120px">${COND.map(c=>`<option value="${c[0]}">${esc(v(c[0]))}</option>`).join('')}</select></td><td><input class="rnote" data-id="${x.id}" style="min-width:120px"></td></tr>`).join(''):`<tr><td colspan="9" class="muted">${t('ret.none')}</td></tr>`;
  $('retAll').checked=false;
}
$('retPerson').onchange=renderRet;
$('retAll').onchange=e=>document.querySelectorAll('.rck').forEach(c=>c.checked=e.target.checked);
$('doRet').onclick=busy($('doRet'),async()=>{
  const ids=[...document.querySelectorAll('.rck:checked')].map(c=>c.dataset.id);
  if(!ids.length)return toast(t('msg.pickRet'));
  const date=$('retDate').value||today(), groups={};
  ids.forEach(id=>{const m=lastOut(id);const k=m?.personId||'';(groups[k]=groups[k]||[]).push([id,m]);});
  const forms=[];
  for(const list of Object.values(groups)){
    const ops=[];
    list.forEach(([id,m])=>{const cond=document.querySelector(`.rcond[data-id="${id}"]`).value,note=document.querySelector(`.rnote[data-id="${id}"]`).value.trim(),x=byId(S.tools,id);
      ops.push(up('moves',{id:uid('M'),formNo:'__NEW__',type:'إرجاع',toolId:id,toolCode:x.code,toolName:x.name,personId:m?.personId||'',personName:pName(m?.personId),projectId:m?.projectId||'',projectName:m?.projectId?prName(m.projectId):'',date,cond,notes:note}));
      ops.push(up('tools',Object.assign({},x,{status:COND.find(c=>c[0]===cond)[1]})));});
    const res=await commit(ops,{action:'nextFormNo'}); forms.push(+res.formNo);
  }
  printForm(...forms);render();toast(t('msg.retDone'));
});

/* ---------- tools ---------- */
$('addTool').onclick=busy($('addTool'),async()=>{
  const name=$('tName').value.trim();if(!name)return toast(t('msg.needName'));
  const qty=Math.max(1,parseInt($('tQty').value)||1),ops=[],tmp=S.tools.slice();
  for(let i=0;i<qty;i++){const row={id:uid('T'),code:nextCode('EQ',tmp,4),name,brand:$('tBrand').value.trim(),category:$('tCat').value,status:'متاحة',serial:'',purchaseDate:today(),location:$('tLoc').value.trim(),notes:$('tNotes').value.trim()};tmp.push(row);ops.push(up('tools',row));}
  await commit(ops);['tName','tBrand','tNotes'].forEach(i=>$(i).value='');$('tQty').value=1;render();toast(t('msg.added')+' ('+qty+')');
});
function renderTools(){
  const q=$('tSearch').value.trim().toLowerCase(),cat=$('tFilterCat').value,st=$('tFilterSt').value;
  const list=S.tools.filter(x=>(!cat||x.category===cat)&&(!st||x.status===st)&&(!q||(x.name+x.code+x.brand).toLowerCase().includes(q)));
  $('toolsBody').innerHTML=list.length?list.map(x=>{const m=x.status==='مع موظف'?lastOut(x.id):null;return `<tr><td>${esc(x.code)}</td><td>${esc(x.name)}</td><td>${esc(x.brand)}</td><td>${esc(v(x.category))}</td><td>${tag(x.status)}</td><td>${m?esc(pName(m.personId)):''}</td><td>${esc(x.location)}</td><td style="white-space:nowrap">
  ${x.status!=='مع موظف'&&x.status!=='متاحة'?`<button class="b s sm" data-fix="${x.id}">${t('tools.fix')}</button>`:''}
  ${x.status!=='مع موظف'?`<button class="b d sm" data-del="${x.id}">${t('btn.delete')}</button>`:''}</td></tr>`}).join(''):`<tr><td colspan="8" class="muted">${t('none')}</td></tr>`;
}
$('toolsBody').onclick=async e=>{const f=e.target.dataset.fix,d=e.target.dataset.del;
  try{ if(f){await commit([up('tools',Object.assign({},byId(S.tools,f),{status:'متاحة'}))]);render();}
  if(d&&confirm(t('msg.confirmDel'))){await commit([del('tools',d)]);render();} }catch(_){}};
['tSearch','tFilterCat','tFilterSt'].forEach(i=>$(i).oninput=renderTools);

/* ---------- consumables ---------- */
$('addCons').onclick=busy($('addCons'),async()=>{const name=$('cName').value.trim();if(!name)return toast(t('msg.needName'));
  const c={id:uid('C'),name,unit:$('cUnit').value.trim(),brand:'',min:String(num($('cMin').value)||20),location:''},ops=[up('cons',c)];
  const q=num($('cQty').value);if(q>0)ops.push(up('consLog',{id:uid('L'),consId:c.id,consName:name,type:'توريد',qty:String(q),projectId:'',projectName:'',personId:'',personName:'',date:today()}));
  await commit(ops);$('cName').value='';$('cUnit').value='';$('cQty').value=0;render();toast(t('msg.added'));});
$('doMove').onclick=busy($('doMove'),async()=>{const consId=$('mvItem').value;if(!consId)return toast(t('msg.addCons'));
  const type=$('mvType').value,qty=num($('mvQty').value);if(qty<=0)return toast(t('msg.badQty'));
  const projectId=$('mvProject').value,personId=$('mvPerson').value;if(type==='صرف'&&!projectId)return toast(t('msg.pickProject'));
  const c=byId(S.cons,consId);if(type==='صرف'&&qty>consStats(c).rem)return toast(t('msg.tooMuch'));
  await commit([up('consLog',{id:uid('L'),consId,consName:c.name,type,qty:String(qty),projectId,projectName:projectId?prName(projectId):'',personId,personName:personId?pName(personId):'',date:$('mvDate').value||today()})]);render();toast(t('msg.saved'));});
function renderCons(){
  $('consBody').innerHTML=S.cons.length?S.cons.map(c=>{const s=consStats(c);return `<tr><td>${esc(c.name)}</td><td>${esc(c.unit)}</td><td class="num">${s.inQ}</td><td class="num">${s.outQ}</td><td class="num">${s.rem}</td><td>${bar(s.pct,c.min)}</td><td><button class="b d sm" data-dc="${c.id}">${t('btn.delete')}</button></td></tr>`}).join(''):`<tr><td colspan="7" class="muted">${t('none')}</td></tr>`;
  const rows=[];S.projects.forEach(p=>S.cons.forEach(c=>{const q=S.consLog.filter(l=>l.type==='صرف'&&l.consId===c.id&&l.projectId===p.id).reduce((a,l)=>a+num(l.qty),0);if(q){const tot=consStats(c).inQ;rows.push(`<tr><td>${esc(p.name)}</td><td>${esc(c.name)}</td><td class="num">${q} ${esc(c.unit)}</td><td class="num">${tot?Math.round(q/tot*100):0}%</td></tr>`);}}));
  $('consProj').innerHTML=rows.join('')||`<tr><td colspan="4" class="muted">${t('cons.noUse')}</td></tr>`;
}
$('consBody').onclick=async e=>{const d=e.target.dataset.dc;if(d&&confirm(t('msg.confirmDel'))){try{await commit([del('cons',d),...S.consLog.filter(l=>l.consId===d).map(l=>del('consLog',l.id))]);render();}catch(_){}}};

/* ---------- people & projects ---------- */
$('addPerson').onclick=busy($('addPerson'),async()=>{const n=$('pName').value.trim();if(!n)return toast(t('msg.needName'));
  await commit([up('people',{id:uid('P'),code:nextCode('EMP',S.people,4),name:n,role:$('pRole').value.trim(),dept:$('pDept').value.trim(),phone:$('pPhone').value.trim(),notes:''})]);
  ['pName','pRole','pDept','pPhone'].forEach(i=>$(i).value='');render();toast(t('msg.added'));});
const heldBy=(field,id)=>S.tools.filter(x=>x.status==='مع موظف'&&lastOut(x.id)?.[field]===id).length;
function renderPeople(){$('peopleBody').innerHTML=S.people.length?S.people.map(p=>{const n=heldBy('personId',p.id);return `<tr><td>${esc(p.code)}</td><td>${esc(p.name)}</td><td>${esc(p.role)}</td><td>${esc(p.dept)}</td><td dir="ltr">${esc(p.phone)}</td><td class="num">${n}</td><td>${n?'':`<button class="b d sm" data-dp="${p.id}">${t('btn.delete')}</button>`}</td></tr>`}).join(''):`<tr><td colspan="7" class="muted">${t('none')}</td></tr>`;}
$('peopleBody').onclick=async e=>{const d=e.target.dataset.dp;if(d&&confirm(t('msg.confirmDel'))){try{await commit([del('people',d)]);render();}catch(_){}}};
$('addProject').onclick=busy($('addProject'),async()=>{const n=$('prName').value.trim();if(!n)return toast(t('msg.needName'));
  await commit([up('projects',{id:uid('PR'),name:n,location:$('prLoc').value.trim(),notes:''})]);$('prName').value='';$('prLoc').value='';render();toast(t('msg.added'));});
function renderProjects(){$('projBody').innerHTML=S.projects.length?S.projects.map(p=>{const n=heldBy('projectId',p.id);return `<tr><td>${esc(p.name)}</td><td>${esc(p.location)}</td><td class="num">${n}</td><td>${n?'':`<button class="b d sm" data-dpr="${p.id}">${t('btn.delete')}</button>`}</td></tr>`}).join(''):`<tr><td colspan="4" class="muted">${t('none')}</td></tr>`;}
$('projBody').onclick=async e=>{const d=e.target.dataset.dpr;if(d&&confirm(t('msg.confirmDel'))){try{await commit([del('projects',d)]);render();}catch(_){}}};

/* ---------- reports ---------- */
const toolOf=m=>byId(S.tools,m.toolId)||{code:m.toolCode,name:m.toolName,category:''};
const mvPerson=m=>byId(S.people,m.personId)?.name||m.personName||'—';
const mvProj=m=>byId(S.projects,m.projectId)?.name||m.projectName||'—';
function filteredMoves(){const p=$('rPerson').value,c=$('rCat').value,pr=$('rProject').value,ty=$('rType').value,f=$('rFrom').value,to=$('rTo').value;
  return S.moves.filter(m=>(!p||m.personId===p)&&(!c||toolOf(m).category===c)&&(!pr||m.projectId===pr)&&(!ty||m.type===ty)&&(!f||m.date>=f)&&(!to||m.date<=to)).slice().reverse();}
function renderReport(){const list=filteredMoves();
  $('rBody').innerHTML=list.length?list.map(m=>{const x=toolOf(m);return `<tr><td class="num">${esc(m.formNo)}</td><td class="num">${esc(m.date)}</td><td><span class="tag ${m.type==='صرف'?'t-out':'t-ok'}">${esc(v(m.type))}</span></td><td>${esc(x.code)}</td><td>${esc(x.name)}</td><td>${esc(v(x.category))}</td><td>${esc(mvPerson(m))}</td><td>${esc(mvProj(m))}</td><td>${m.cond?tag(m.cond):''}</td><td>${esc(m.notes)}</td><td><button class="b s sm" data-pf="${esc(m.formNo)}">${t('rep.printForm')}</button></td></tr>`}).join(''):`<tr><td colspan="11" class="muted">${t('rep.none')}</td></tr>`;}
['rPerson','rCat','rProject','rType','rFrom','rTo'].forEach(i=>$(i).onchange=renderReport);
$('rBody').onclick=e=>{const f=e.target.dataset.pf;if(f)printForm(+f);};
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();}
$('rCsv').onclick=()=>{const rows=[[t('col.formNo'),t('f.date'),t('f.moveType'),t('col.code'),t('col.tool'),t('col.type'),t('f.person'),t('col.project'),t('col.cond'),t('col.note')]];
  filteredMoves().forEach(m=>{const x=toolOf(m);rows.push([m.formNo,m.date,v(m.type),x.code,x.name,v(x.category),mvPerson(m),mvProj(m),v(m.cond||''),m.notes]);});
  download('tools_report_'+today()+'.csv','﻿'+rows.map(r=>r.map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',')).join('\r\n'),'text/csv');};
$('rPrint').onclick=()=>{const list=filteredMoves();
  $('printArea').innerHTML=`<div class="form" dir="${document.documentElement.dir}">${formHead(t('rep.report'),'',today())}<table><thead><tr><th>${t('col.formNo')}</th><th>${t('f.date')}</th><th>${t('f.moveType')}</th><th>${t('col.code')}</th><th>${t('col.tool')}</th><th>${t('f.person')}</th><th>${t('col.project')}</th><th>${t('col.cond')}</th></tr></thead><tbody>${list.map(m=>{const x=toolOf(m);return `<tr><td>${esc(m.formNo)}</td><td>${esc(m.date)}</td><td>${esc(v(m.type))}</td><td>${esc(x.code)}</td><td>${esc(x.name)}</td><td>${esc(mvPerson(m))}</td><td>${esc(mvProj(m))}</td><td>${esc(v(m.cond||''))}</td></tr>`}).join('')}</tbody></table></div>`;window.print();};

/* ---------- fixed printable form ---------- */
function formHead(title,no,date){return `<div class="fh"><span class="lg"><img src="logo.jpeg" alt=""><b>${esc(S.settings.company)}</b></span><span>${no?t('form.no')+': '+no+' &nbsp; ':''}${t('f.date')}: ${esc(date)}</span></div><h3>${title}</h3>`;}
function printForm(...nos){
  $('printArea').innerHTML=nos.map(no=>{const ms=S.moves.filter(m=>+m.formNo===+no);if(!ms.length)return'';const m0=ms[0],isOut=m0.type==='صرف';
    return `<div class="form" dir="${document.documentElement.dir}">${formHead(t(isOut?'form.out':'form.in'),no,m0.date)}
    <div class="meta"><div><b>${t(isOut?'form.receiver':'form.returner')}:</b> ${esc(mvPerson(m0))}</div><div><b>${t('f.project')}:</b> ${esc(mvProj(m0))}</div><div><b>${t('form.count')}:</b> ${ms.length}</div><div><b>${t('f.notes')}:</b> ${esc(isOut?m0.notes:'')}</div></div>
    <table><thead><tr><th>${t('form.n')}</th><th>${t('col.code')}</th><th>${t('col.tool')}</th><th>${t('col.type')}</th>${isOut?'':`<th>${t('col.retCond')}</th><th>${t('col.note')}</th>`}</tr></thead><tbody>
    ${ms.map((m,i)=>{const x=toolOf(m);return `<tr><td>${i+1}</td><td>${esc(x.code)}</td><td>${esc(x.name)}</td><td>${esc(v(x.category))}</td>${isOut?'':`<td>${esc(v(m.cond))}</td><td>${esc(m.notes)}</td>`}</tr>`}).join('')}</tbody></table>
    <p style="margin-top:14px">${t(isOut?'form.outText':'form.inText')}</p>
    <div class="sig"><div>${t(isOut?'form.receiver':'form.returner')}</div><div>${t('form.keeper')}</div><div>${t('form.approve')}</div></div></div>`}).join('');
  setTimeout(()=>window.print(),150);
}

/* ---------- settings ---------- */
function renderSettings(){
  $('sUrl').value=LS.get('tm_url')||(window.APP_CONFIG&&APP_CONFIG.API_URL)||'';if(document.activeElement!==$('sKey'))$('sKey').value=LS.get('tm_key')||'';
  if(document.activeElement!==$('sCo'))$('sCo').value=S.settings.company||'';
  $('catList').innerHTML=S.settings.categories.map(c=>`<span class="chip" style="cursor:default;border-inline-start-width:1px">${esc(v(c))} <button class="b d sm" data-dcat="${esc(c)}" aria-label="delete">×</button></span>`).join('');
}
$('saveConn').onclick=()=>{LS.set('tm_url',$('sUrl').value.trim());LS.set('tm_key',$('sKey').value.trim());boot();};
$('reload').onclick=()=>boot();
const setOp=(key,value)=>up('settings',{key,value:String(value)});
$('saveCo').onclick=busy($('saveCo'),async()=>{await commit([setOp('company',$('sCo').value.trim())]);render();toast(t('msg.saved'));});
$('addCat').onclick=busy($('addCat'),async()=>{const c=$('sCat').value.trim();if(!c||S.settings.categories.includes(c))return;await commit([setOp('categories',[...S.settings.categories,c].join(','))]);$('sCat').value='';render();});
$('catList').onclick=async e=>{const c=e.target.dataset.dcat;if(!c)return;if(S.tools.some(x=>x.category===c))return toast(t('msg.catUsed'));try{await commit([setOp('categories',S.settings.categories.filter(x=>x!==c).join(','))]);render();}catch(_){}};
$('backup').onclick=()=>download('tools_backup_'+today()+'.json',JSON.stringify(S,null,1),'application/json');
$('restore').onchange=e=>{const f=e.target.files[0];if(!f)return;if(remote){toast(t('msg.restoreRemote'));return;}f.text().then(x=>{try{const d=JSON.parse(x);if(!d.tools||!d.settings)throw 0;S=d;saveCache();render();toast(t('msg.restored'));}catch(_){toast(t('msg.badFile'));}});};

/* ---------- start ---------- */
$('outDate').value=$('retDate').value=$('mvDate').value=today();
applyLang(); boot();
