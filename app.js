import {STATUSES,ROLES,CATEGORIES,FORMATS,esc,dayKey,timeLabel,dateLabel,inputDate,toUTC,safeURL,transitions,monthGrid,validateContent,userError} from './domain.js';
import {configured,connect,live,createDemo} from './repository.js';
const root=document.querySelector('#app'),dialog=document.querySelector('#detail');
let repo,client,me,items=[],members=[],demo=false,view='calendar',channel='',status='',search='',selected=null,dirty=false,saving=false,polling=false;
const today=dayKey(new Date());let [year,month]=today.split('-').slice(0,2).map(Number);month--;
const icon=(name)=>({calendar:'▦',list:'☷',users:'◉'}[name]||'');
const badge=c=>`<span class="badge ${esc(c.status)}">${STATUSES[c.status]}</span>`;
const chan=c=>`<span class="channel ${c.channel==='Instagram'?'ig':'li'}">${c.channel==='Instagram'?'IG':'in'}</span>`;
const toast=(s)=>{const el=document.querySelector('#toast');el.textContent=s;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),6500);};
const options=(list,value,labels)=>list.map(v=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(labels?.[v]||v)}</option>`).join('');
function login(message=''){
 root.innerHTML=`<main class="login"><div class="login-brand">People<span>HUB</span><span class="brand-square"></span></div><section class="login-card"><div class="eyebrow">İÇERİK ÇALIŞMA ALANI</div><h1>Aynı plan.<br>Aynı güncel içerik.</h1><p>PeopleHUB içerik planı, tasarım briefleri ve ekip notları.</p>${message?`<p class="error" role="alert">${esc(message)}</p>`:''}${configured?'<button id="google" class="primary wide">Google hesabıyla giriş yap</button><p class="small">Yetkilendirilen ekip hesapları erişebilir.</p>':'<p class="notice">Ekip bağlantısı henüz kurulmadı. Önce örnek paneli inceleyebilirsin.</p>'}<button id="demo" class="secondary wide">Örnek paneli incele</button><p class="small">Örnek veriler kullanılır. Değişiklikler kaydedilmez.</p></section><p class="login-footer">PeopleHUB · İçerik planlama</p></main>`;
 document.querySelector('#demo').onclick=async()=>{demo=true;repo=createDemo();me=await repo.me();await refresh();};
 document.querySelector('#google')?.addEventListener('click',async e=>{e.target.disabled=true;try{const r=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:new URL('./',location.href).href,queryParams:{prompt:'select_account'}}});if(r.error)throw r.error;}catch(err){toast(userError(err));e.target.disabled=false;}});
}
async function refresh(){
 const current=await repo.me();if(!current?.id){clearWorkspace();login('Bu hesaba ekip erişimi verilmemiş. Plan yöneticisiyle iletişime geç.');return;}
 const result=await Promise.all([repo.list(),repo.members()]);me=current;[items,members]=result;render();
}
function clearWorkspace(){items=[];members=[];me=null;selected=null;dirty=false;dialog.close();dialog.innerHTML='';}
function render(){
 const count=k=>items.filter(c=>c.status===k).length;
 root.innerHTML=`<div class="shell"><aside class="sidebar"><a class="logo" href="./">People<span>HUB</span><i></i></a><div class="workspace"><span class="workspace-icon">P</span><div>PeopleHUB<small>İçerik çalışma alanı</small></div></div><div class="nav-label">ÇALIŞMA ALANI</div><nav>${[['calendar','İçerik takvimi'],['list','İçerik listesi'],['team','Ekip']].map(([v,t])=>`<button data-view="${v}" class="nav-item ${view===v?'active':''}"><span>${icon(v==='team'?'users':v)}</span>${t}${v==='calendar'?`<b>${items.length}</b>`:''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="avatar">${esc(me.display_name[0])}</div><div>${esc(me.display_name)}<small>${ROLES[me.role]}</small></div><button id="logout" title="Çıkış yap" aria-label="Çıkış yap">Çıkış</button></div></aside><main class="main">${demo?`<div class="demo-bar"><span><b>Örnek panel</b> · Veriler ortak kaydedilmez; sayfa yenilenince sıfırlanır.</span><label>Rol <select id="demo-role">${options(Object.keys(ROLES),me.role,ROLES)}</select></label></div>`:''}<header class="topbar"><span>Çalışma alanı <span class="slash">/</span> ${view==='team'?'Ekip':'İçerik planı'}</span><span class="connection">${demo?'Örnek çalışma alanı':'Ortak plan · 15 sn’de yenilenir'}</span><button id="mobile-logout" class="mobile-logout">Çıkış</button></header><section class="page"><div class="page-title"><div><div class="eyebrow">PEOPLEHUB</div><h1>${view==='team'?'Ekip':'İçerik planı'}</h1><p>${view==='team'?'Planın etrafındaki ekip.':'Instagram ve LinkedIn içeriklerini birlikte planla.'}</p></div>${me.role==='admin'&&view!=='team'?'<button class="primary" id="new">+ Yeni içerik</button>':''}</div>${view==='team'?teamHTML():`<div class="stats"><button data-filter=""><span>Toplam içerik</span><strong>${items.length}<i class="stat-icon">▦</i></strong></button><button data-filter="design"><span>Tasarımda</span><strong>${count('design')}<i class="stat-icon blue">◈</i></strong></button><button data-filter="pending"><span>Onay bekliyor</span><strong>${count('pending')}<i class="stat-icon orange">◷</i></strong></button><button data-filter="approved"><span>Onaylandı</span><strong>${count('approved')}<i class="stat-icon green">✓</i></strong></button></div><div class="plan-panel"><div class="plan-toolbar"><div class="month-control"><button id="prev" aria-label="Önceki ay">‹</button><h2>${new Date(year,month,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</h2><button id="next" aria-label="Sonraki ay">›</button><button id="today">Bu ay</button></div><div class="view-toggle"><button data-view="calendar" class="${view==='calendar'?'chosen':''}">Takvim</button><button data-view="list" class="${view==='list'?'chosen':''}">Liste</button></div></div><div class="filters"><label class="search"><span>⌕</span><input id="search" placeholder="İçerik ara…" aria-label="İçerik ara" value="${esc(search)}"></label><select id="channel" aria-label="Mecra"><option value="">Tüm mecralar</option>${options(Object.keys(FORMATS),channel)}</select><select id="status" aria-label="İçerik durumu"><option value="">Tüm durumlar</option>${options(Object.keys(STATUSES),status,STATUSES)}</select><button id="refresh" class="quiet">Yenile</button></div><div id="plan-body"></div><footer class="plan-footer"><div><span class="channel ig">IG</span> Instagram <span class="channel li">in</span> LinkedIn</div><span>Tüm saatler Türkiye saati · UTC+3</span></footer></div>`}</section></main></div>`;
 root.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>{view=el.dataset.view;render();});
 root.querySelectorAll('[data-filter]').forEach(el=>el.onclick=()=>{status=el.dataset.filter;render();});
 document.querySelector('#new')?.addEventListener('click',()=>openDetail(null));
 const logout=async()=>{if(demo){demo=false;clearWorkspace();login();}else{const r=await client.auth.signOut({scope:'local'});if(r.error){toast(userError(r.error));return;}clearWorkspace();login();}};
 document.querySelector('#logout').onclick=logout;document.querySelector('#mobile-logout').onclick=logout;
 document.querySelector('#demo-role')?.addEventListener('change',async e=>{repo.setRole(e.target.value);await refresh();});
 if(view==='team')return;
 for(const id of ['channel','status'])document.querySelector('#'+id).onchange=e=>{if(id==='channel')channel=e.target.value;else status=e.target.value;drawPlan();};
 document.querySelector('#search').oninput=e=>{search=e.target.value;drawPlan();};
 document.querySelector('#prev').onclick=()=>move(-1);document.querySelector('#next').onclick=()=>move(1);
 document.querySelector('#today').onclick=()=>{[year,month]=today.split('-').slice(0,2).map(Number);month--;render();};
 document.querySelector('#refresh').onclick=()=>refresh().catch(e=>toast(userError(e)));drawPlan();
}
function move(delta){const d=new Date(year,month+delta,1);year=d.getFullYear();month=d.getMonth();render();}
function filtered(){const prefix=`${year}-${String(month+1).padStart(2,'0')}`;return items.filter(c=>dayKey(c.scheduled_at).startsWith(prefix)&&(!channel||c.channel===channel)&&(!status||c.status===status)&&(!search||`${c.title} ${c.category}`.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')))).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at));}
function drawPlan(){
 const data=filtered(),el=document.querySelector('#plan-body');
 if(view==='calendar'){
 el.innerHTML=`<div class="calendar"><div class="weekdays">${['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'].map(d=>`<div>${d}</div>`).join('')}</div><div class="days">${monthGrid(year,month).map(d=>`<div class="day ${d.outside?'outside':''} ${d.key===today?'today':''}"><span class="day-number">${d.day}</span>${data.filter(c=>dayKey(c.scheduled_at)===d.key).map(c=>`<button class="calendar-card ${esc(c.status)}" data-content="${c.id}"><div>${chan(c)}<span>${timeLabel(c.scheduled_at)} · ${esc(c.format)}</span></div><strong>${esc(c.title)}</strong>${badge(c)}</button>`).join('')}</div>`).join('')}</div></div>${data.length?'':'<div class="empty-month">Bu ay filtrelere uygun içerik yok.</div>'}`;
 }else el.innerHTML=data.length?`<div class="list-header"><span>İçerik</span><span>Yayın zamanı</span><span>Durum</span></div>${data.map(c=>`<button class="list-row" data-content="${c.id}"><div>${chan(c)}<div><strong>${esc(c.title)}</strong><small>${esc(c.category)} · ${esc(c.format)}</small></div></div><span>${dateLabel(c.scheduled_at)}<small>${timeLabel(c.scheduled_at)}</small></span>${badge(c)}</button>`).join('')}`:'<div class="empty"><h3>Henüz içerik yok</h3><p>Bu ay için içerik ekleyebilir veya filtreleri değiştirebilirsin.</p></div>';
 el.querySelectorAll('[data-content]').forEach(b=>b.onclick=()=>openDetail(items.find(c=>c.id===b.dataset.content)));
}
function teamHTML(){return `<div class="team-grid">${members.filter(m=>m.active).map(m=>`<article class="team-card"><span class="avatar">${esc(m.display_name[0])}</span><h2>${esc(m.display_name)}</h2><span class="badge">${ROLES[m.role]}</span><p>${m.role==='admin'?'İçeriği ve briefi düzenler, onay sürecini ve yayın durumunu takip eder.':m.role==='designer'?'Briefi görür, tasarım bağlantısını ekler ve içeriği onaya gönderir.':'İçeriği inceler, onay verir veya revizyon notu bırakır.'}</p></article>`).join('')}</div><p class="team-note">Herkes içerik kartlarına yorum yazabilir. Ekip üyelerini ve rollerini proje yöneticisi tanımlar.</p>`;}
function field(label,name,value,type='text',editable=true){
 const attrs=`name="${name}" ${editable?'':'readonly'} ${name==='title'?'required maxlength="160"':''} ${name==='scheduled_at'?'required':''}`;
 return `<label class="field"><span>${label}</span>${type==='textarea'?`<textarea ${attrs} rows="${name==='brief'?5:4}" maxlength="${name==='visual_text'?10000:20000}">${esc(value)}</textarea>`:`<input ${attrs} type="${type}" value="${esc(value)}" ${name==='design_url'?'placeholder="https://www.canva.com/…"':''}>`}</label>`;
}
async function openDetail(c){
 selected=c?structuredClone(c):null;dirty=false;saving=false;
 const editable=me.role==='admin'&&c?.status!=='published';const designEditable=editable||(me.role==='designer'&&['draft','design','revision'].includes(c?.status));
 const item=c||{title:'',channel:'Instagram',format:'Post',category:CATEGORIES[0],scheduled_at:`${year}-${String(month+1).padStart(2,'0')}-01T07:00:00Z`,caption:'',brief:'',visual_text:'',design_url:''};
 const selectField=(label,name,values,value)=>`<label class="field"><span>${label}</span><select name="${name}" ${editable?'':'disabled'}>${options(values,value)}</select></label>`;
 dialog.innerHTML=`<div class="drawer-header"><div><div class="eyebrow">${c?'İÇERİK KARTI':'YENİ İÇERİK'}</div><h2 id="detail-title">${c?esc(c.title):'İçeriğini planla'}</h2>${c?`${chan(c)} ${badge(c)}`:''}</div><button id="close" class="close" aria-label="Kartı kapat">×</button></div><div class="drawer-scroll"><div id="stale" class="notice" hidden></div><div class="drawer-tabs"><button data-tab="brief" class="chosen">İçerik & brief</button>${c?'<button data-tab="comments">Ekip notları</button><button data-tab="events">Geçmiş</button>':''}</div><div data-pane="brief"><form id="content-form">${field('İçerik başlığı','title',item.title,'text',editable)}<div class="field-grid">${selectField('Mecra','channel',Object.keys(FORMATS),item.channel)}${selectField('Format','format',FORMATS[item.channel],item.format)}${field('Yayın tarihi ve saati · Türkiye','scheduled_at',inputDate(item.scheduled_at),'datetime-local',editable)}${selectField('Kategori','category',CATEGORIES,item.category)}</div>${field('Paylaşım metni','caption',item.caption,'textarea',editable)}<div class="brief-label">TASARIMCI İÇİN</div>${field('Tasarım briefi','brief',item.brief,'textarea',editable)}${!c?'<p class="field-hint">Ne hazırlanacak? Kaç sayfa, hangi ölçü ve hangi görsel yaklaşım?</p>':''}${field('Görsel üzerinde kullanılacak metinler','visual_text',item.visual_text,'textarea',editable)}${field('Canva / tasarım bağlantısı','design_url',item.design_url,'url',designEditable)}${safeURL(item.design_url)?`<a class="design-link" href="${esc(safeURL(item.design_url))}" target="_blank" rel="noopener noreferrer">Tasarımı aç</a>`:''}${editable||designEditable?`<div class="save-row"><span>${c&&['approved','pending'].includes(c.status)?'Kaydetmek onayı sıfırlar; kart taslağa döner.':'Değişiklikleri kaydet.'}</span><button type="submit" class="primary">${c?'Değişiklikleri kaydet':'İçerik oluştur'}</button></div>`:''}<p id="form-error" class="error" role="alert"></p></form>${c?`<section class="status-actions"><h3>Onay akışı</h3><p>${c.status==='published'?'Yayınlandı olarak işaretlendi.':c.status==='approved'?'Onaylandı. Yönetici, paylaşım yapıldıktan sonra yayınlandı olarak işaretleyebilir.':'Brief ve tasarımı tamamlayıp onaya gönder.'}</p>${transitions(me.role,c.status).length?`<label class="field"><span>Revizyon notu (revizyon istersen gerekli)</span><textarea id="revision-note" rows="2" maxlength="4000" placeholder="Hangi bölüm değiştirilmeli?"></textarea></label><div class="action-buttons">${transitions(me.role,c.status).map(s=>`<button data-status="${s}" class="${s==='approved'?'primary':'secondary'}">${{design:'Tasarıma al',pending:'Onaya gönder',approved:'Onay ver',revision:'Revizyon iste',published:'Yayınlandı olarak işaretle',draft:'Taslağa al'}[s]}</button>`).join('')}</div>`:'<p class="small">Bu durumda rolüne açık bir işlem bulunmuyor. Ekip notu bırakabilirsin.</p>'}</section>`:''}</div>${c?`<div data-pane="comments" hidden><div id="comment-list">Notlar yükleniyor…</div><form id="comment-form"><label class="field"><span>Ekip notun</span><textarea name="body" required maxlength="4000" rows="4" placeholder="Tasarım ve içerik hakkındaki notunu yaz…"></textarea></label><button class="primary">Notu ekle</button><p id="comment-error" class="error" role="alert"></p></form></div><div data-pane="events" hidden><div id="event-list">Geçmiş yükleniyor…</div></div>`:''}</div>`;
 if(!dialog.open)dialog.showModal();document.querySelector('#close').onclick=closeDetail;
 dialog.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{dialog.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('chosen',x===b));dialog.querySelectorAll('[data-pane]').forEach(x=>x.hidden=x.dataset.pane!==b.dataset.tab);});
 const form=document.querySelector('#content-form');form.oninput=()=>{dirty=true;};
 form.elements.channel.onchange=()=>{form.elements.format.innerHTML=options(FORMATS[form.elements.channel.value],FORMATS[form.elements.channel.value][0]);dirty=true;};
 form.onsubmit=async e=>{e.preventDefault();if(saving)return;await mutate(form,'#form-error',async()=>{
  let data;if(me.role==='designer')data={design_url:form.elements.design_url.value.trim()};else{data=Object.fromEntries(new FormData(form));data.title=data.title.trim();data.design_url=data.design_url.trim();data.scheduled_at=toUTC(data.scheduled_at);validateContent(data);}
  if(data.design_url&&!safeURL(data.design_url))throw Error('Tasarım bağlantısı https:// ile başlamalı.');
  const saved=await repo.save(c?.id||null,c?.version||null,data);dirty=false;await refresh();await openDetail(saved);toast(demo?'Örnek içerik güncellendi.':'İçerik ortak plana kaydedildi.');
 });};
 dialog.querySelectorAll('[data-status]').forEach(b=>b.onclick=async()=>{
  if(dirty){toast('Önce karttaki değişiklikleri kaydet.');return;}
  await mutate(dialog,'#form-error',async()=>{const s=b.dataset.status,note=document.querySelector('#revision-note')?.value||'';const saved=await repo.status(c.id,c.version,s,note);await refresh();await openDetail(saved);toast(STATUSES[s]);});
 });
 document.querySelector('#comment-form')?.addEventListener('submit',async e=>{e.preventDefault();await mutate(e.target,'#comment-error',async()=>{await repo.comment(c.id,e.target.elements.body.value);e.target.reset();await loadDiscussion(c.id);toast('Ekip notu eklendi.');});});
 if(c)await loadDiscussion(c.id);
}
async function mutate(area,errorSel,fn){
 if(saving)return;saving=true;const buttons=[...area.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
 const err=document.querySelector(errorSel);if(err)err.textContent='';
 try{await fn();}catch(e){const target=document.querySelector(errorSel);if(target)target.textContent=userError(e);else toast(userError(e));}
 finally{saving=false;buttons.forEach(b=>b.disabled=false);}
}
async function loadDiscussion(id){
 try{const [comments,events]=await Promise.all([repo.comments(id),repo.events(id)]);if(selected?.id!==id||!dialog.open)return;
 document.querySelector('#comment-list').innerHTML=comments.length?comments.map(c=>`<article class="comment"><div class="comment-meta"><strong>${esc(c.author_name)}</strong><time>${dateLabel(c.created_at)} ${timeLabel(c.created_at)}</time></div><p>${esc(c.body)}</p></article>`).join(''):'<div class="discussion-empty">İlk ekip notunu sen bırak.</div>';
 document.querySelector('#event-list').innerHTML=events.length?events.map(e=>`<article class="event"><span class="event-mark"></span><div><strong>${esc(e.actor_name)}</strong><p>${e.action==='created'?'İçerik oluşturuldu':e.action==='edited'?'İçerik düzenlendi':`${STATUSES[e.from_status]} → ${STATUSES[e.to_status]}`}</p><small>${dateLabel(e.created_at)} ${timeLabel(e.created_at)}</small></div></article>`).join(''):'<div class="discussion-empty">Henüz işlem kaydı yok.</div>';
 }catch(e){if(selected?.id===id){const el=document.querySelector('#comment-list');if(el)el.textContent=userError(e);}}
}
function closeDetail(){if(saving){toast('İşlem tamamlanıyor.');return;}if(dirty&&!confirm('Kaydedilmeyen değişiklikler var. Kart kapatılsın mı?'))return;dialog.close();selected=null;dirty=false;}
dialog.addEventListener('cancel',e=>{e.preventDefault();closeDetail();});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
async function poll(){
 if(!me||demo||saving||polling||document.hidden)return;polling=true;
 try{const previous=me.role;const current=await repo.me();if(!current?.id){clearWorkspace();login('Ekip erişimin kaldırıldı.');return;}
  if(previous!==current.role){dirty=false;dialog.close();selected=null;}me=current;items=await repo.list();
  if(!dialog.open){await refresh();}else{
   if(view!=='team')drawPlan();const latest=items.find(c=>c.id===selected?.id);
   if(latest&&latest.version!==selected.version){const el=document.querySelector('#stale');el.hidden=false;el.innerHTML='Bu kart ekipten biri tarafından güncellendi. Kaydetmeden önce güncel sürümü aç. <button id="reload-card">Güncel kartı aç</button>';document.querySelector('#reload-card').onclick=()=>{if(dirty&&!confirm('Kaydedilmeyen değişiklikler silinecek. Güncel kart açılsın mı?'))return;openDetail(latest);};}
   if(selected)await loadDiscussion(selected.id);
  }
 }catch(e){toast(userError(e));}finally{polling=false;}
}
try{
 client=await connect();if(!client)login();else{
  const {data,error}=await client.auth.getSession();if(error)throw error;
  // PKCE callback is handled by Supabase's browser client before getSession resolves.
  const clean=new URL(location.href);clean.searchParams.delete('code');history.replaceState({},'',clean.pathname+clean.search);
  repo=live;if(data.session)await refresh();else login();
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'&&!demo){clearWorkspace();login();}});
 }
}catch(e){login(userError(e));}
setInterval(poll,15000);window.addEventListener('focus',poll);
