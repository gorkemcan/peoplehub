-- PeopleHUB v1. Run once in a new Supabase project's SQL Editor.
begin;
create table public.ph_members (
 id uuid primary key default gen_random_uuid(),
 email text unique not null check (email = lower(trim(email)) and position('@' in email)>1),
 display_name text not null check (length(trim(display_name)) between 1 and 100),
 role text not null check (role in ('admin','designer','approver')),
 active boolean not null default true
);
create table public.ph_contents (
 id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 1 and 160),
 channel text not null check(channel in ('Instagram','LinkedIn')),
 format text not null,
 category text not null check(category in ('İşveren markası','İç iletişim','Kurum kültürü','Çalışan deneyimi')),
 scheduled_at timestamptz not null,
 caption text not null default '' check(length(caption)<=20000),
 brief text not null default '' check(length(brief)<=20000),
 visual_text text not null default '' check(length(visual_text)<=10000),
 design_url text not null default '' check(design_url='' or design_url ~ '^https://[^[:space:]]+$'),
 status text not null default 'draft' check(status in ('draft','design','pending','revision','approved','published')),
 version integer not null default 1,
 created_by uuid not null references public.ph_members(id),
 updated_by uuid not null references public.ph_members(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((channel='Instagram' and format in ('Post','Carousel','Reels','Story')) or
        (channel='LinkedIn' and format in ('Post','Doküman / Carousel','Video','Anket')))
);
create index ph_contents_schedule on public.ph_contents(scheduled_at);
create table public.ph_comments (
 id uuid primary key default gen_random_uuid(), content_id uuid not null references public.ph_contents(id),
 author_id uuid not null references public.ph_members(id), author_name text not null,
 body text not null check(length(trim(body)) between 1 and 4000), created_at timestamptz not null default now()
);
create index ph_comments_content on public.ph_comments(content_id,created_at);
create table public.ph_events (
 id uuid primary key default gen_random_uuid(), content_id uuid not null references public.ph_contents(id),
 actor_id uuid not null references public.ph_members(id), actor_name text not null,
 action text not null, from_status text, to_status text, created_at timestamptz not null default now()
);
create index ph_events_content on public.ph_events(content_id,created_at);

-- Verified identity is read from Auth, never from client-supplied names or roles.
create function public.ph_me() returns public.ph_members language sql stable security definer set search_path='' as $$
 select m from public.ph_members m join auth.users u on lower(u.email)=m.email
 where u.id=auth.uid() and u.email_confirmed_at is not null and m.active=true
$$;
alter table public.ph_members enable row level security;
alter table public.ph_contents enable row level security;
alter table public.ph_comments enable row level security;
alter table public.ph_events enable row level security;
create policy ph_member_read on public.ph_members for select to authenticated using ((public.ph_me()).id is not null);
create policy ph_content_read on public.ph_contents for select to authenticated using ((public.ph_me()).id is not null);
create policy ph_comment_read on public.ph_comments for select to authenticated using ((public.ph_me()).id is not null);
create policy ph_event_read on public.ph_events for select to authenticated using ((public.ph_me()).id is not null);
revoke all on public.ph_members,public.ph_contents,public.ph_comments,public.ph_events from anon,authenticated;
grant select on public.ph_members,public.ph_contents,public.ph_comments,public.ph_events to authenticated;

create function public.ph_save_content(p_id uuid,p_version integer,p_data jsonb) returns public.ph_contents
language plpgsql security definer set search_path='' as $$
declare m public.ph_members; c public.ph_contents; old_status text;
begin
 m:=public.ph_me();
 if m.id is null then raise exception 'NOT_AUTHORIZED'; end if;
 if p_id is null then
  if m.role <> 'admin' then raise exception 'NOT_AUTHORIZED'; end if;
  insert into public.ph_contents(title,channel,format,category,scheduled_at,caption,brief,visual_text,design_url,created_by,updated_by)
  values(p_data->>'title',p_data->>'channel',p_data->>'format',p_data->>'category',(p_data->>'scheduled_at')::timestamptz,
  coalesce(p_data->>'caption',''),coalesce(p_data->>'brief',''),coalesce(p_data->>'visual_text',''),coalesce(p_data->>'design_url',''),m.id,m.id) returning * into c;
  insert into public.ph_events(content_id,actor_id,actor_name,action,to_status) values(c.id,m.id,m.display_name,'created','draft');
  return c;
 end if;
 select * into c from public.ph_contents where id=p_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p_version is distinct from c.version then raise exception 'VERSION_CONFLICT'; end if;
 old_status:=c.status;
 if c.status='published' then raise exception 'PUBLISHED_LOCKED'; end if;
 if m.role='admin' then
  update public.ph_contents set title=p_data->>'title',channel=p_data->>'channel',format=p_data->>'format',
  category=p_data->>'category',scheduled_at=(p_data->>'scheduled_at')::timestamptz,
  caption=coalesce(p_data->>'caption',''),brief=coalesce(p_data->>'brief',''),visual_text=coalesce(p_data->>'visual_text',''),
  design_url=coalesce(p_data->>'design_url',''),status=case when status in ('approved','pending') then 'draft' else status end,
  version=version+1,updated_at=now(),updated_by=m.id where id=p_id returning * into c;
 elsif m.role='designer' and c.status in ('draft','design','revision') then
  if exists(select 1 from jsonb_object_keys(p_data) k where k<>'design_url') then raise exception 'NOT_AUTHORIZED'; end if;
  update public.ph_contents set design_url=coalesce(p_data->>'design_url',''),version=version+1,updated_at=now(),updated_by=m.id
  where id=p_id returning * into c;
 else raise exception 'NOT_AUTHORIZED';
 end if;
 insert into public.ph_events(content_id,actor_id,actor_name,action,from_status,to_status) values(c.id,m.id,m.display_name,'edited',old_status,c.status);
 return c;
end $$;

create function public.ph_change_status(p_id uuid,p_version integer,p_status text,p_note text default '') returns public.ph_contents
language plpgsql security definer set search_path='' as $$
declare m public.ph_members; c public.ph_contents; old_status text; allowed boolean:=false;
begin
 m:=public.ph_me(); if m.id is null then raise exception 'NOT_AUTHORIZED'; end if;
 select * into c from public.ph_contents where id=p_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p_version is distinct from c.version then raise exception 'VERSION_CONFLICT'; end if;
 old_status:=c.status;
 if m.role in ('admin','designer') then
  allowed:=(c.status in ('draft','revision') and p_status='design') or
   (c.status in ('draft','design','revision') and p_status='pending');
 end if;
 if m.role in ('admin','approver') then
  allowed:=allowed or (c.status='pending' and p_status in ('approved','revision'));
 end if;
 if m.role='admin' then
  allowed:=allowed or (c.status='approved' and p_status='published') or
   (c.status in ('design','pending','revision','approved') and p_status='draft');
 end if;
 if not allowed then raise exception 'INVALID_TRANSITION'; end if;
 if p_status='pending' and (trim(c.brief)='' or c.design_url='') then raise exception 'BRIEF_AND_DESIGN_REQUIRED'; end if;
 if p_status='revision' and (length(trim(p_note))=0 or length(p_note)>4000) then raise exception 'REVISION_NOTE_REQUIRED'; end if;
 update public.ph_contents set status=p_status,version=version+1,updated_at=now(),updated_by=m.id where id=p_id returning * into c;
 insert into public.ph_events(content_id,actor_id,actor_name,action,from_status,to_status) values(c.id,m.id,m.display_name,'status',old_status,c.status);
 if p_status='revision' then
  insert into public.ph_comments(content_id,author_id,author_name,body) values(c.id,m.id,m.display_name,trim(p_note));
 end if;
 return c;
end $$;

create function public.ph_add_comment(p_id uuid,p_body text) returns public.ph_comments
language plpgsql security definer set search_path='' as $$
declare m public.ph_members; c public.ph_comments;
begin
 m:=public.ph_me(); if m.id is null then raise exception 'NOT_AUTHORIZED'; end if;
 insert into public.ph_comments(content_id,author_id,author_name,body) values(p_id,m.id,m.display_name,trim(p_body)) returning * into c;
 return c;
end $$;
-- PostgreSQL gives function execution to PUBLIC by default; explicitly close it.
revoke all on function public.ph_me(),public.ph_save_content(uuid,integer,jsonb),public.ph_change_status(uuid,integer,text,text),public.ph_add_comment(uuid,text) from public,anon;
grant execute on function public.ph_me(),public.ph_save_content(uuid,integer,jsonb),public.ph_change_status(uuid,integer,text,text),public.ph_add_comment(uuid,text) to authenticated;
commit;
