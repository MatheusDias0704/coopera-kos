-- Run against a clean test database after all migrations. All fixture data rolls back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
('10000000-0000-0000-0000-000000000001','student@example.test','{"full_name":"Aluno Um"}'),
('10000000-0000-0000-0000-000000000002','mentor@example.test','{"full_name":"Mentor Um"}'),
('10000000-0000-0000-0000-000000000003','admin@example.test','{"full_name":"Admin Um"}'),
('10000000-0000-0000-0000-000000000004','inactive@example.test','{"full_name":"Inativo Um"}'),
('10000000-0000-0000-0000-000000000005','other@example.test','{"full_name":"Outra Turma"}');
insert into public.cohorts(id,name) values('20000000-0000-0000-0000-000000000001','Test A'),('20000000-0000-0000-0000-000000000002','Test B');
insert into public.memberships(cohort_id,user_id,role,active) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','aluno',true),
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','mentor',true),
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','admin',true),
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','aluno',false),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000005','admin',true);
insert into public.clinical_cases(id,cohort_id,author_id,code,title,mode,community_question,privacy_acknowledged_at) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','TEST-1','Caso anônimo','texto_livre','Qual o raciocínio educacional?',now());
create function pg_temp.assert_true(result boolean, description text) returns void language plpgsql as $$ begin if result is not true then raise exception 'FAIL: %', description; end if; end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.assert_true((select count(*)=1 from public.clinical_cases),'active student reads own cohort');
select pg_temp.assert_true(not public.has_current_legal_consent(),'legal consent required');
insert into public.legal_acceptances(user_id,document_slug,document_version) select auth.uid(),slug,version from public.legal_documents where active;
select pg_temp.assert_true(public.has_current_legal_consent(),'current documents accepted');
do $$ begin
  begin insert into public.mentor_summaries(case_id,mentor_id,body) values('30000000-0000-0000-0000-000000000001',auth.uid(),'Síntese educacional pelo aluno não autorizada.'); raise exception 'FAIL: student resolved case'; exception when insufficient_privilege then null; end;
end; $$;
insert into public.case_comments(id,case_id,author_id,body) values('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',auth.uid(),'Contribuição educacional');
insert into storage.objects(bucket_id,name,owner_id) values('case-media','20000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/attachment.pdf',auth.uid()::text);
insert into public.case_attachments(case_id,uploader_id,storage_path,filename,kind,mime_type,byte_size) values('30000000-0000-0000-0000-000000000001',auth.uid(),'20000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/attachment.pdf','attachment.pdf','pdf','application/pdf',100);
select pg_temp.assert_true((select count(*)=1 from storage.objects),'author can read registered private object');
do $$ begin
  begin update public.clinical_cases set cohort_id='20000000-0000-0000-0000-000000000002' where id='30000000-0000-0000-0000-000000000001'; raise exception 'FAIL: content moved across cohorts'; exception when insufficient_privilege then null; end;
end; $$;
do $$ declare i integer; begin
  for i in 1..19 loop insert into public.case_comments(case_id,author_id,body) values('30000000-0000-0000-0000-000000000001',auth.uid(),'Contribuição ' || i); end loop;
  begin
    insert into public.case_comments(case_id,author_id,body) values('30000000-0000-0000-0000-000000000001',auth.uid(),'Limite excedido');
    raise exception 'FAIL: rate limit not enforced';
  exception when raise_exception then if sqlerrm not like 'Muitas solicitações%' then raise; end if; end;
end; $$;
select public.open_direct_conversation_in_cohort('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001');
select pg_temp.assert_true((select count(*)=2 from public.conversation_members),'conversation roster has no recursive RLS');
select pg_temp.assert_true(public.open_direct_conversation_in_cohort('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001') = (select id from public.direct_conversations limit 1),'same pair reuses conversation');
insert into public.direct_messages(conversation_id,sender_id,body) select id,auth.uid(),'Mensagem privada' from public.direct_conversations;
insert into public.user_blocks(blocker_id,blocked_id) values(auth.uid(),'10000000-0000-0000-0000-000000000002');
select pg_temp.assert_true((select count(*)=0 from public.direct_messages),'blocking removes existing conversation access');
do $$ begin begin perform public.open_direct_conversation_in_cohort('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001'); raise exception 'FAIL: blocked conversation opened'; exception when insufficient_privilege then null; end; end; $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
insert into public.case_comments(case_id,author_id,body) values('30000000-0000-0000-0000-000000000001',auth.uid(),'Contribuição de colega bloqueado');
select pg_temp.assert_true((select count(*)=0 from public.direct_messages),'blocked peer also loses conversation access');
select pg_temp.assert_true((select count(*)=0 from public.user_blocks),'peer cannot inspect who blocked them');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.assert_true((select count(*)=0 from public.case_comments where author_id='10000000-0000-0000-0000-000000000002'),'blocked peer comments hidden');
delete from public.user_blocks where blocked_id='10000000-0000-0000-0000-000000000002';
select pg_temp.assert_true((select count(*)=1 from public.direct_messages),'unblocking restores conversation');
insert into public.account_deletion_requests(user_id) values(auth.uid());
select pg_temp.assert_true((select status='pending' from public.account_deletion_requests),'account deletion request registered');
insert into public.content_reports(id,case_id,reporter_id,reason) values('50000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',auth.uid(),'Solicito revisão educacional');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select pg_temp.assert_true((select count(*)=0 from public.clinical_cases),'inactive reads no cases');
select pg_temp.assert_true((select count(*)=0 from public.direct_messages),'inactive reads no messages');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select pg_temp.assert_true((select count(*)=0 from public.clinical_cases),'other cohort admin reads no cases');
select pg_temp.assert_true((select count(*)=0 from public.content_reports),'other cohort admin reads no reports');
select pg_temp.assert_true((select count(*)=0 from storage.objects),'other cohort cannot read media');
do $$ begin begin perform public.open_direct_conversation_in_cohort('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002'); raise exception 'FAIL: cross-cohort conversation'; exception when insufficient_privilege then null; end; end; $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin begin insert into storage.objects(bucket_id,name,owner_id) values('case-media','20000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/outsider.pdf',auth.uid()::text); raise exception 'FAIL: mentor uploaded into another authors case'; exception when insufficient_privilege then null; end; end; $$;
insert into public.mentor_summaries(case_id,mentor_id,body) values('30000000-0000-0000-0000-000000000001',auth.uid(),'Síntese de discussão educacional supervisionada.');
select pg_temp.assert_true((select status='resolvido' from public.clinical_cases limit 1),'mentor summary resolves case');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
update public.clinical_cases set status='oculto',hidden_at=now() where id='30000000-0000-0000-0000-000000000001';
update public.content_reports set resolved_by=auth.uid(),resolved_at=now() where id='50000000-0000-0000-0000-000000000001';
select pg_temp.assert_true((select count(*)>=2 from public.audit_logs),'moderation audit recorded');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select pg_temp.assert_true((select count(*)=0 from public.audit_logs),'audit isolated by cohort');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.assert_true((select count(*)=0 from public.clinical_cases),'hidden cases unavailable to author');
select pg_temp.assert_true((select count(*)=0 from storage.objects),'hidden case media unavailable to author');
reset role;
update public.memberships set active=false where user_id='10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.assert_true((select count(*)=0 from public.direct_messages),'revocation immediately removes message access');
select pg_temp.assert_true((select count(*)=0 from public.conversation_members),'revocation removes roster access');
rollback;
