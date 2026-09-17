-- Prepare the live beta before sharing the link with doctors.
-- Keeps the beta cohort and memberships, removes only discussion/demo content.

insert into public.cohorts (name)
values ('Coopera Kós · Beta')
on conflict (name) do nothing;

insert into public.memberships (cohort_id, user_id, role, active)
select c.id, u.id, 'admin'::public.member_role, true
from public.cohorts c
join auth.users u on lower(u.email) = 'matheusheyn@gmail.com'
where c.name = 'Coopera Kós · Beta'
on conflict (cohort_id, user_id) do update set role = 'admin', active = true;

with beta as (
  select id from public.cohorts where name = 'Coopera Kós · Beta'
),
beta_members as (
  select user_id from public.memberships where cohort_id in (select id from beta)
),
removed_cases as (
  delete from public.clinical_cases where cohort_id in (select id from beta) returning id
),
removed_conversations as (
  delete from public.direct_conversations where cohort_id in (select id from beta) returning id
),
removed_notifications as (
  delete from public.notifications where recipient_id in (select user_id from beta_members) returning id
),
removed_deliveries as (
  delete from public.email_deliveries where recipient_id in (select user_id from beta_members) returning id
)
delete from storage.objects
where bucket_id = 'case-media'
  and exists (select 1 from beta where storage.objects.name like beta.id::text || '/%');
