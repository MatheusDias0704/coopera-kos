-- User-controlled blocking applies immediately to content and private conversations.
begin;
create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
create policy "users see own block list" on public.user_blocks for select to authenticated using (blocker_id = auth.uid());
create policy "users block active peers" on public.user_blocks for insert to authenticated with check (blocker_id = auth.uid() and public.shares_active_cohort(blocked_id));
create policy "users unblock peers" on public.user_blocks for delete to authenticated using (blocker_id = auth.uid());

create or replace function public.has_blocked_user(target_user uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_blocks where blocker_id = auth.uid() and blocked_id = target_user);
$$;
create or replace function public.has_peer_block(target_user uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_blocks where (blocker_id = auth.uid() and blocked_id = target_user) or (blocked_id = auth.uid() and blocker_id = target_user));
$$;
revoke all on function public.has_blocked_user(uuid), public.has_peer_block(uuid) from public, anon;
grant execute on function public.has_blocked_user(uuid), public.has_peer_block(uuid) to authenticated;

create or replace function public.is_active_conversation_member(target_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members cm join public.direct_conversations dc on dc.id = cm.conversation_id
    join public.memberships m on m.cohort_id = dc.cohort_id and m.user_id = cm.user_id
    where cm.conversation_id = target_conversation and cm.user_id = auth.uid() and m.active)
  and not exists(select 1 from public.conversation_members peer where peer.conversation_id = target_conversation and public.has_peer_block(peer.user_id));
$$;

create or replace function public.open_direct_conversation_in_cohort(target_user uuid, target_cohort uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare conversation uuid;
begin
  if auth.uid() is null or target_user = auth.uid() or public.has_peer_block(target_user) or not public.is_active_member(target_cohort)
    or not exists (select 1 from public.memberships where cohort_id = target_cohort and user_id = target_user and active)
    then raise exception 'Conversa indisponível para estes participantes' using errcode = '42501'; end if;
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

drop policy if exists "members view visible cases" on public.clinical_cases;
create policy "members view visible cases" on public.clinical_cases for select to authenticated using (public.is_active_member(cohort_id) and ((status <> 'oculto' and not public.has_blocked_user(author_id)) or public.has_cohort_role(cohort_id,array['admin']::public.member_role[])));
drop policy if exists "members view comments" on public.case_comments;
create policy "members view comments" on public.case_comments for select to authenticated using (exists(select 1 from public.clinical_cases c where c.id = case_id and public.is_active_member(c.cohort_id) and (not public.has_blocked_user(case_comments.author_id) or public.has_cohort_role(c.cohort_id,array['admin']::public.member_role[]))));
drop policy if exists "members view summaries" on public.mentor_summaries;
create policy "members view summaries" on public.mentor_summaries for select to authenticated using (exists(select 1 from public.clinical_cases c where c.id = case_id and public.is_active_member(c.cohort_id) and (not public.has_blocked_user(mentor_id) or public.has_cohort_role(c.cohort_id,array['admin']::public.member_role[]))));

-- Users can request deletion within the app. The operation is reviewed to handle
-- lawful retention and shared educational content; it does not promise instant erasure.
create table public.account_deletion_requests (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check(status in ('pending','processing','completed'))
);
alter table public.account_deletion_requests enable row level security;
create policy "users view own deletion request" on public.account_deletion_requests for select to authenticated using(user_id = auth.uid());
create policy "users request account deletion" on public.account_deletion_requests for insert to authenticated with check(user_id = auth.uid() and status = 'pending');
commit;
