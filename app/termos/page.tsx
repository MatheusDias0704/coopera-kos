"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Document = { slug: string; version: string; title: string; body_markdown: string; published_at: string };

export default function TermsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  useEffect(() => { if (supabase) void supabase.from("legal_documents").select("slug,version,title,body_markdown,published_at").eq("active", true).then(({ data }) => setDocuments((data ?? []) as Document[])); }, []);
  return <main className="legal-shell"><header className="legal-header"><Link href="/" className="brand"><span className="brand-mark">K</span><span className="brand-kos">KÓS</span><span className="brand-divider" /><span className="brand-coopera">COOPERA</span></Link><Link href="/" className="back-link">Voltar à comunidade</Link></header><article className="legal-content"><p className="eyebrow">DOCUMENTOS DA COMUNIDADE</p><h1>Uso responsável,<br /><em>aprendizado protegido.</em></h1><div className="privacy-banner"><ShieldCheck size={18} /><span>O Coopera Kós é um ambiente educacional. A responsabilidade pela decisão clínica permanece exclusivamente com o médico assistente.</span></div>{documents.length ? documents.map((document) => <section key={document.slug} className="legal-document"><p className="eyebrow">VERSÃO {document.version} · {new Date(document.published_at).toLocaleDateString("pt-BR")}</p><h2>{document.title}</h2>{document.body_markdown.split("\n").filter(Boolean).map((paragraph, index) => paragraph.startsWith("#") ? null : <p key={index}>{paragraph}</p>)}</section>) : <section className="legal-document"><h2>Documentos em atualização</h2><p>Os documentos legais serão exibidos aqui assim que o ambiente estiver conectado.</p></section>}<p className="legal-contact">Para solicitar remoção de conteúdo ou exercer direitos de privacidade, escreva para <a href="mailto:privacidade@institutokos.com.br">privacidade@institutokos.com.br</a>.</p></article></main>;
}
