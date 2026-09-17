import type { SupabaseClient, Session } from "@supabase/supabase-js";
import { AdminOperations, ClinicalCases, Discussion, DomainError, IdentityAccess, LegalConsent, Messaging, PrivateMedia, text } from "@coopera/domain";
import type { AttachmentInput, CaseInput, CaseRecord, Comment, DirectMessage, LegalAcceptance, LegalDocument, MemberRecord, Membership, Notification, Profile, Role } from "@coopera/domain";

const profileFields = "id,full_name,initials,avatar_url";
const caseFields = `id,code,title,mode,status,clinical_context,assessment,body,template_name,community_question,tags,created_at,resolved_at,author_id,profiles!clinical_cases_author_id_fkey(${profileFields}),mentor_summaries(id,body,created_at,profiles!mentor_summaries_mentor_id_fkey(${profileFields})),case_attachments(id,filename,kind,storage_path),case_comments(count),case_reactions(count)`;
function unwrap<T extends { data: unknown; error: { message: string } | null }>(result: T): T["data"] { if (result.error) throw new Error(result.error.message); return result.data; }

/** All remote operations use the caller's authenticated client. Database RLS remains authoritative. */
export function createCoopera(client: SupabaseClient, options: { serverUrl?: string; fetch?: typeof fetch; randomId?: () => string } = {}) {
  const randomId = options.randomId ?? (() => globalThis.crypto.randomUUID());
  const currentUser = async () => { const result = await client.auth.getUser(); if (result.error || !result.data.user) throw new DomainError("unauthenticated", "Entre para continuar."); return result.data.user; };
  const request = async (path: string, method: string, body: unknown) => {
    const session = unwrap(await client.auth.getSession()).session;
    if (!session) throw new DomainError("unauthenticated", "Entre para continuar.");
    const response = await (options.fetch ?? fetch)(`${options.serverUrl ?? ""}${path}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
    return result;
  };
  const legal = {
    async requiredDocuments(): Promise<LegalDocument[]> { return unwrap(await client.from("legal_documents").select("slug,version,title").eq("active", true)) ?? []; },
    async status(userId: string) { const [documents, result] = await Promise.all([legal.requiredDocuments(), client.from("legal_acceptances").select("document_slug,document_version").eq("user_id", userId)]); const acceptances = (unwrap(result) ?? []) as LegalAcceptance[]; return { documents, accepted: LegalConsent.hasAcceptedCurrentVersions(documents, acceptances) }; },
    async accept() { const user = await currentUser(); const documents = await legal.requiredDocuments(); if (!documents.length) throw new DomainError("not_ready", "Documentos legais indisponíveis."); unwrap(await client.from("legal_acceptances").upsert(documents.map(document => ({ user_id: user.id, document_slug: document.slug, document_version: document.version })), { onConflict: "user_id,document_slug,document_version", ignoreDuplicates: true })); },
  };
  return {
    identity: {
      async session() { return unwrap(await client.auth.getSession()).session; },
      async login(email: string, password: string) { return unwrap(await client.auth.signInWithPassword(IdentityAccess.credentials(email, password))).session; },
      async logout() { const result = await client.auth.signOut(); if (result.error) throw result.error; },
      async resetPassword(email: string, redirectTo: string) { unwrap(await client.auth.resetPasswordForEmail(IdentityAccess.credentials(email, "reset").email, { redirectTo })); },
      async updatePassword(password: string) { return unwrap(await client.auth.updateUser({ password: IdentityAccess.password(password) })); },
      async signInWithGoogle(redirectTo: string) { return unwrap(await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })); },
      async setSession(tokens: { access_token: string; refresh_token: string }) { return unwrap(await client.auth.setSession(tokens)); },
      async requestAccountDeletion() { const user = await currentUser(); unwrap(await client.from("account_deletion_requests").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true })); },
      async accountDeletionStatus() { const user = await currentUser(); return unwrap(await client.from("account_deletion_requests").select("requested_at,status").eq("user_id", user.id).maybeSingle()); },
      onSessionChange(callback: (session: Session | null) => void) { const { data } = client.auth.onAuthStateChange((_event, session) => callback(session)); return () => data.subscription.unsubscribe(); },
    },
    cohorts: {
      async workspace(userId: string): Promise<{ profile: Profile | null; membership: Membership | null }> { const [profile, membership] = await Promise.all([client.from("profiles").select(profileFields).eq("id", userId).maybeSingle(), client.from("memberships").select("cohort_id,role,active,cohorts(id,name)").eq("user_id", userId).eq("active", true).order("created_at").limit(1).maybeSingle()]); return { profile: unwrap(profile) as Profile | null, membership: unwrap(membership) as unknown as Membership | null }; },
    },
    cases: {
      async list(cohortId: string): Promise<CaseRecord[]> { return (unwrap(await client.from("clinical_cases").select(caseFields).eq("cohort_id", cohortId).order("created_at", { ascending: false }).limit(100)) ?? []) as unknown as CaseRecord[]; },
      async create(input: CaseInput): Promise<{ id: string }> { const fields = ClinicalCases.prepare(input); const user = await currentUser(); const consent = await legal.status(user.id); if (!consent.accepted) throw new DomainError("forbidden", "Aceite os documentos vigentes antes de publicar."); const created = unwrap(await client.from("clinical_cases").insert({ ...fields, author_id: user.id, code: `CASO-${new Date().getFullYear()}-${randomId().slice(0, 8).toUpperCase()}`, privacy_acknowledged_at: new Date().toISOString() }).select("id").single()); if (!created) throw new Error("Não foi possível publicar o caso."); return created; },
      async edit(caseId: string, input: CaseInput) { const user = await currentUser(); const fields = ClinicalCases.prepare(input); const result = unwrap(await client.from("clinical_cases").update(fields).eq("id", caseId).eq("author_id", user.id).eq("status", "em_discussao").select("id").single()); return result; },
      async resolve(caseId: string, body: string) { const user = await currentUser(); unwrap(await client.from("mentor_summaries").insert({ case_id: caseId, mentor_id: user.id, body: Discussion.summary(body) })); },
      async hide(caseId: string) { unwrap(await client.from("clinical_cases").update({ status: "oculto", hidden_at: new Date().toISOString() }).eq("id", caseId).select("id").single()); },
    },
    discussion: {
      async list(caseId: string): Promise<Comment[]> { return (unwrap(await client.from("case_comments").select(`id,body,created_at,profiles!case_comments_author_id_fkey(${profileFields})`).eq("case_id", caseId).order("created_at")) ?? []) as unknown as Comment[]; },
      async comment(caseId: string, body: string) { const user = await currentUser(); return unwrap(await client.from("case_comments").insert({ case_id: caseId, author_id: user.id, body: Discussion.comment(body) }).select("id").single()); },
      async mention(commentId: string, userId: string) { unwrap(await client.from("comment_mentions").upsert({ comment_id: commentId, mentioned_user_id: userId }, { ignoreDuplicates: true })); },
      async reactions(): Promise<string[]> { const user = await currentUser(); return (unwrap(await client.from("case_reactions").select("case_id").eq("user_id", user.id)) ?? []).map(row => row.case_id); },
      async react(caseId: string, active: boolean) { const user = await currentUser(); unwrap(active ? await client.from("case_reactions").upsert({ case_id: caseId, user_id: user.id }, { ignoreDuplicates: true }) : await client.from("case_reactions").delete().eq("case_id", caseId).eq("user_id", user.id)); },
      async report(input: { caseId?: string; commentId?: string; reason: string }) { const user = await currentUser(); unwrap(await client.from("content_reports").insert({ ...Discussion.report(input), reporter_id: user.id })); },
    },
    media: {
      async upload(caseId: string, cohortId: string, file: AttachmentInput) { const metadata = PrivateMedia.validate(file); const user = await currentUser(); const path = `${cohortId}/${caseId}/${randomId()}-${metadata.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`; unwrap(await client.storage.from("case-media").upload(path, file.body, { contentType: file.type, upsert: false })); const registration = await client.from("case_attachments").insert({ ...metadata, case_id: caseId, uploader_id: user.id, storage_path: path }); if (registration.error) { const cleanup = await client.storage.from("case-media").remove([path]); throw new Error(cleanup.error ? "Não foi possível registrar o anexo; limpeza pendente. Contate o suporte." : "Não foi possível registrar o anexo. Tente novamente."); } return { path }; },
      async getTemporaryUrl(path: string) { const result = unwrap(await client.storage.from("case-media").createSignedUrl(path, 60)); if (!result) throw new Error("Anexo indisponível."); return result.signedUrl; },
    },
    messaging: {
      async people(cohortId: string): Promise<Profile[]> { const user = await currentUser(); const rows = unwrap(await client.from("memberships").select(`user_id,profiles(${profileFields})`).eq("cohort_id", cohortId).eq("active", true).neq("user_id", user.id)); return (rows ?? []).map(row => row.profiles as unknown as Profile).filter(Boolean); },
      async openConversation(userId: string, cohortId: string): Promise<string> { return unwrap(await client.rpc("open_direct_conversation_in_cohort", { target_user: userId, target_cohort: cohortId })); },
      async listMessages(conversationId: string): Promise<DirectMessage[]> { return (unwrap(await client.from("direct_messages").select("id,sender_id,body,created_at").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(100)) ?? []).reverse(); },
      async sendMessage(conversationId: string, body: string) { const user = await currentUser(); unwrap(await client.from("direct_messages").insert({ conversation_id: conversationId, sender_id: user.id, body: Messaging.message(body) })); },
      async blockUser(userId: string) { const user = await currentUser(); unwrap(await client.from("user_blocks").upsert(Messaging.block(user.id, userId), { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true })); },
      async unblockUser(userId: string) { const user = await currentUser(); unwrap(await client.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", userId)); },
      async blockedUsers(): Promise<Array<{ blocked_id: string; created_at: string }>> { return unwrap(await client.from("user_blocks").select("blocked_id,created_at").order("created_at", { ascending: false })) ?? []; },
    },
    notifications: {
      async list(): Promise<Notification[]> { return unwrap(await client.from("notifications").select("id,title,body,href,created_at,read_at").order("created_at", { ascending: false }).limit(50)) ?? []; },
      async markRead(id: string) { unwrap(await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id)); },
    },
    legal,
    admin: {
      async listMembers(cohortId: string): Promise<MemberRecord[]> { return (unwrap(await client.from("memberships").select(`user_id,role,active,profiles(${profileFields})`).eq("cohort_id", cohortId).order("created_at")) ?? []) as unknown as MemberRecord[]; },
      async invite(input: { email: string; fullName: string; cohortId: string; role: Role }) { return request("/api/admin/invite", "POST", { ...input, email: IdentityAccess.credentials(input.email, "invite").email, fullName: text(input.fullName, "Nome", 2, 100) }); },
      async updateMembership(cohortId: string, userId: string, update: { role?: Role; active?: boolean }) { const actor = await currentUser(); AdminOperations.membership(actor.id, userId, update); return request("/api/admin/membership", "PATCH", { cohortId, userId, ...update }); },
      async reports() { return unwrap(await client.from("content_reports").select("id,case_id,comment_id,reason,created_at,resolved_at").is("resolved_at", null).order("created_at")) ?? []; },
      async reviewReport(reportId: string) { const user = await currentUser(); unwrap(await client.from("content_reports").update({ resolved_at: new Date().toISOString(), resolved_by: user.id }).eq("id", reportId).select("id").single()); },
      async restoreCase(caseId: string) { const result = unwrap(await client.from("mentor_summaries").select("id").eq("case_id", caseId).maybeSingle()); unwrap(await client.from("clinical_cases").update({ status: result ? "resolvido" : "em_discussao", hidden_at: null }).eq("id", caseId).select("id").single()); },
    },
  };
}
export type Coopera = ReturnType<typeof createCoopera>;
