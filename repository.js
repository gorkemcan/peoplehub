import {config} from './config.js';
import {validateContent,transitions} from './domain.js';
export const configured=Boolean(config.supabaseUrl&&config.supabasePublishableKey);
let client;
export async function connect(){
 if(!configured)return null;
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.supabaseUrl))throw Error('config.js içindeki Supabase adresini kontrol et.');
 if(config.supabasePublishableKey.startsWith('sb_secret_'))throw Error('Gizli anahtar kullanılamaz. Publishable anahtarı gir.');
 if(config.supabasePublishableKey.startsWith('eyJ')){
  let role;try{role=JSON.parse(atob(config.supabasePublishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role;}catch{}
  if(role!=='anon')throw Error('Yalnızca publishable veya anon anahtarı kullanılabilir.');
 }
 const {createClient}=await import('./vendor/supabase.js');
 client=createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true}});
 return client;
}
const unwrap=r=>{if(r.error)throw r.error;return r.data;};
async function allRows(query){
 const result=[];let start=0;
 for(;;){const rows=unwrap(await query.range(start,start+499));result.push(...rows);if(rows.length<500)return result;start+=500;}
}
export const live={
 async me(){
  const current=unwrap(await client.rpc('ph_me').maybeSingle());
  if(current?.id)return current;
  const joined=await client.rpc('ph_join').maybeSingle();
  if(joined.error?.code==='PGRST202')return null;
  return unwrap(joined);
 },
 async list(){return allRows(client.from('ph_contents').select('*').order('scheduled_at').order('id'));},
 async members(){return allRows(client.from('ph_members').select('id,display_name,role,active').order('id'));},
 async comments(id){return allRows(client.from('ph_comments').select('*').eq('content_id',id).order('created_at').order('id'));},
 async events(id){return allRows(client.from('ph_events').select('*').eq('content_id',id).order('created_at',{ascending:false}).order('id'));},
 async save(id,version,data){return unwrap(await client.rpc('ph_save_content',{p_id:id,p_version:version,p_data:data}).single());},
 async status(id,version,status,note){return unwrap(await client.rpc('ph_change_status',{p_id:id,p_version:version,p_status:status,p_note:note}).single());},
 async comment(id,body){return unwrap(await client.rpc('ph_add_comment',{p_id:id,p_body:body}).single());}
};
export function createDemo(){
 const now=new Date(); const y=now.getFullYear(),mo=now.getMonth();
 const date=(day,h=10)=>new Date(`${y}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}T${h}:00:00+03:00`).toISOString();
 const people=[{id:'demo-admin',display_name:'Plan yöneticisi',role:'admin',active:true},{id:'demo-designer',display_name:'Tasarım ekibi',role:'designer',active:true},{id:'demo-approver',display_name:'Onay ekibi',role:'approver',active:true}];
 let role='admin';
 let contents=[
  ['Birlikte çalışmanın küçük ritüelleri','Instagram','Carousel','Kurum kültürü',12,'design'],
  ['PeopleHUB’da bir gün','Instagram','Reels','Çalışan deneyimi',14,'draft'],
  ['Güçlü bir işveren markası nerede başlar?','LinkedIn','Doküman / Carousel','İşveren markası',16,'pending'],
  ['Ekipten ekibe: bilgi paylaşımı','Instagram','Story','İç iletişim',20,'revision'],
  ['İlk günden başlayan çalışan deneyimi','LinkedIn','Post','Çalışan deneyimi',22,'approved'],
  ['Kültürü birlikte oluşturuyoruz','Instagram','Post','Kurum kültürü',5,'published']
 ].map((r,i)=>({id:`demo-${i}`,title:r[0],channel:r[1],format:r[2],category:r[3],scheduled_at:date(r[4]),status:r[5],version:1,
 caption:'Birlikte çalışmak, ortak bir hedef kadar günlük hayatı paylaşmak demek. Küçük alışkanlıklar, güçlü bağların başlangıcı olabilir.\n\nSizin ekibinizin vazgeçilmez ritüeli ne?',
 brief:'4:5 oranında, 4 sayfalık bir carousel hazırlansın. Gerçek ekip fotoğrafları ve sade bir tipografi kullanılsın.\n\n1. sayfa: Başlık ve ekip fotoğrafı\n2. sayfa: Birlikte öğrenme\n3. sayfa: Açık iletişim\n4. sayfa: Katılım sorusu\n\nMarka renkleri uygulansın. Fotoğraf seçimlerini ilk taslakla birlikte paylaş.',
 visual_text:'Birlikte çalışmanın küçük ritüelleri\nBirlikte öğreniyoruz.\nBirbirimizi dinliyoruz.\nSizin ekip ritüeliniz ne?',design_url:['pending','approved','revision','published'].includes(r[5])?'https://www.canva.com/':'',updated_at:date(2),created_at:date(1)}));
 const comments=[{id:'comment-1',content_id:'demo-2',author_name:'Tasarım ekibi',body:'Örnek not: İlk tasarım bağlantısını ekledim. Kapak metni için görüşünü bekliyorum.',created_at:date(3)}];
 const events=[]; const copy=v=>structuredClone(v); const person=()=>people.find(p=>p.role===role);
 function find(id,v){const c=contents.find(x=>x.id===id);if(!c)throw Error('NOT_FOUND');if(c.version!==v)throw Error('VERSION_CONFLICT');return c;}
 return {
 setRole(r){role=r;},async me(){return copy(person());},async list(){return copy(contents);},async members(){return copy(people);},
 async comments(id){return copy(comments.filter(c=>c.content_id===id));},async events(id){return copy(events.filter(c=>c.content_id===id).reverse());},
 async save(id,v,data){
  if(!id){if(role!=='admin')throw Error('NOT_AUTHORIZED');validateContent(data);const c={...data,id:crypto.randomUUID(),version:1,status:'draft',updated_at:new Date().toISOString()};contents.push(c);return copy(c);}
  const c=find(id,v);if(c.status==='published')throw Error('PUBLISHED_LOCKED');
  if(role==='admin'){validateContent(data);Object.assign(c,data);if(['approved','pending'].includes(c.status))c.status='draft';}
  else if(role==='designer'&&['draft','design','revision'].includes(c.status)){if(Object.keys(data).some(k=>k!=='design_url'))throw Error('NOT_AUTHORIZED');c.design_url=data.design_url;}
  else throw Error('NOT_AUTHORIZED');c.version++;c.updated_at=new Date().toISOString();return copy(c);
 },
 async status(id,v,status,note){const c=find(id,v);if(!transitions(role,c.status).includes(status))throw Error('INVALID_TRANSITION');
  if(status==='pending'&&(!c.brief.trim()||!c.design_url))throw Error('BRIEF_AND_DESIGN_REQUIRED');
  if(status==='revision'&&(!note.trim()||note.length>4000))throw Error('REVISION_NOTE_REQUIRED');
  events.push({id:crypto.randomUUID(),content_id:id,actor_name:person().display_name,action:'status',from_status:c.status,to_status:status,created_at:new Date().toISOString()});
  c.status=status;c.version++;c.updated_at=new Date().toISOString();if(status==='revision')await this.comment(id,note);return copy(c);
 },
 async comment(id,body){if(!body.trim()||body.length>4000)throw Error('Not 1–4000 karakter olmalı.');const c={id:crypto.randomUUID(),content_id:id,body:body.trim(),author_name:person().display_name,created_at:new Date().toISOString()};comments.push(c);return copy(c);}
 };
}
