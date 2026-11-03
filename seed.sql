-- Project Hub internship defense data. Apply migrations 000001..000003 first.
-- Supabase SQL Editor: paste this entire file and run.
-- CLI: psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f seed.sql
-- Demo password for all three application accounts: DemoHub!2026
-- This does not create Supabase Auth identities or fake uploaded files.
-- Repeatable: existing rows are preserved except for the legacy demo-email upgrade.

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_catalog;

-- Upgrade the previous demonstration identities without breaking assignments.
-- Match both stable ID and old email/role to avoid changing unrelated users.
UPDATE public.users AS u
SET email = demo.new_email,
    password_hash = crypt('DemoHub!2026', gen_salt('bf', 10))
FROM (VALUES
  ('11111111-1111-4111-8111-111111111111'::uuid, 'curator@projecthub.demo', 'curator@kbtu.kz', 'ADMIN'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'lead@projecthub.demo', 'lead@kbtu.kz', 'LEAD'),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'student@projecthub.demo', 'student@kbtu.kz', 'MEMBER')
) AS demo(id, old_email, new_email, role)
WHERE u.id = demo.id AND u.email = demo.old_email AND u.role::text = demo.role;

INSERT INTO public.users (id, email, password_hash, full_name, role)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'curator@kbtu.kz',
   crypt('DemoHub!2026', gen_salt('bf', 10)), 'Alex Morgan', 'ADMIN'),
  ('22222222-2222-4222-8222-222222222222', 'lead@kbtu.kz',
   crypt('DemoHub!2026', gen_salt('bf', 10)), 'Sam Taylor', 'LEAD'),
  ('33333333-3333-4333-8333-333333333333', 'student@kbtu.kz',
   crypt('DemoHub!2026', gen_salt('bf', 10)), 'Jamie Lee', 'MEMBER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projects (id, title, description, status, owner_id, is_approved_by_curator)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Campus Resource Portal',
   'A searchable campus resource directory. Finish the API, validate the student experience, and upload the technical specification for curator review.',
   'IN_PROGRESS', '22222222-2222-4222-8222-222222222222', false),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Internship Progress Tracker',
   'A completed internship milestone tracker with a tested reporting workflow. Approved by the curator and ready for defense.',
   'COMPLETED', '22222222-2222-4222-8222-222222222222', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks
  (id, project_id, title, description, status, priority, assignee_id, due_date)
VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
   'Design the resource schema', 'Document entities, foreign keys, and indexes for campus resources.',
   'DONE', 'HIGH', '22222222-2222-4222-8222-222222222222', now() - interval '1 day'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
   'Build the resource search API', 'Implement search and pagination. Sign in as MEMBER to advance this assigned task.',
   'IN_PROGRESS', 'HIGH', '33333333-3333-4333-8333-333333333333', now() + interval '3 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
   'Prepare the technical specification', 'Write the TZ and upload the real document through the project file archive.',
   'TODO', 'MEDIUM', '33333333-3333-4333-8333-333333333333', now() + interval '5 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
   'Implement milestone tracking', 'Deliver milestone CRUD and progress calculations.',
   'DONE', 'HIGH', '22222222-2222-4222-8222-222222222222', now() - interval '7 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
   'Verify the reporting workflow', 'Validate completed milestone reports and student task transitions.',
   'DONE', 'MEDIUM', '33333333-3333-4333-8333-333333333333', now() - interval '4 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
   'Polish the defense walkthrough', 'Check the presentation sequence and demonstration notes.',
   'DONE', 'LOW', '33333333-3333-4333-8333-333333333333', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- Abort the transaction if existing demo IDs belong to unexpected identities.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.users WHERE
       (id = '11111111-1111-4111-8111-111111111111' AND email = 'curator@kbtu.kz' AND role = 'ADMIN') OR
       (id = '22222222-2222-4222-8222-222222222222' AND email = 'lead@kbtu.kz' AND role = 'LEAD') OR
       (id = '33333333-3333-4333-8333-333333333333' AND email = 'student@kbtu.kz' AND role = 'MEMBER')) <> 3 THEN
    RAISE EXCEPTION 'Demo identity collision: use a clean demo database or choose different IDs.';
  END IF;
END $$;

COMMIT;

SELECT email, role FROM public.users
WHERE id IN ('11111111-1111-4111-8111-111111111111',
             '22222222-2222-4222-8222-222222222222',
             '33333333-3333-4333-8333-333333333333')
ORDER BY role;
