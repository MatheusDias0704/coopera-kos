import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createCoopera } from "@coopera/data-supabase";
import type { CaseRecord } from "@coopera/domain";
import type { ActiveMember, AppNotification, CaseComment, ClinicalCase, DirectMessage, MessagePerson } from "./models";

export const LEGAL_CONSENT_REQUIRED = "LEGAL_CONSENT_REQUIRED";
export type LegalStatus = { documents: Array<{ slug: string; version: string; title: string }>; accepted: boolean };

export type MobileClient = {
  isConfigured(): boolean;
  signIn(email: string, password: string): Promise<ActiveMember>;
  requestPasswordReset(email: string): Promise<void>;
  register(input: { name: string; inviteCode: string; email: string; password: string }): Promise<ActiveMember>;
  currentMember(): Promise<ActiveMember | null>;
  logout(): Promise<void>;
  legalStatus(): Promise<LegalStatus>;
  acceptLegal(): Promise<void>;
  listCases(): Promise<ClinicalCase[]>;
  getCase(id: string): Promise<ClinicalCase | null>;
  listComments(caseId: string): Promise<CaseComment[]>;
  comment(caseId: string, body: string): Promise<void>;
  react(caseId: string, active: boolean): Promise<void>;
  reactions(): Promise<string[]>;
  reportCase(caseId: string, reason: string): Promise<void>;
  attachmentUrl(path: string): Promise<string>;
  publishCase(input: { title: string; context: string; question: string; mediaUri?: string }): Promise<void>;
  people(): Promise<MessagePerson[]>;
  openConversation(userId: string): Promise<string>;
  listMessages(conversationId: string): Promise<DirectMessage[]>;
  sendMessage(conversationId: string, body: string): Promise<void>;
  blockUser(userId: string): Promise<void>;
  unblockUser(userId: string): Promise<void>;
  blockedUsers(): Promise<Array<{ blockedId: string; createdAt: string }>>;
  listNotifications(): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  requestAccountDeletion(): Promise<void>;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serverUrl = process.env.EXPO_PUBLIC_COOPERA_SERVER_URL;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;
const coopera = supabase ? createCoopera(supabase, { serverUrl }) : null;

let activeMember: ActiveMember | null = null;
let activeCohortId: string | null = null;

function ensureConfigured() {
  if (!coopera || !supabase) {
    throw new Error("App sem Supabase configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no EAS.");
  }
  return { coopera, supabase };
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CK";
}

function labelDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function mapCase(record: CaseRecord): ClinicalCase {
  return {
    id: record.id,
    code: record.code,
    title: record.title,
    author: record.profiles?.full_name ?? "Participante Kós",
    initials: record.profiles?.initials ?? initials(record.profiles?.full_name ?? "Participante Kós"),
    createdAt: labelDate(record.created_at),
    status: record.status,
    excerpt: record.clinical_context ?? record.body ?? "Caso publicado para discussão educacional.",
    question: record.community_question,
    tags: record.tags ?? [],
    comments: record.case_comments?.[0]?.count ?? 0,
    reactions: record.case_reactions?.[0]?.count ?? 0,
    authorId: record.author_id,
    mode: record.mode,
    assessment: record.assessment,
    body: record.body,
    attachments: (record.case_attachments ?? []).map((attachment) => ({ id: attachment.id, filename: attachment.filename, kind: attachment.kind, storagePath: attachment.storage_path })),
    mentorSummary: record.mentor_summaries?.[0] ? { body: record.mentor_summaries[0].body, author: record.mentor_summaries[0].profiles?.full_name ?? "Mentor Kós", createdAt: labelDate(record.mentor_summaries[0].created_at) } : null,
  };
}

async function requireLegalConsent(userId: string) {
  const { coopera } = ensureConfigured();
  const consent = await coopera.legal.status(userId);
  if (!consent.documents.length) throw new Error("Documentos legais indisponíveis. Contate o suporte antes de usar a comunidade.");
  if (!consent.accepted) throw new Error(LEGAL_CONSENT_REQUIRED);
}

async function loadWorkspace(): Promise<ActiveMember> {
  const { coopera } = ensureConfigured();
  const session = await coopera.identity.session();
  if (!session?.user) throw new Error("Entre com seu e-mail convidado para continuar.");
  const workspace = await coopera.cohorts.workspace(session.user.id);
  if (!workspace.membership?.active) throw new Error("Seu usuário não possui participação ativa em uma turma.");
  activeCohortId = workspace.membership.cohort_id;
  activeMember = {
    id: session.user.id,
    name: workspace.profile?.full_name ?? session.user.email ?? "Participante Kós",
    initials: workspace.profile?.initials ?? initials(workspace.profile?.full_name ?? session.user.email ?? "Participante Kós"),
    role: workspace.membership.role,
    cohortName: workspace.membership.cohorts?.name ?? "Turma Kós",
  };
  await requireLegalConsent(session.user.id);
  return activeMember;
}

async function mediaFromUri(uri: string) {
  const response = await fetch(uri);
  const body = await response.blob();
  const rawName = uri.split("/").pop()?.split("?")[0] || "anexo.jpg";
  const filename = rawName.includes(".") ? rawName : `${rawName}.jpg`;
  const extension = filename.split(".").pop()?.toLowerCase();
  const type = body.type || (extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg");
  return { name: filename, type, size: body.size, body };
}

export const mobileClient: MobileClient = {
  isConfigured() { return Boolean(coopera && supabase); },
  async signIn(email, password) {
    const { coopera } = ensureConfigured();
    await coopera.identity.login(email, password);
    return loadWorkspace();
  },
  async requestPasswordReset(email) {
    const { coopera } = ensureConfigured();
    await coopera.identity.resetPassword(email, "cooperakos://welcome");
  },
  async register() {
    throw new Error("O acesso é fechado. Use o link seguro de convite recebido por e-mail; depois entre com e-mail e senha.");
  },
  async currentMember() {
    if (activeMember) return activeMember;
    try { return await loadWorkspace(); } catch { return null; }
  },
  async logout() {
    const { coopera } = ensureConfigured();
    activeMember = null;
    activeCohortId = null;
    await coopera.identity.logout();
  },
  async legalStatus() {
    const { coopera } = ensureConfigured();
    const session = await coopera.identity.session();
    if (!session?.user) throw new Error("Entre para revisar os documentos.");
    return coopera.legal.status(session.user.id);
  },
  async acceptLegal() {
    const { coopera } = ensureConfigured();
    await coopera.legal.accept();
    await loadWorkspace();
  },
  async listCases() {
    if (!activeCohortId) {
      const member = await this.currentMember();
      if (!member || !activeCohortId) return [];
    }
    const { coopera } = ensureConfigured();
    return (await coopera.cases.list(activeCohortId)).map(mapCase);
  },
  async getCase(id) {
    const { coopera } = ensureConfigured();
    const record = await coopera.cases.get(id);
    return record ? mapCase(record) : null;
  },
  async listComments(caseId) {
    const { coopera } = ensureConfigured();
    return (await coopera.discussion.list(caseId)).map((comment) => ({ id: comment.id, body: comment.body, createdAt: labelDate(comment.created_at), author: comment.profiles?.full_name ?? "Participante Kós", initials: comment.profiles?.initials ?? initials(comment.profiles?.full_name ?? "Participante Kós") }));
  },
  async comment(caseId, body) { const { coopera } = ensureConfigured(); await coopera.discussion.comment(caseId, body); },
  async react(caseId, active) { const { coopera } = ensureConfigured(); await coopera.discussion.react(caseId, active); },
  async reactions() { const { coopera } = ensureConfigured(); return coopera.discussion.reactions(); },
  async reportCase(caseId, reason) { const { coopera } = ensureConfigured(); await coopera.discussion.report({ caseId, reason }); },
  async attachmentUrl(path) { const { coopera } = ensureConfigured(); return coopera.media.getTemporaryUrl(path); },
  async publishCase(input) {
    if (!activeCohortId) await loadWorkspace();
    if (!activeCohortId) throw new Error("Turma ativa indisponível.");
    const { coopera } = ensureConfigured();
    const created = await coopera.cases.create({
      cohortId: activeCohortId,
      title: input.title,
      mode: "texto_livre",
      body: input.context,
      clinicalContext: input.context,
      communityQuestion: input.question,
      tags: [],
      privacyAcknowledged: true,
    });
    if (input.mediaUri) await coopera.media.upload(created.id, activeCohortId, await mediaFromUri(input.mediaUri));
  },
  async listNotifications() {
    const { coopera } = ensureConfigured();
    try {
      return (await coopera.notifications.list()).map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body ?? "Abra o app para ver a atualização.",
        createdAt: labelDate(notification.created_at),
        read: Boolean(notification.read_at),
      }));
    } catch {
      return [];
    }
  },
  async markNotificationRead(id) { const { coopera } = ensureConfigured(); await coopera.notifications.markRead(id); },
  async people() {
    if (!activeCohortId) await loadWorkspace();
    if (!activeCohortId) return [];
    const { coopera } = ensureConfigured();
    return (await coopera.messaging.people(activeCohortId)).map((person) => ({ id: person.id, name: person.full_name, initials: person.initials || initials(person.full_name) }));
  },
  async openConversation(userId) {
    if (!activeCohortId) await loadWorkspace();
    if (!activeCohortId) throw new Error("Turma ativa indisponível.");
    const { coopera } = ensureConfigured();
    return coopera.messaging.openConversation(userId, activeCohortId);
  },
  async listMessages(conversationId) { const { coopera } = ensureConfigured(); return (await coopera.messaging.listMessages(conversationId)).map((message) => ({ id: message.id, senderId: message.sender_id, body: message.body, createdAt: labelDate(message.created_at) })); },
  async sendMessage(conversationId, body) { const { coopera } = ensureConfigured(); await coopera.messaging.sendMessage(conversationId, body); },
  async blockUser(userId) { const { coopera } = ensureConfigured(); await coopera.messaging.blockUser(userId); },
  async unblockUser(userId) { const { coopera } = ensureConfigured(); await coopera.messaging.unblockUser(userId); },
  async blockedUsers() { const { coopera } = ensureConfigured(); return (await coopera.messaging.blockedUsers()).map((block) => ({ blockedId: block.blocked_id, createdAt: labelDate(block.created_at) })); },
  async requestAccountDeletion() {
    const { coopera } = ensureConfigured();
    await coopera.identity.requestAccountDeletion();
  },
};
