-- Apply after schema.sql. This migration is additive and safe to record in Supabase migrations.
create table if not exists public.legal_documents (
  slug text primary key check (slug in ('terms', 'privacy')),
  version text not null,
  title text not null,
  body_markdown text not null,
  published_at timestamptz not null default now(),
  active boolean not null default true
);

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_slug text not null references public.legal_documents(slug),
  document_version text not null,
  accepted_at timestamptz not null default now(),
  ip_hash text,
  unique (user_id, document_slug, document_version)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(action) between 3 and 120),
  target_type text not null check (char_length(target_type) between 2 and 80),
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  recipient_email text not null,
  event_kind public.notification_kind not null,
  subject text not null,
  html text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider_id text,
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.legal_documents enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.audit_logs enable row level security;
alter table public.email_deliveries enable row level security;

create policy "anyone reads active legal documents" on public.legal_documents for select using (active);
create policy "users read own legal acceptances" on public.legal_acceptances for select using (user_id = auth.uid());
create policy "users accept legal documents" on public.legal_acceptances for insert with check (user_id = auth.uid());
create policy "admins read audit logs" on public.audit_logs for select using (exists (select 1 from public.memberships m where m.user_id = auth.uid() and m.active and m.role = 'admin'));
create policy "admins read delivery status" on public.email_deliveries for select using (exists (select 1 from public.memberships m where m.user_id = auth.uid() and m.active and m.role = 'admin'));

create or replace function public.open_direct_conversation(target_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_cohort uuid; conversation uuid;
begin
  select mine.cohort_id into target_cohort
    from public.memberships mine join public.memberships theirs on theirs.cohort_id = mine.cohort_id
    where mine.user_id = auth.uid() and theirs.user_id = target_user and mine.active and theirs.active
    order by mine.created_at limit 1;
  if target_cohort is null or target_user = auth.uid() then raise exception 'Participantes não compartilham uma turma ativa'; end if;
  select dc.id into conversation from public.direct_conversations dc
    where dc.cohort_id = target_cohort
      and (select count(*) from public.conversation_members cm where cm.conversation_id = dc.id) = 2
      and exists (select 1 from public.conversation_members cm where cm.conversation_id = dc.id and cm.user_id = auth.uid())
      and exists (select 1 from public.conversation_members cm where cm.conversation_id = dc.id and cm.user_id = target_user)
    limit 1;
  if conversation is not null then return conversation; end if;
  insert into public.direct_conversations (cohort_id) values (target_cohort) returning id into conversation;
  insert into public.conversation_members (conversation_id, user_id) values (conversation, auth.uid()), (conversation, target_user);
  return conversation;
end; $$;

create or replace function public.queue_email_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare address text;
begin
  select u.email into address from auth.users u where u.id = new.recipient_id;
  if address is not null then
    insert into public.email_deliveries (recipient_id, recipient_email, event_kind, subject, html)
    values (new.recipient_id, address, new.kind, new.title, '<p>' || coalesce(new.body, '') || '</p>');
  end if;
  return new;
end; $$;
drop trigger if exists notification_queues_email on public.notifications;
create trigger notification_queues_email after insert on public.notifications for each row execute procedure public.queue_email_notification();

create or replace function public.notify_mentor_summary()
returns trigger language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  select author_id into author from public.clinical_cases where id = new.case_id;
  if author is not null and author <> new.mentor_id then
    insert into public.notifications (recipient_id, kind, title, body, href)
    values (author, 'sintese', 'Seu caso recebeu uma síntese', left(new.body, 180), '/?case=' || new.case_id);
  end if;
  return new;
end; $$;
drop trigger if exists mentor_summary_creates_notification on public.mentor_summaries;
create trigger mentor_summary_creates_notification after insert on public.mentor_summaries for each row execute procedure public.notify_mentor_summary();

create or replace function public.notify_direct_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_id, kind, title, body, href)
    select cm.user_id, 'mensagem', 'Nova mensagem privada', left(new.body, 180), '/?conversation=' || new.conversation_id
    from public.conversation_members cm where cm.conversation_id = new.conversation_id and cm.user_id <> new.sender_id;
  return new;
end; $$;
drop trigger if exists direct_message_creates_notification on public.direct_messages;
create trigger direct_message_creates_notification after insert on public.direct_messages for each row execute procedure public.notify_direct_message();

create or replace function public.log_admin_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.memberships m where m.user_id = auth.uid() and m.active and m.role = 'admin') then
    insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
    values (auth.uid(), tg_op, tg_table_name, coalesce(to_jsonb(new)->>'user_id', to_jsonb(old)->>'user_id', to_jsonb(new)->>'id', to_jsonb(old)->>'id'), '{}'::jsonb);
  end if;
  return coalesce(new, old);
end; $$;
drop trigger if exists memberships_audit on public.memberships;
create trigger memberships_audit after insert or update or delete on public.memberships for each row execute procedure public.log_admin_change();
drop trigger if exists cases_audit on public.clinical_cases;
create trigger cases_audit after update on public.clinical_cases for each row execute procedure public.log_admin_change();

insert into public.legal_documents (slug, version, title, body_markdown)
values
('terms', 'provisional-2026-09', 'Termos de Uso Provisórios', '# Termos de Uso\n\nEste é um texto provisório. A comunidade é educacional, não substitui julgamento clínico individual e requer dados anonimizados.'),
('privacy', 'provisional-2026-09', 'Política de Privacidade Provisória', '# Política de Privacidade\n\nEste é um texto provisório. Publique apenas dados anonimizados e solicite remoção pelo canal de suporte.')
on conflict (slug) do nothing;
