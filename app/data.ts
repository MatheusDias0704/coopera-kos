export type Role = "aluno" | "mentor" | "admin";
export type CaseStatus = "em discussão" | "resolvido";
export type CaseMode = "roteiro clínico" | "texto livre" | "modelo";

export type CommunityCase = {
  id: number;
  title: string;
  code: string;
  author: string;
  initials: string;
  role: Role;
  createdAt: string;
  status: CaseStatus;
  mode: CaseMode;
  tags: string[];
  question: string;
  excerpt: string;
  comments: number;
  reactions: number;
  media: "photo" | "document" | "video" | "none";
  hasMentor: boolean;
};

export const starterCases: CommunityCase[] = [
  {
    id: 14,
    code: "CASO 014",
    title: "Pele excedente com assimetria prévia",
    author: "Dra. Camila N.",
    initials: "CN",
    role: "aluno",
    createdAt: "há 18 min",
    status: "em discussão",
    mode: "roteiro clínico",
    tags: ["Pálpebra superior", "Assimetria", "Plano cirúrgico"],
    question: "Como vocês equilibrariam a retirada de pele sem ampliar a assimetria já presente?",
    excerpt: "Paciente com queixa funcional e assimetria palpebral discreta desde a juventude. Marcação já revisada em posição sentada.",
    comments: 12,
    reactions: 8,
    media: "photo",
    hasMentor: false,
  },
  {
    id: 9,
    code: "CASO 009",
    title: "Revisão após cicatriz lateral marcada",
    author: "Dr. Gustavo R.",
    initials: "GR",
    role: "aluno",
    createdAt: "ontem",
    status: "resolvido",
    mode: "modelo",
    tags: ["Revisional", "Canto lateral", "Cicatriz"],
    question: "Qual abordagem preservaria melhor o vetor lateral neste cenário revisional?",
    excerpt: "Caso discutido com documentação de pós-operatório tardio e relato da primeira intervenção em outro serviço.",
    comments: 19,
    reactions: 16,
    media: "document",
    hasMentor: true,
  },
  {
    id: 7,
    code: "CASO 007",
    title: "Bolsas mediais e transição palpebromalar",
    author: "Dra. Helena A.",
    initials: "HA",
    role: "mentor",
    createdAt: "segunda-feira",
    status: "resolvido",
    mode: "roteiro clínico",
    tags: ["Pálpebra inferior", "Bolsas", "Reposicionamento"],
    question: "Em quais sinais vocês sustentariam reposicionamento em vez de ressecção?",
    excerpt: "A mentora compartilha o raciocínio pré-operatório e o acompanhamento de 90 dias, com vídeo da avaliação inicial.",
    comments: 27,
    reactions: 31,
    media: "video",
    hasMentor: true,
  },
];

export const comments = [
  { initials: "MA", name: "Dr. Mateus A.", time: "há 11 min", text: "Eu manteria a marcação mais conservadora no lado direito e revisaria a posição da sobrancelha antes de decidir pela diferença de fuso." },
  { initials: "LF", name: "Dra. Luiza F.", time: "há 7 min", text: "Concordo. A foto em olhar primário sugere que parte dessa assimetria é compensatória — vale documentar também em supraversão." },
];
