-- Apply after schema.sql and 20260913_production_hardening.sql.
-- Keep authorization in Postgres: web and mobile share the same rules.
begin;

create or replace function public.is_active_conversation_member(target_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members cm join public.direct_conversations dc on dc.id = cm.conversation_id
    join public.memberships m on m.cohort_id = dc.cohort_id and m.user_id = cm.user_id
    where cm.conversation_id = target_conversation and cm.user_id = auth.uid() and m.active);
$$;
drop policy if exists "conversation members view conversation" on public.direct_conversations;
create policy "conversation members view conversation" on public.direct_conversations for select to authenticated using (public.is_active_conversation_member(id));
drop policy if exists "conversation members view roster" on public.conversation_members;
create policy "conversation members view roster" on public.conversation_members for select to authenticated using (public.is_active_conversation_member(conversation_id));
drop policy if exists "conversation members view messages" on public.direct_messages;
create policy "conversation members view messages" on public.direct_messages for select to authenticated using (public.is_active_conversation_member(conversation_id));
drop policy if exists "conversation members send messages" on public.direct_messages;
create policy "conversation members send messages" on public.direct_messages for insert to authenticated with check (sender_id = auth.uid() and public.is_active_conversation_member(conversation_id));

create or replace function public.open_direct_conversation_in_cohort(target_user uuid, target_cohort uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare conversation uuid;
begin
  if auth.uid() is null or target_user = auth.uid() or not public.is_active_member(target_cohort)
    or not exists (select 1 from public.memberships where cohort_id = target_cohort and user_id = target_user and active)
    then raise exception 'Participantes não compartilham a turma ativa' using errcode = '42501'; end if;
  -- Serialize the same pair/cohort to prevent duplicate threads on concurrent taps.
  perform pg_advisory_xact_lock(hashtextextended(target_cohort::text || least(auth.uid()::text, target_user::text) || greatest(auth.uid()::text, target_user::text), 0));
  select dc.id into conversation from public.direct_conversations dc where dc.cohort_id = target_cohort
    and (select count(*) from public.conversation_members cm where cm.conversation_id = dc.id) = 2
    and exists (select 1 from public.conversation_members cm where cm.conversation_id = dc.id and cm.user_id = auth.uid())
    and exists (select 1 from public.conversation_members cm where cm.conversation_id = dc.id and cm.user_id = target_user) limit 1;
  if conversation is null then
    insert into public.direct_conversations(cohort_id) values(target_cohort) returning id into conversation;
    insert into public.conversation_members(conversation_id, user_id) values(conversation, auth.uid()), (conversation, target_user);
  end if;
  return conversation;
end; $$;
create or replace function public.open_direct_conversation(target_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare selected_cohort uuid;
begin
  select mine.cohort_id into selected_cohort from public.memberships mine join public.memberships theirs using(cohort_id)
    where mine.user_id = auth.uid() and theirs.user_id = target_user and mine.active and theirs.active order by mine.created_at limit 1;
  return public.open_direct_conversation_in_cohort(target_user, selected_cohort);
end; $$;
revoke all on function public.open_direct_conversation_in_cohort(uuid, uuid) from public, anon;
grant execute on function public.open_direct_conversation_in_cohort(uuid, uuid) to authenticated;
revoke all on function public.open_direct_conversation(uuid) from public, anon;
grant execute on function public.open_direct_conversation(uuid) to authenticated;

drop policy if exists "authors delete own open cases" on public.clinical_cases;
create policy "authors delete own open cases" on public.clinical_cases for delete to authenticated using (public.is_active_member(cohort_id) and ((author_id = auth.uid() and status = 'em_discussao') or public.has_cohort_role(cohort_id, array['admin']::public.member_role[])));
drop policy if exists "authors delete own attachment" on public.case_attachments;
create policy "authors delete own attachment" on public.case_attachments for delete to authenticated using (exists(select 1 from public.clinical_cases c where c.id = case_id and public.is_active_member(c.cohort_id) and (uploader_id = auth.uid() or public.has_cohort_role(c.cohort_id,array['admin']::public.member_role[]))));
drop policy if exists "authors edit comments" on public.case_comments;
create policy "authors edit comments" on public.case_comments for update to authenticated using (author_id = auth.uid() and exists(select 1 from public.clinical_cases c where c.id = case_id and public.is_active_member(c.cohort_id) and c.status <> 'oculto')) with check (author_id = auth.uid() and exists(select 1 from public.clinical_cases c where c.id = case_id and public.is_active_member(c.cohort_id) and c.status <> 'oculto'));
drop policy if exists "authors delete comments" on public.case_comments;
create policy "authors delete comments" on public.case_comments for delete to authenticated using (exists(select 1 from public.clinical_cases c where c.id = case_id and public.is_active_member(c.cohort_id) and (author_id = auth.uid() or public.has_cohort_role(c.cohort_id,array['admin']::public.member_role[]))));
drop policy if exists "mentors update own summaries" on public.mentor_summaries;
create policy "mentors update own summaries" on public.mentor_summaries for update to authenticated using (mentor_id = auth.uid() and exists(select 1 from public.clinical_cases c where c.id = case_id and c.status <> 'oculto' and public.has_cohort_role(c.cohort_id,array['mentor','admin']::public.member_role[]))) with check (mentor_id = auth.uid());
drop policy if exists "authors add mentions" on public.comment_mentions;
create policy "authors add mentions" on public.comment_mentions for insert to authenticated with check (exists(select 1 from public.case_comments cm join public.clinical_cases c on c.id = cm.case_id join public.memberships target on target.cohort_id = c.cohort_id where cm.id = comment_id and cm.author_id = auth.uid() and public.is_active_member(c.cohort_id) and target.user_id = mentioned_user_id and target.active));

-- Foreign identifiers may not be rewritten to move content into another cohort.
create or replace function public.protect_content_identity() returns trigger language plpgsql set search_path = public as $$
declare field text;
begin
  foreach field in array tg_argv loop
    if to_jsonb(new)->field is distinct from to_jsonb(old)->field then raise exception 'Identidade de conteúdo imutável' using errcode = '42501'; end if;
  end loop;
  return new;
end; $$;
create trigger cases_protect_identity before update on public.clinical_cases for each row execute function public.protect_content_identity('id','cohort_id','author_id','created_at');
create trigger comments_protect_identity before update on public.case_comments for each row execute function public.protect_content_identity('id','case_id','author_id','created_at');
create trigger summaries_protect_identity before update on public.mentor_summaries for each row execute function public.protect_content_identity('id','case_id','mentor_id','created_at');

drop policy if exists "members upload cohort media" on storage.objects;
create policy "members upload cohort media" on storage.objects for insert to authenticated with check (bucket_id = 'case-media' and owner_id = auth.uid()::text and exists(select 1 from public.clinical_cases c where c.id::text = (storage.foldername(name))[2] and c.cohort_id::text = (storage.foldername(name))[1] and c.author_id = auth.uid() and c.status = 'em_discussao' and public.is_active_member(c.cohort_id)));
drop policy if exists "authors attach to own case" on public.case_attachments;
create policy "authors attach to own case" on public.case_attachments for insert to authenticated with check (uploader_id = auth.uid() and exists(select 1 from public.clinical_cases c where c.id = case_id and c.author_id = auth.uid() and c.status = 'em_discussao' and public.is_active_member(c.cohort_id) and storage_path like c.cohort_id::text || '/' || c.id::text || '/%'));

drop policy if exists "admins resolve reports" on public.content_reports;
create policy "admins resolve reports" on public.content_reports for update to authenticated using (exists(select 1 from public.clinical_cases c where c.id = case_id and public.has_cohort_role(c.cohort_id,array['admin']::public.member_role[])) or exists(select 1 from public.case_comments cm join public.clinical_cases c on c.id = cm.case_id where cm.id = comment_id and public.has_cohort_role(c.cohort_id,array['admin']::public.member_role[]))) with check (resolved_by = auth.uid() and resolved_at is not null);
create trigger reports_protect_identity before update on public.content_reports for each row execute function public.protect_content_identity('id','case_id','comment_id','reporter_id','reason','created_at');

drop policy if exists "users accept legal documents" on public.legal_acceptances;
create policy "users accept legal documents" on public.legal_acceptances for insert to authenticated with check (user_id = auth.uid() and exists(select 1 from public.legal_documents d where d.slug = document_slug and d.version = document_version and d.active));
create or replace function public.has_current_legal_consent() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.legal_documents where active) and not exists(select 1 from public.legal_documents d where d.active and not exists(select 1 from public.legal_acceptances a where a.user_id = auth.uid() and a.document_slug = d.slug and a.document_version = d.version));
$$;
drop policy if exists "members create own cases" on public.clinical_cases;
create policy "members create own cases" on public.clinical_cases for insert to authenticated with check (author_id = auth.uid() and public.is_active_member(cohort_id) and status = 'em_discussao' and privacy_acknowledged_at is not null and public.has_current_legal_consent());

-- Durable fixed-window rate limits also cover direct requests bypassing the clients.
create table if not exists public.write_rate_limits(user_id uuid not null references auth.users(id) on delete cascade, operation text not null, window_start timestamptz not null, count integer not null, primary key(user_id, operation));
alter table public.write_rate_limits enable row level security;
revoke all on public.write_rate_limits from anon, authenticated;
create or replace function public.enforce_write_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
declare attempts integer; limit_count integer := tg_argv[0]::integer;
begin
  if auth.uid() is null then return new; end if;
  insert into public.write_rate_limits(user_id, operation, window_start, count) values(auth.uid(), tg_table_name, date_trunc('minute', now()), 1)
    on conflict(user_id, operation) do update set count = case when write_rate_limits.window_start = excluded.window_start then write_rate_limits.count + 1 else 1 end, window_start = excluded.window_start returning count into attempts;
  if attempts > limit_count then raise exception 'Muitas solicitações. Tente novamente em um minuto.' using errcode = 'P0001'; end if;
  return new;
end; $$;
create trigger cases_rate_limit before insert on public.clinical_cases for each row execute function public.enforce_write_rate_limit('5');
create trigger comments_rate_limit before insert on public.case_comments for each row execute function public.enforce_write_rate_limit('20');
create trigger messages_rate_limit before insert on public.direct_messages for each row execute function public.enforce_write_rate_limit('30');
create trigger reports_rate_limit before insert on public.content_reports for each row execute function public.enforce_write_rate_limit('5');

-- Historical audit rows without a cohort are retained but only accessible server-side.
alter table public.audit_logs add column if not exists cohort_id uuid references public.cohorts(id) on delete set null;
drop policy if exists "admins read audit logs" on public.audit_logs;
create policy "admins read audit logs" on public.audit_logs for select to authenticated using (public.has_cohort_role(cohort_id,array['admin']::public.member_role[]));
drop policy if exists "admins read delivery status" on public.email_deliveries;
-- Delivery addresses and provider payloads are server-only, not shared across admins.
create or replace function public.log_admin_change() returns trigger language plpgsql security definer set search_path = public as $$
declare row_data jsonb := coalesce(to_jsonb(new),to_jsonb(old)); cohort uuid;
begin
  cohort := (row_data->>'cohort_id')::uuid;
  if tg_table_name = 'content_reports' then
    select c.cohort_id into cohort from public.clinical_cases c where c.id = (row_data->>'case_id')::uuid;
    if cohort is null then select c.cohort_id into cohort from public.case_comments cm join public.clinical_cases c on c.id = cm.case_id where cm.id = (row_data->>'comment_id')::uuid; end if;
  end if;
  if auth.uid() is not null and public.has_cohort_role(cohort,array['admin']::public.member_role[]) then
    insert into public.audit_logs(actor_id,cohort_id,action,target_type,target_id,metadata) values(auth.uid(),cohort,tg_op,tg_table_name,coalesce(row_data->>'user_id',row_data->>'id'), jsonb_build_object('role',row_data->>'role','active',row_data->'active','status',row_data->>'status'));
  end if;
  return coalesce(new,old);
end; $$;
create trigger reports_audit after update on public.content_reports for each row execute function public.log_admin_change();

-- Notifications must not copy clinical discussions/private messages into outbound email.
create or replace function public.queue_email_notification() returns trigger language plpgsql security definer set search_path = public as $$
declare address text;
begin
  select u.email into address from auth.users u where u.id = new.recipient_id;
  if address is not null then insert into public.email_deliveries(recipient_id,recipient_email,event_kind,subject,html) values(new.recipient_id,address,new.kind,'Você tem uma atualização no Coopera Kós','<p>Entre no Coopera Kós para consultar sua atualização com segurança.</p>'); end if;
  return new;
end; $$;
commit;
