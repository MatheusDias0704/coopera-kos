-- Execute somente depois de convidar matheusheyn@gmail.com em Authentication > Users.
insert into public.cohorts (name) values ('Coopera Kós · Beta') on conflict (name) do nothing;
insert into public.memberships (cohort_id, user_id, role, active)
select c.id, u.id, 'admin'::public.member_role, true from public.cohorts c join auth.users u on lower(u.email) = 'matheusheyn@gmail.com'
where c.name = 'Coopera Kós · Beta'
on conflict (cohort_id, user_id) do update set role = 'admin', active = true;
insert into public.clinical_cases (cohort_id, author_id, code, title, mode, clinical_context, community_question, tags, privacy_acknowledged_at)
select c.id, u.id, 'BETA-001', 'Cenário fictício de assimetria prévia', 'roteiro_clinico', 'Dados completamente fictícios. Não descreve um paciente real.', 'Como a turma organizaria os pontos de discussão antes do planejamento?', array['Beta','Demonstração','Blefaroplastia'], now()
from public.cohorts c join auth.users u on lower(u.email) = 'matheusheyn@gmail.com' where c.name = 'Coopera Kós · Beta'
on conflict (cohort_id, code) do nothing;
