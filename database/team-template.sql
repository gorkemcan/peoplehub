-- Run AFTER schema.sql. Replace these EXAMPLE emails with the actual Google account emails.
-- Google sign-in creates Auth accounts automatically; this table grants application access.
insert into public.ph_members(email,display_name,role) values
 ('yonetici@example.com','Bilal','admin'),
 ('tasarimci@example.com','Tasarımcı','designer'),
 ('onayci@example.com','Onaycı','approver')
on conflict(email) do update set display_name=excluded.display_name,role=excluded.role,active=true;

-- Remove access (uncomment and replace email):
-- update public.ph_members set active=false where email='tasarimci@example.com';
-- Change a role:
-- update public.ph_members set role='approver' where email='onayci@example.com';
