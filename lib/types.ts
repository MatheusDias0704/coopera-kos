export type Role = "aluno" | "mentor" | "admin";
export type CaseStatus = "em_discussao" | "resolvido" | "oculto";
export type CaseMode = "roteiro_clinico" | "texto_livre" | "modelo";

export type Profile = { id: string; full_name: string; initials: string; avatar_url: string | null };
export type Membership = { cohort_id: string; role: Role; active: boolean; cohorts: { id: string; name: string } | null };
export type CaseRecord = {
  id: string; code: string; title: string; mode: CaseMode; status: CaseStatus; clinical_context: string | null;
  assessment: string | null; body: string | null; template_name: string | null; community_question: string;
  tags: string[]; created_at: string; resolved_at: string | null; author_id: string;
  profiles: Profile | null; mentor_summaries: Array<{ id: string; body: string; created_at: string; profiles: Profile | null }>;
  case_attachments: Array<{ id: string; filename: string; kind: "imagem" | "pdf" | "video"; storage_path: string }>;
  case_comments: Array<{ count: number }>;
  case_reactions: Array<{ count: number }>;
};
