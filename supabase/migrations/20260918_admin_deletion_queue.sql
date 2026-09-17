-- Queue review only; account erasure remains a server-side operation.
begin;
create policy "cohort admins read deletion queue" on public.account_deletion_requests
for select to authenticated using (exists (
  select 1 from public.memberships target where target.user_id = account_deletion_requests.user_id
  and public.has_cohort_role(target.cohort_id, array['admin']::public.member_role[])
));
create policy "cohort admins review deletion queue" on public.account_deletion_requests
for update to authenticated using (exists (
  select 1 from public.memberships target where target.user_id = account_deletion_requests.user_id
  and public.has_cohort_role(target.cohort_id, array['admin']::public.member_role[])
)) with check (status in ('processing','completed') and exists (
  select 1 from public.memberships target where target.user_id = account_deletion_requests.user_id
  and public.has_cohort_role(target.cohort_id, array['admin']::public.member_role[])
));
create trigger deletion_requests_protect_identity before update on public.account_deletion_requests
for each row execute function public.protect_content_identity('user_id','requested_at');
commit;
