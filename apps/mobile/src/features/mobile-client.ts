import { createClient } from "@supabase/supabase-js";
import { createCoopera } from "@coopera/data-supabase";
import type { CaseRecord } from "@coopera/domain";
import type { ActiveMember, AppNotification, ClinicalCase } from "./models";

export type MobileClient = {
  isConfigured(): boolean;
  signIn(email: string, password: string): Promise<ActiveMember>;
  requestPasswordReset(email: string): Promise<void>;
  register(input: { name: string; inviteCode: string; email: string; password: string }): Promise<ActiveMember>;
  currentMember(): Promise<ActiveMember | null>;
  logout(): Promise<void>;
  listCases(): Promise<ClinicalCase[]>;
  publishCase(input: { title: string; context: string; question: string; mediaUri?: string }): Promise<void>;
  listNotifications(): Promise<AppNotification[]>;
  requestAccountDeletion(): Promise<void>;
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serverUrl = process.env.EXPO_PUBLIC_COOPERA_SERVER_URL;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
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
  };
}

async function loadWorkspace(): Promise<ActiveMember> {
  const { coopera, supabase } = ensureConfigured();
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
  const { data: legalStatus } = await supabase.from("legal_documents").select("slug").eq("active", true).limit(1);
  if (legalStatus?.length) {
    const consent = await coopera.legal.status(session.user.id);
    if (!consent.accepted) await coopera.legal.accept();
  }
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
  async listCases() {
    if (!activeCohortId) {
      const member = await this.currentMember();
      if (!member || !activeCohortId) return [];
    }
    const { coopera } = ensureConfigured();
    return (await coopera.cases.list(activeCohortId)).map(mapCase);
  },
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
  async requestAccountDeletion() {
    const { coopera } = ensureConfigured();
    await coopera.identity.requestAccountDeletion();
  },
};
