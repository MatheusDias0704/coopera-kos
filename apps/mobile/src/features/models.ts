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
};

export type ActiveMember = { id: string; name: string; initials: string; role: Role; cohortName: string };

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};
