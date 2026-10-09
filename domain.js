export const STATUSES={draft:'Taslak',design:'Tasarımda',pending:'Onay bekliyor',revision:'Revizyon',approved:'Onaylandı',published:'Yayınlandı'};
export const ROLES={admin:'Yönetici',designer:'Tasarımcı',approver:'Onaycı'};
export const CATEGORIES=['İşveren markası','İç iletişim','Kurum kültürü','Çalışan deneyimi'];
export const FORMATS={Instagram:['Post','Carousel','Reels','Story'],LinkedIn:['Post','Doküman / Carousel','Video','Anket']};
export const esc=(s='')=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dayKey=d=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d));
export const timeLabel=d=>new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'}).format(new Date(d));
export const dateLabel=d=>new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',day:'numeric',month:'long'}).format(new Date(d));
export const inputDate=d=>`${dayKey(d)}T${timeLabel(d)}`;
export const toUTC=value=>new Date(value+':00+03:00').toISOString();
export function safeURL(value){if(!value)return '';try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}}
export function transitions(role,status){
 const out=[];
 if(['admin','designer'].includes(role)){
  if(['draft','revision'].includes(status))out.push('design');
  if(['draft','design','revision'].includes(status))out.push('pending');
 }
 if(['admin','approver'].includes(role)&&status==='pending')out.push('approved','revision');
 if(role==='admin'){
  if(status==='approved')out.push('published');
  if(['design','pending','revision','approved'].includes(status))out.push('draft');
 }
 return out;
}
export function monthGrid(year,month){
 const first=new Date(Date.UTC(year,month,1)); const offset=(first.getUTCDay()+6)%7;
 const count=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 return Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>{
  const d=new Date(Date.UTC(year,month,1-offset+i));return {key:d.toISOString().slice(0,10),day:d.getUTCDate(),outside:d.getUTCMonth()!==month};
 });
}
export function validateContent(data){
 if(!data.title?.trim()||data.title.trim().length>160)throw Error('Başlık 1–160 karakter olmalı.');
 if(!FORMATS[data.channel]?.includes(data.format))throw Error('Mecra için uygun bir format seç.');
 if(!CATEGORIES.includes(data.category))throw Error('Kategori seç.');
 if(!data.scheduled_at||isNaN(Date.parse(data.scheduled_at)))throw Error('Yayın tarihi ve saati gerekli.');
 if(data.design_url && (!safeURL(data.design_url)||/\s/.test(data.design_url)))throw Error('Tasarım bağlantısı https:// ile başlamalı.');
 return data;
}
export function userError(e){
 const msg=e?.message||String(e);const map={VERSION_CONFLICT:'Bu kart ekipten biri tarafından değiştirildi. Girdiklerini kopyalayıp güncel kartı aç.',NOT_AUTHORIZED:'Bu işlem için ekip yetkin bulunmuyor.',PUBLISHED_LOCKED:'Yayınlanan içerik değiştirilemez.',INVALID_TRANSITION:'Bu durum değişikliği için yetkin yok veya kartın durumu değişti.',BRIEF_AND_DESIGN_REQUIRED:'Onaya göndermeden önce brief ve tasarım bağlantısını tamamla.',REVISION_NOTE_REQUIRED:'Revizyon için 1–4000 karakterlik bir not yaz.',NOT_FOUND:'İçerik bulunamadı.'};
 for(const [k,v] of Object.entries(map))if(msg.includes(k))return v;
 if(/fetch|network/i.test(msg))return 'Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.';
 if(/check constraint/.test(msg))return 'Alanların uzunluğunu, formatı ve bağlantıyı kontrol et.';
 return msg;
}
