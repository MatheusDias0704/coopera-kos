insert into public.cohorts (name) values ('Coopera Kós · Beta') on conflict (name) do nothing;
insert into public.memberships (cohort_id, user_id, role, active)
select c.id, u.id, 'admin'::public.member_role, true from public.cohorts c join auth.users u on lower(u.email) = 'matheusheyn@gmail.com'
where c.name = 'Coopera Kós · Beta'
on conflict (cohort_id, user_id) do update set role = 'admin', active = true;
