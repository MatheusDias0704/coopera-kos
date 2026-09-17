export type Role = "aluno" | "mentor" | "admin";
export type CaseStatus = "em_discussao" | "resolvido" | "oculto";

export type ClinicalCase = {
  id: string;
  code: string;
  title: string;
  author: string;
  initials: string;
  createdAt: string;
  status: CaseStatus;
  excerpt: string;
  question: string;
  tags: string[];
  comments: number;
  reactions: number;
  liked?: boolean;
  authorId: string;
  mode: string;
  assessment: string | null;
  body: string | null;
  attachments: Array<{ id: string; filename: string; kind: "imagem" | "pdf" | "video"; storagePath: string }>;
  mentorSummary: { body: string; author: string; createdAt: string } | null;
};

export type ActiveMember = { id: string; name: string; initials: string; role: Role; cohortName: string };

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type CaseComment = { id: string; body: string; createdAt: string; author: string; initials: string };
export type MessagePerson = { id: string; name: string; initials: string };
export type DirectMessage = { id: string; senderId: string; body: string; createdAt: string };
