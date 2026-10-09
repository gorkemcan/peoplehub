import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
await db.exec(await readFile(new URL('../database/schema.sql',import.meta.url),'utf8'));
const ids=['10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000004'];
for(let i=0;i<4;i++)await db.query('insert into auth.users values($1,$2,now())',[ids[i],`person${i}@example.com`]);
for(let i=0;i<3;i++)await db.query('insert into public.ph_members(email,display_name,role) values($1,$2,$3)',[`person${i}@example.com`,['Bilal','Tasarımcı','Onaycı'][i],['admin','designer','approver'][i]]);
const login=async i=>{await db.exec('reset role;');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[i]]);await db.exec('set role authenticated;');};
const saveOnce=async(id,v,data)=>(await db.query('select * from public.ph_save_content($1,$2,$3::jsonb)',[id,v,JSON.stringify(data)])).rows[0];
const status=async(id,v,s,n='')=>(await db.query('select * from public.ph_change_status($1,$2,$3,$4)',[id,v,s,n])).rows[0];
const data={title:'Test içeriği',channel:'Instagram',format:'Carousel',category:'Kurum kültürü',scheduled_at:'2026-10-15T10:00:00+03:00',caption:'Metin',brief:'Tasarım briefi',visual_text:'Başlık',design_url:'https://www.canva.com/'};
let content;
test('Admin creates; anonymous and unauthorized users cannot read or mutate',async()=>{
 await login(0);content=await saveOnce(null,null,data);assert.equal(content.version,1);
 await login(3);assert.equal((await db.query('select * from public.ph_contents')).rows.length,0);
 await assert.rejects(()=>saveOnce(null,null,data),/NOT_AUTHORIZED/);
 await db.exec('reset role;set role anon;');await assert.rejects(()=>db.query('select * from public.ph_contents'),/permission denied/);
 await assert.rejects(()=>db.query('select public.ph_me()'),/permission denied/);
});
test('Designer cannot edit brief, elevate own role, directly write, or approve',async()=>{
 await login(1);
 await assert.rejects(()=>saveOnce(content.id,content.version,{brief:'changed'}),/NOT_AUTHORIZED/);
 await assert.rejects(()=>db.query("update public.ph_members set role='admin'"),/permission denied/);
 await assert.rejects(()=>db.query("update public.ph_contents set status='approved'"),/permission denied/);
 content=await saveOnce(content.id,content.version,{design_url:'https://www.canva.com/design/test'});
 content=await status(content.id,content.version,'pending');
 await assert.rejects(()=>status(content.id,content.version,'approved'),/INVALID_TRANSITION/);
});
test('Approval/revision and stale edits are enforced on server',async()=>{
 await login(2);await assert.rejects(()=>status(content.id,content.version,'revision'),/REVISION_NOTE_REQUIRED/);
 content=await status(content.id,content.version,'revision','Kapak değişsin.');
 assert.equal((await db.query('select * from public.ph_comments')).rows[0].author_name,'Onaycı');
 await login(1);content=await status(content.id,content.version,'pending');
 await login(2);content=await status(content.id,content.version,'approved');
 await login(0);await assert.rejects(()=>saveOnce(content.id,content.version-1,data),/VERSION_CONFLICT/);
 content=await saveOnce(content.id,content.version,{...data,title:'Değişen başlık'});assert.equal(content.status,'draft');
});
test('Pending edits reset approval; published content is locked; invalid URLs/formats rejected',async()=>{
 await login(0);content=await status(content.id,content.version,'pending');
 content=await saveOnce(content.id,content.version,data);assert.equal(content.status,'draft');
 await assert.rejects(()=>saveOnce(content.id,content.version,{...data,design_url:'javascript:alert(1)'}),/check constraint/);
 await assert.rejects(()=>saveOnce(content.id,content.version,{...data,channel:'LinkedIn',format:'Story'}),/check constraint/);
 content=await status(content.id,content.version,'pending');content=await status(content.id,content.version,'approved');content=await status(content.id,content.version,'published');
 await assert.rejects(()=>saveOnce(content.id,content.version,data),/PUBLISHED_LOCKED/);
});
test('Server derives comment author; revoked members lose access including existing sessions',async()=>{
 await login(1);const comment=(await db.query('select * from public.ph_add_comment($1,$2)',[content.id,'İyi görünüyor.'])).rows[0];assert.equal(comment.author_name,'Tasarımcı');
 await db.exec("reset role;update public.ph_members set active=false where role='designer';");await login(1);
 assert.equal((await db.query('select * from public.ph_contents')).rows.length,0);
 await assert.rejects(()=>db.query('select * from public.ph_add_comment($1,$2)',[content.id,'test']),/NOT_AUTHORIZED/);
});
