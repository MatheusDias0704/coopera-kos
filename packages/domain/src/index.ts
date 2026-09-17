import type { CaseInput, CaseStatus, LegalAcceptance, LegalDocument, Membership } from "./types";
export type * from "./types";

export class DomainError extends Error {
  readonly code: "invalid_input" | "forbidden" | "unauthenticated" | "not_ready";
  constructor(code: DomainError["code"], message: string) { super(message); this.code = code; this.name = "DomainError"; }
}
export const PRIVACY_ACKNOWLEDGEMENT_VERSION = "educational-2026-09";
export function text(value: string, label: string, min: number, max: number): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length < min || normalized.length > max) throw new DomainError("invalid_input", `${label}: informe de ${min} a ${max} caracteres.`);
  return normalized;
}

export const IdentityAccess = {
  credentials(email: string, password: string) {
    const normalized = text(email, "E-mail", 3, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || !password) throw new DomainError("invalid_input", "Informe e-mail e senha válidos.");
    return { email: normalized, password };
  },
  password(value: string) { if (typeof value !== "string" || value.length < 8 || value.length > 128 || !value.trim()) throw new DomainError("invalid_input", "Senha: informe de 8 a 128 caracteres."); return value; },
};

export type Action = "read" | "create" | "edit" | "resolve" | "moderate" | "admin";
export const CohortAccess = {
  can(membership: Membership | null, action: Action, resource?: { cohortId: string; authorId?: string; userId?: string; status?: CaseStatus }) {
    if (!membership?.active || (resource && resource.cohortId !== membership.cohort_id)) return false;
    if (action === "admin" || action === "moderate") return membership.role === "admin";
    if (resource?.status === "oculto") return action === "read" && membership.role === "admin";
    if (action === "resolve") return membership.role !== "aluno" && resource?.status === "em_discussao";
    if (action === "edit") return Boolean(resource?.authorId && resource.authorId === resource.userId && resource.status === "em_discussao");
    return true;
  },
};

export const ClinicalCases = {
  prepare(input: CaseInput) {
    if (!input.privacyAcknowledged) throw new DomainError("invalid_input", "Confirme a anonimização e a autorização de compartilhamento.");
    if (!["roteiro_clinico", "texto_livre", "modelo"].includes(input.mode)) throw new DomainError("invalid_input", "Formato de caso inválido.");
    const tags = [...new Set((input.tags ?? []).map(tag => text(tag, "Tag", 1, 60)))];
    if (tags.length > 8) throw new DomainError("invalid_input", "Use no máximo 8 tags.");
    return { cohort_id: text(input.cohortId, "Turma", 1, 100), title: text(input.title, "Título", 5, 160), mode: input.mode,
      community_question: text(input.communityQuestion, "Pergunta", 10, 1000),
      clinical_context: input.clinicalContext ? text(input.clinicalContext, "Contexto", 1, 6000) : null,
      assessment: input.assessment ? text(input.assessment, "Avaliação", 1, 6000) : null,
      body: input.mode === "texto_livre" ? text(input.body ?? "", "Descrição", 1, 12000) : input.body ? text(input.body, "Descrição", 1, 12000) : null,
      template_name: input.templateName ? text(input.templateName, "Modelo", 1, 160) : null, tags,
      privacy_acknowledgement_version: PRIVACY_ACKNOWLEDGEMENT_VERSION };
  },
};

export const Discussion = {
  comment(body: string) { return text(body, "Comentário", 1, 4000); },
  summary(body: string) { return text(body, "Síntese", 20, 8000); },
  report(input: { caseId?: string; commentId?: string; reason: string }) {
    if (Boolean(input.caseId) === Boolean(input.commentId)) throw new DomainError("invalid_input", "Selecione um caso ou comentário.");
    return { case_id: input.caseId ?? null, comment_id: input.commentId ?? null, reason: text(input.reason, "Motivo", 5, 1000) };
  },
};
export const PrivateMedia = {
  validate(file: { name: string; type: string; size: number }) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4"];
    if (!allowed.includes(file.type) || !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > 50 * 1024 * 1024) throw new DomainError("invalid_input", "Use imagem JPEG, PNG ou WebP, PDF ou MP4 de até 50 MB.");
    return { filename: text(file.name, "Nome do arquivo", 1, 255), kind: file.type === "application/pdf" ? "pdf" as const : file.type === "video/mp4" ? "video" as const : "imagem" as const, mime_type: file.type, byte_size: file.size };
  },
};
export const Messaging = {
  message(body: string) { return text(body, "Mensagem", 1, 4000); },
  block(actorId: string, targetId: string) { if (!targetId || actorId === targetId) throw new DomainError("invalid_input", "Escolha outro participante para bloquear."); return { blocker_id: actorId, blocked_id: targetId }; },
};
export const AdminOperations = {
  membership(actorId: string, targetId: string, update: { role?: string; active?: boolean }) {
    if ((update.role !== undefined && !["aluno", "mentor", "admin"].includes(update.role)) || (update.active !== undefined && typeof update.active !== "boolean") || (update.role === undefined && update.active === undefined)) throw new DomainError("invalid_input", "Alteração de acesso inválida.");
    if (actorId === targetId && (update.active === false || (update.role !== undefined && update.role !== "admin"))) throw new DomainError("forbidden", "Outro administrador deve alterar seu acesso.");
    return update;
  },
};
export const LegalConsent = {
  hasAcceptedCurrentVersions(documents: LegalDocument[], acceptances: LegalAcceptance[]) {
    return documents.length > 0 && documents.every(document => acceptances.some(acceptance => acceptance.document_slug === document.slug && acceptance.document_version === document.version));
  },
};
