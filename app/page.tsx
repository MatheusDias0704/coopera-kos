"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, BookOpen, Check, ChevronDown, FileText, Heart, Home, KeyRound, LockKeyhole, Mail, Menu, MessageCircle, MoreHorizontal, Paperclip, Plus, Search, Send, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { CaseMode, CaseRecord, CaseStatus, Membership, Profile, Role } from "../lib/types";

const caseModes: Array<{ value: CaseMode; label: string }> = [{ value: "roteiro_clinico", label: "Roteiro clínico" }, { value: "texto_livre", label: "Texto livre" }, { value: "modelo", label: "Modelo" }];
const caseStatus: Record<CaseStatus, string> = { em_discussao: "em discussão", resolvido: "resolvido", oculto: "oculto" };
const nowText = (date: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));
const initials = (name?: string | null) => name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CK";

export default function HomePage() {
  const [sessionUser, setSessionUser] = useState<{ id: string; email?: string } | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selected, setSelected] = useState<CaseRecord | null>(null);
  const [comments, setComments] = useState<Array<{ id: string; body: string; created_at: string; profiles: Profile | null }>>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"todos" | CaseStatus>("todos");
  const [ready, setReady] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileCaseOpen, setMobileCaseOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [legalDocuments, setLegalDocuments] = useState<Array<{ slug: string; version: string; title: string }>>([]);
  const [legalAccepted, setLegalAccepted] = useState(false);

  const loadWorkspace = useCallback(async (userId: string) => {
    if (!supabase) return;
    const [{ data: profileData }, { data: membershipData }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,initials,avatar_url").eq("id", userId).single(),
      supabase.from("memberships").select("cohort_id,role,active,cohorts(id,name)").eq("user_id", userId).eq("active", true).limit(1).maybeSingle(),
    ]);
    setProfile(profileData as Profile | null);
    setMembership(membershipData as unknown as Membership | null);
    const [{ data: documents }, { data: acceptances }] = await Promise.all([
      supabase.from("legal_documents").select("slug,version,title").eq("active", true),
      supabase.from("legal_acceptances").select("document_slug,document_version").eq("user_id", userId),
    ]);
    const activeDocuments = documents ?? [];
    setLegalDocuments(activeDocuments);
    setLegalAccepted(activeDocuments.length > 0 && activeDocuments.every((document) => (acceptances ?? []).some((acceptance) => acceptance.document_slug === document.slug && acceptance.document_version === document.version)));
    if (!membershipData) { setCases([]); setReady(true); return; }
    const { data: caseData, error } = await supabase.from("clinical_cases")
      .select("id,code,title,mode,status,clinical_context,assessment,body,template_name,community_question,tags,created_at,resolved_at,author_id,profiles!clinical_cases_author_id_fkey(id,full_name,initials,avatar_url),mentor_summaries(id,body,created_at,profiles!mentor_summaries_mentor_id_fkey(id,full_name,initials,avatar_url)),case_attachments(id,filename,kind,storage_path),case_comments(count),case_reactions(count)")
      .eq("cohort_id", membershipData.cohort_id).order("created_at", { ascending: false });
    if (error) setToast("Não foi possível carregar os casos.");
    const nextCases = (caseData ?? []) as unknown as CaseRecord[];
    setCases(nextCases); setSelected((old) => nextCases.find((item) => item.id === old?.id) ?? nextCases[0] ?? null);
    const { data: reactionData } = await supabase.from("case_reactions").select("case_id").eq("user_id", userId);
    setLiked((reactionData ?? []).map((reaction) => reaction.case_id));
    setReady(true);
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const boot = async () => { const { data: { session } } = await client.auth.getSession(); setSessionUser(session?.user ? { id: session.user.id, email: session.user.email } : null); if (session?.user) await loadWorkspace(session.user.id); else setReady(true); };
    void boot();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => { setSessionUser(session?.user ? { id: session.user.id, email: session.user.email } : null); if (session?.user) void loadWorkspace(session.user.id); else { setCases([]); setMembership(null); setReady(true); } });
    return () => subscription.unsubscribe();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!selected || !supabase) { setComments([]); return; }
    void supabase.from("case_comments").select("id,body,created_at,profiles!case_comments_author_id_fkey(id,full_name,initials,avatar_url)").eq("case_id", selected.id).order("created_at").then(({ data }) => setComments((data ?? []) as unknown as typeof comments));
  }, [selected?.id]);

  const refresh = () => sessionUser && void loadWorkspace(sessionUser.id);
  const visibleCases = useMemo(() => cases.filter((item) => (status === "todos" || item.status === status) && `${item.title} ${item.tags.join(" ")} ${item.profiles?.full_name ?? ""}`.toLowerCase().includes(query.toLowerCase())), [cases, query, status]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 4000); };
  const selectCase = (item: CaseRecord) => { setSelected(item); setMenuOpen(false); if (window.matchMedia("(max-width: 800px)").matches) setMobileCaseOpen(true); };

  if (!isSupabaseConfigured) return <ConfigurationScreen />;
  if (!ready) return <LoadingScreen />;
  if (!sessionUser) return <LoginScreen />;
  if (!membership || !profile) return <AccessPending onSignOut={() => void supabase?.auth.signOut()} />;
  if (!legalAccepted) return <LegalGate documents={legalDocuments} userId={sessionUser.id} onAccepted={() => setLegalAccepted(true)} onSignOut={() => void supabase?.auth.signOut()} />;

  const toggleReaction = async (caseId: string) => {
    if (!supabase) return; const had = liked.includes(caseId);
    setLiked((old) => had ? old.filter((id) => id !== caseId) : [...old, caseId]);
    const { error } = had ? await supabase.from("case_reactions").delete().eq("case_id", caseId).eq("user_id", sessionUser.id) : await supabase.from("case_reactions").insert({ case_id: caseId, user_id: sessionUser.id });
    if (error) { notify("Não foi possível registrar a reação."); setLiked((old) => had ? [...old, caseId] : old.filter((id) => id !== caseId)); } else refresh();
  };
  const addComment = async (body: string) => {
    if (!supabase || !selected || !body.trim()) return;
    const { error } = await supabase.from("case_comments").insert({ case_id: selected.id, author_id: sessionUser.id, body: body.trim() });
    if (error) notify("Não foi possível publicar o comentário."); else { notify("Comentário publicado."); refresh(); const { data } = await supabase.from("case_comments").select("id,body,created_at,profiles!case_comments_author_id_fkey(id,full_name,initials,avatar_url)").eq("case_id", selected.id).order("created_at"); setComments((data ?? []) as unknown as typeof comments); }
  };
  const reportCase = async () => {
    if (!supabase || !selected) return; const reason = window.prompt("Explique o motivo da denúncia (mínimo de 5 caracteres):")?.trim(); if (!reason || reason.length < 5) return;
    const { error } = await supabase.from("content_reports").insert({ reporter_id: sessionUser.id, case_id: selected.id, reason }); notify(error ? "Não foi possível enviar a denúncia." : "Denúncia enviada à equipe de moderação.");
  };

  return <main className="app-shell">
    {toast && <div className="toast" role="status">{toast}</div>}
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-mark">K</span><span className="brand-kos">KÓS</span><span className="brand-divider" /><span className="brand-coopera">COOPERA</span></div>
      <p className="cohort-label">{membership.cohorts?.name?.toUpperCase() ?? "TURMA ATIVA"}</p>
      <nav><button className="nav-item active"><BookOpen size={18} />Casos clínicos</button><button className="nav-item" onClick={() => setMessageOpen(true)}><MessageCircle size={18} />Mensagens</button><button className="nav-item" onClick={() => setNoticeOpen(true)}><Bell size={18} />Atualizações</button>{membership.role === "admin" && <button className="nav-item" onClick={() => setAdminOpen(true)}><Users size={18} />Administração</button>}</nav>
      <div className="sidebar-bottom"><div className="disclaimer-mini"><ShieldCheck size={17} /><span>Ambiente educacional<br />dados anonimizados obrigatórios</span></div><button className="profile" onClick={() => void supabase?.auth.signOut()}><span className="avatar avatar-user">{profile.initials}</span><span><b>{profile.full_name}</b><small>{membership.role} · Sair</small></span><ChevronDown size={16} /></button></div>
    </aside>
    <section className="workspace"><header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu"><Menu size={22} /></button><div className="crumb"><span>Comunidade</span><b>/</b><strong>Casos clínicos</strong></div><div className="top-actions"><button className="icon-button" onClick={() => setNoticeOpen(true)} aria-label="Notificações"><Bell size={19} /></button><button className="new-case" onClick={() => setComposerOpen(true)}><Plus size={18} />Publicar caso</button></div></header>
      <div className="content-area"><section className="feed-column"><div className="editorial-head"><div><p className="eyebrow">COMUNIDADE CLÍNICA · BLEFAROPLASTIA</p><h1>Raciocínio clínico<br /><em>feito em conjunto.</em></h1><p className="editorial-copy">Casos organizados, contexto preservado e sínteses que continuam úteis depois da discussão.</p></div><div className="weekly-note"><Sparkles size={17} /><span><b>{cases.filter((item) => item.status === "em_discussao").length} discussões abertas</b><br />na sua turma hoje</span></div></div><section className="community-pulse" aria-label="Resumo da comunidade"><div><span>em discussão</span><b>{cases.filter((item) => item.status === "em_discussao").length}</b></div><div><span>com síntese</span><b>{cases.filter((item) => item.status === "resolvido").length}</b></div><div><span>sua turma</span><b>{membership.cohorts?.name?.replace("Coopera Kós · ", "") ?? "ativa"}</b></div></section><div className="privacy-banner"><LockKeyhole size={18} /><span><b>Confidencialidade é coletiva.</b> Compartilhe apenas conteúdo anonimizado e com base legal. <a href="/termos">Ler termos e privacidade</a></span></div><div className="discovery-row"><label className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar técnica, tema ou colega" /></label></div><div className="feed-heading"><p>Discussões da turma</p><span>{visibleCases.length} {visibleCases.length === 1 ? "caso" : "casos"}</span></div><div className="filter-tabs">{(["todos", "em_discussao", "resolvido"] as const).map((value) => <button key={value} className={status === value ? "selected" : ""} onClick={() => setStatus(value)}>{value === "todos" ? "Todos" : caseStatus[value]}</button>)}</div><div className="case-list">{visibleCases.map((item) => <CaseCard key={item.id} item={item} liked={liked.includes(item.id)} selected={item.id === selected?.id} onSelect={() => selectCase(item)} onLike={() => void toggleReaction(item.id)} />)}{!visibleCases.length && <EmptyCases hasQuery={Boolean(query || status !== "todos")} onCreate={() => setComposerOpen(true)} />}</div></section><aside className="detail-column">{selected ? <CaseDetail selected={selected} comments={comments} role={membership.role} currentUser={sessionUser.id} liked={liked.includes(selected.id)} onLike={() => void toggleReaction(selected.id)} onComment={addComment} onReport={reportCase} onRefresh={refresh} /> : <EmptyCases />}</aside></div>
      <nav className="mobile-bottom-nav" aria-label="Navegação principal"><button className="active"><Home size={19} /><span>Casos</span></button><button onClick={() => setMessageOpen(true)}><MessageCircle size={19} /><span>Mensagens</span></button><button onClick={() => setComposerOpen(true)} className="mobile-create" aria-label="Publicar caso"><Plus size={21} /></button><button onClick={() => setNoticeOpen(true)}><Bell size={19} /><span>Alertas</span></button><button onClick={() => membership.role === "admin" && setAdminOpen(true)}><Users size={19} /><span>Admin</span></button></nav></section>
    {composerOpen && <CaseComposer cohortId={membership.cohort_id} userId={sessionUser.id} onClose={() => setComposerOpen(false)} onDone={() => { setComposerOpen(false); refresh(); notify("Caso publicado com sucesso."); }} />}
    {noticeOpen && <Notifications onClose={() => setNoticeOpen(false)} />}
    {messageOpen && <Messages cohortId={membership.cohort_id} userId={sessionUser.id} onClose={() => setMessageOpen(false)} />}
    {adminOpen && <AdminPanel cohortId={membership.cohort_id} onClose={() => setAdminOpen(false)} />}
    <section className={`mobile-case-sheet ${mobileCaseOpen ? "open" : ""}`} aria-hidden={!mobileCaseOpen}>{selected && <><header className="mobile-sheet-header"><span>LEITURA DO CASO</span><button onClick={() => setMobileCaseOpen(false)} aria-label="Voltar para a lista"><ArrowLeft size={18} /></button></header><CaseDetail selected={selected} comments={comments} role={membership.role} currentUser={sessionUser.id} liked={liked.includes(selected.id)} onLike={() => void toggleReaction(selected.id)} onComment={addComment} onReport={reportCase} onRefresh={refresh} /></>}</section>
  </main>;
}

function CaseCard({ item, liked, selected, onSelect, onLike }: { item: CaseRecord; liked: boolean; selected: boolean; onSelect: () => void; onLike: () => void }) { const comments = item.case_comments?.[0]?.count ?? 0; const reactions = item.case_reactions?.[0]?.count ?? 0; return <article className={`case-card ${selected ? "case-selected" : ""}`} onClick={onSelect} tabIndex={0} onKeyDown={(event) => event.key === "Enter" && onSelect()}><div className="case-topline"><span className="case-code">{item.code}</span><span className={`status-dot ${item.status === "resolvido" ? "done" : ""}`}>{item.status === "resolvido" ? <Check size={13} /> : <span />}{caseStatus[item.status]}</span><MoreHorizontal className="more" size={19} /></div><div className="case-body"><span className="avatar">{item.profiles?.initials ?? initials(item.profiles?.full_name)}</span><div><p className="byline">{item.profiles?.full_name ?? "Participante"}<span>·</span>{nowText(item.created_at)}</p><h2>{item.title}</h2><p className="case-excerpt">{item.clinical_context || item.body || item.assessment || "Caso compartilhado com a comunidade."}</p></div></div><div className="case-question"><span>PERGUNTA À COMUNIDADE</span><p>{item.community_question}</p></div><div className="case-foot"><div className="tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="case-metrics"><button onClick={(event) => { event.stopPropagation(); onSelect(); }} aria-label="Abrir discussão"><MessageCircle size={16} />{comments}</button><button className={liked ? "hearted" : ""} onClick={(event) => { event.stopPropagation(); onLike(); }} aria-label="Reagir ao caso"><Heart size={16} fill={liked ? "currentColor" : "none"} />{reactions}</button></div></div></article>; }

function CaseDetail({ selected, comments, role, currentUser, liked, onLike, onComment, onReport, onRefresh }: { selected: CaseRecord; comments: Array<{ id: string; body: string; created_at: string; profiles: Profile | null }>; role: Role; currentUser: string; liked: boolean; onLike: () => void; onComment: (body: string) => void; onReport: () => void; onRefresh: () => void }) { const [text, setText] = useState(""); const [summary, setSummary] = useState(""); const mentor = selected.mentor_summaries?.[0]; const createSummary = async () => { if (!supabase || !summary.trim()) return; const { error } = await supabase.from("mentor_summaries").insert({ case_id: selected.id, mentor_id: currentUser, body: summary.trim() }); if (!error) { setSummary(""); onRefresh(); } }; const openAttachment = async (path: string) => { const { data, error } = await supabase?.storage.from("case-media").createSignedUrl(path, 60) ?? {}; if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer"); }; return <div className="detail-panel"><div className="detail-label"><span>{selected.code}</span><button onClick={onReport} aria-label="Denunciar conteúdo"><MoreHorizontal size={19} /></button></div><h2>{selected.title}</h2><div className="detail-author"><span className="avatar">{selected.profiles?.initials ?? initials(selected.profiles?.full_name)}</span><span><b>{selected.profiles?.full_name ?? "Participante"}</b><small>{nowText(selected.created_at)} · {caseModes.find((mode) => mode.value === selected.mode)?.label}</small></span></div><div className="detail-question"><p>O que está em discussão</p><strong>{selected.community_question}</strong></div>{selected.case_attachments?.length > 0 && <div className="attachment-list">{selected.case_attachments.map((attachment) => <button key={attachment.id} onClick={() => void openAttachment(attachment.storage_path)}><Paperclip size={14} />{attachment.filename}</button>)}</div>}{mentor && <div className="mentor-summary"><div><span className="avatar avatar-mentor">{mentor.profiles?.initials ?? "MK"}</span><p><b>Síntese do mentor</b><small>{mentor.profiles?.full_name ?? "Mentor"} · {nowText(mentor.created_at)}</small></p><Check size={17} /></div><p>{mentor.body}</p></div>}{!mentor && (role === "mentor" || role === "admin") && <div className="mentor-compose"><textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Síntese clínica do mentor…" /><button className="mentor-action" onClick={() => void createSummary()} disabled={!summary.trim()}><Sparkles size={16} />Publicar síntese</button></div>}<div className="detail-actions"><button><MessageCircle size={17} />{comments.length} contribuições</button><button className={liked ? "hearted" : ""} onClick={onLike}><Heart size={17} fill={liked ? "currentColor" : "none"} />Reagir</button></div><div className="comments-head"><h3>Discussão</h3><span>cronológica</span></div><div className="comment-stack">{comments.map((comment) => <div className="comment" key={comment.id}><span className="avatar avatar-comment">{comment.profiles?.initials ?? initials(comment.profiles?.full_name)}</span><div><p><b>{comment.profiles?.full_name ?? "Participante"}</b><small>{nowText(comment.created_at)}</small></p><span>{comment.body}</span></div></div>)}</div><form className="comment-form" onSubmit={(event) => { event.preventDefault(); onComment(text); setText(""); }}><span className="avatar avatar-user">{initials("Você")}</span><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Contribua com a discussão…" /><button disabled={!text.trim()} aria-label="Enviar comentário"><Send size={17} /></button></form></div>; }

function CaseComposer({ cohortId, userId, onClose, onDone }: { cohortId: string; userId: string; onClose: () => void; onDone: () => void }) { const [mode, setMode] = useState<CaseMode>("roteiro_clinico"); const [title, setTitle] = useState(""); const [question, setQuestion] = useState(""); const [context, setContext] = useState(""); const [assessment, setAssessment] = useState(""); const [body, setBody] = useState(""); const [tags, setTags] = useState(""); const [files, setFiles] = useState<FileList | null>(null); const [agreed, setAgreed] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const submit = async (event: FormEvent) => { event.preventDefault(); if (!supabase || !agreed) return; setBusy(true); setError(""); const code = `CASO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`; const { data: created, error: createError } = await supabase.from("clinical_cases").insert({ cohort_id: cohortId, author_id: userId, code, title, mode, clinical_context: context || null, assessment: assessment || null, body: body || null, community_question: question, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8), privacy_acknowledged_at: new Date().toISOString(), privacy_acknowledgement_version: "provisional-2026-09" }).select("id").single(); if (createError || !created) { setError(createError?.message || "Não foi possível publicar o caso."); setBusy(false); return; } for (const file of Array.from(files ?? [])) { const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4"]; if (!allowed.includes(file.type) || file.size > 50 * 1024 * 1024) { setError("Anexo inválido: somente imagem, PDF ou vídeo MP4 de até 50 MB."); continue; } const path = `${cohortId}/${created.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`; const { error: uploadError } = await supabase.storage.from("case-media").upload(path, file, { contentType: file.type }); if (!uploadError) await supabase.from("case_attachments").insert({ case_id: created.id, uploader_id: userId, storage_path: path, filename: file.name, kind: file.type === "application/pdf" ? "pdf" : file.type === "video/mp4" ? "video" : "imagem", mime_type: file.type, byte_size: file.size }); } setBusy(false); onDone(); }; return <div className="modal-backdrop"><form className="composer" onSubmit={(event) => void submit(event)}><div className="modal-head"><div><p className="eyebrow">NOVO CASO</p><h2>Convide a turma<br /><em>para raciocinar junto.</em></h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={22} /></button></div><div className="mode-select">{caseModes.map((item) => <button type="button" key={item.value} className={mode === item.value ? "active" : ""} onClick={() => setMode(item.value)}>{item.label}</button>)}</div><label>Título do caso<input value={title} required minLength={5} maxLength={160} onChange={(event) => setTitle(event.target.value)} /></label>{mode === "roteiro_clinico" && <div className="clinical-grid"><label>Contexto clínico<textarea value={context} onChange={(event) => setContext(event.target.value)} /></label><label>Avaliação e hipótese<textarea value={assessment} onChange={(event) => setAssessment(event.target.value)} /></label></div>}{mode === "texto_livre" && <label>Descrição<textarea value={body} required onChange={(event) => setBody(event.target.value)} /></label>}<label>Pergunta para a comunidade<textarea value={question} required minLength={10} onChange={(event) => setQuestion(event.target.value)} /></label><label>Tags, separadas por vírgula<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Técnica, pálpebra superior" /></label><label className="attachment"><Paperclip size={17} />Adicionar imagens, PDF ou vídeo <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4" onChange={(event) => setFiles(event.target.files)} /></label><label className="privacy-check"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>Confirmo a anonimização e a base legal do compartilhamento educacional. A decisão e a responsabilidade clínica continuam sendo do médico assistente.</span></label>{error && <p className="login-error">{error}</p>}<div className="composer-foot"><p><ShieldCheck size={16} />Visível apenas à turma ativa</p><button className="publish" disabled={!agreed || busy}>{busy ? "Publicando…" : "Publicar caso"} <Send size={16} /></button></div></form></div>; }

function Notifications({ onClose }: { onClose: () => void }) { const [items, setItems] = useState<Array<{ id: string; title: string; body: string | null; created_at: string; read_at: string | null }>>([]); useEffect(() => { if (!supabase) return; void supabase.from("notifications").select("id,title,body,created_at,read_at").order("created_at", { ascending: false }).limit(20).then(({ data }) => setItems(data ?? [])); }, []); return <div className="floating-panel notifications"><div><h3>Atualizações</h3><button onClick={onClose}><X size={18} /></button></div>{items.length ? items.map((item) => <button key={item.id} className={`notification-item ${!item.read_at ? "unread" : ""}`} onClick={() => void supabase?.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", item.id)}><span className="notice-icon"><Bell size={14} /></span><p><b>{item.title}</b><small>{item.body} · {nowText(item.created_at)}</small></p></button>) : <p className="empty-copy">Nenhuma atualização por enquanto.</p>}</div>; }

function Messages({ cohortId, userId, onClose }: { cohortId: string; userId: string; onClose: () => void }) { const [people, setPeople] = useState<Profile[]>([]); const [contact, setContact] = useState<Profile | null>(null); const [conversation, setConversation] = useState<string | null>(null); const [messages, setMessages] = useState<Array<{ id: string; sender_id: string; body: string; created_at: string }>>([]); const [text, setText] = useState(""); useEffect(() => { if (!supabase) return; void supabase.from("memberships").select("user_id,profiles(id,full_name,initials,avatar_url)").eq("cohort_id", cohortId).eq("active", true).neq("user_id", userId).then(({ data }) => setPeople((data ?? []).map((row) => row.profiles as unknown as Profile).filter(Boolean))); }, [cohortId, userId]); const open = async (person: Profile) => { if (!supabase) return; const { data, error } = await supabase.rpc("open_direct_conversation", { target_user: person.id }); if (error) return; setContact(person); setConversation(data); const { data: thread } = await supabase.from("direct_messages").select("id,sender_id,body,created_at").eq("conversation_id", data).order("created_at"); setMessages(thread ?? []); }; const send = async (event: FormEvent) => { event.preventDefault(); if (!supabase || !conversation || !text.trim()) return; const { error } = await supabase.from("direct_messages").insert({ conversation_id: conversation, sender_id: userId, body: text.trim() }); if (!error) { setText(""); const { data } = await supabase.from("direct_messages").select("id,sender_id,body,created_at").eq("conversation_id", conversation).order("created_at"); setMessages(data ?? []); } }; return <div className="modal-backdrop message-backdrop"><div className="messages-modal"><div className="modal-head"><div><p className="eyebrow">CONVERSAS PRIVADAS</p><h2>{contact ? contact.full_name : "Entre colegas."}</h2></div><button onClick={onClose}><X size={22} /></button></div>{!contact ? <div className="people-list">{people.map((person) => <button className="message-contact" key={person.id} onClick={() => void open(person)}><span className="avatar">{person.initials}</span><p><b>{person.full_name}</b><small>Iniciar conversa privada</small></p></button>)}</div> : <><button className="back-link" onClick={() => { setContact(null); setConversation(null); }}>← Contatos</button><div className="message-thread">{messages.map((message) => <div key={message.id} className={`message-bubble ${message.sender_id === userId ? "mine" : ""}`}>{message.body}</div>)}</div><form className="dm-form" onSubmit={(event) => void send(event)}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Escreva uma mensagem privada" /><button disabled={!text.trim()}><Send size={17} /></button></form></>}</div></div>; }

function AdminPanel({ cohortId, onClose }: { cohortId: string; onClose: () => void }) { const [members, setMembers] = useState<Array<{ user_id: string; role: Role; active: boolean; profiles: Profile | null }>>([]); const [email, setEmail] = useState(""); const [fullName, setFullName] = useState(""); const [role, setRole] = useState<Role>("aluno"); const [message, setMessage] = useState(""); const token = async () => (await supabase?.auth.getSession())?.data.session?.access_token; const load = useCallback(async () => { if (!supabase) return; const { data } = await supabase.from("memberships").select("user_id,role,active,profiles(id,full_name,initials,avatar_url)").eq("cohort_id", cohortId).order("created_at"); setMembers((data ?? []) as unknown as typeof members); }, [cohortId]); useEffect(() => { void load(); }, [load]); const invite = async (event: FormEvent) => { event.preventDefault(); const accessToken = await token(); const response = await fetch("/api/admin/invite", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ email, fullName, cohortId, role }) }); setMessage(response.ok ? "Convite enviado." : (await response.json()).error || "Falha ao enviar convite."); if (response.ok) { setEmail(""); setFullName(""); void load(); } }; const update = async (userId: string, update: Partial<{ role: Role; active: boolean }>) => { const accessToken = await token(); await fetch("/api/admin/membership", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ cohortId, userId, ...update }) }); void load(); }; return <div className="modal-backdrop"><div className="composer admin-panel"><div className="modal-head"><div><p className="eyebrow">OPERAÇÃO DA TURMA</p><h2>Administração</h2></div><button onClick={onClose}><X size={22} /></button></div><form className="admin-invite" onSubmit={(event) => void invite(event)}><input required type="email" placeholder="E-mail profissional" value={email} onChange={(event) => setEmail(event.target.value)} /><input required placeholder="Nome completo" value={fullName} onChange={(event) => setFullName(event.target.value)} /><select value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="aluno">Aluno</option><option value="mentor">Mentor</option><option value="admin">Administrador</option></select><button className="publish">Convidar</button></form>{message && <p className="login-notice">{message}</p>}<div className="member-list">{members.map((member) => <div key={member.user_id} className="member-row"><span className="avatar">{member.profiles?.initials ?? "CK"}</span><span><b>{member.profiles?.full_name ?? "Participante"}</b><small>{member.active ? "ativo" : "desativado"}</small></span><select value={member.role} onChange={(event) => void update(member.user_id, { role: event.target.value as Role })}><option value="aluno">Aluno</option><option value="mentor">Mentor</option><option value="admin">Admin</option></select><button className="link-button" onClick={() => void update(member.user_id, { active: !member.active })}>{member.active ? "Desativar" : "Reativar"}</button></div>)}</div></div></div>; }

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const recovery = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("set-password");
  const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";
  const clearMessage = () => { setError(""); setNotice(""); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    clearMessage();
    if (mode === "signup") {
      if (!acceptedTerms) { setError("Leia e aceite os termos para criar sua conta."); return; }
      setPending(true);
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password, fullName: fullName.trim(), acceptedTerms }) });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Não foi possível criar sua conta. Tente novamente." })) as { error?: string };
        setPending(false);
        setError(payload.error ?? "Não foi possível criar sua conta. Tente novamente.");
        return;
      }
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setPending(false);
      if (authError) setNotice("Conta criada. Entre com seu e-mail e senha para acessar.");
      else setNotice("Conta criada. Bem-vindo à turma beta.");
      return;
    }
    setPending(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    if (authError) setError("Não foi possível entrar. Confira o e-mail e a senha ou redefina seu acesso.");
  };
  const setNewPassword = async (event: FormEvent) => {
    event.preventDefault();
    clearMessage();
    if (!supabase || password.length < 8) { setError("Crie uma senha com pelo menos 8 caracteres."); return; }
    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) setError("O link de acesso expirou. Solicite uma nova redefinição.");
    else { setNotice("Senha atualizada. Você já pode entrar na comunidade."); window.history.replaceState({}, "", "/"); }
  };
  const reset = async () => {
    if (!supabase || !email) { setError("Informe seu e-mail profissional para receber o link seguro."); return; }
    clearMessage(); setPending(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?set-password=1` });
    setPending(false);
    if (resetError) setError("Não foi possível solicitar a redefinição agora. Tente novamente.");
    else setNotice("Se o e-mail estiver cadastrado, enviaremos um link seguro.");
  };
  const signInWithGoogle = async () => {
    if (!supabase) return;
    clearMessage(); setPending(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (oauthError) { setPending(false); setError("Não foi possível iniciar o acesso com Google. Tente novamente."); }
  };
  const isSignup = mode === "signup" && !recovery;
  const title = recovery ? <>Defina sua<br /><em>nova senha.</em></> : isSignup ? <>Crie seu acesso<br /><em>à comunidade.</em></> : <>O conhecimento<br /><em>continua aqui.</em></>;
  return <main className="auth-shell"><section className="auth-panel">
    <div className="auth-brand"><span className="brand-mark">K</span><div><b>KÓS</b><span>COOPERA</span></div></div>
    {!recovery && <div className="auth-switch" role="tablist" aria-label="Opções de acesso"><button className={!isSignup ? "active" : ""} onClick={() => { setMode("login"); clearMessage(); }} role="tab" aria-selected={!isSignup}>Entrar</button><button className={isSignup ? "active" : ""} onClick={() => { setMode("signup"); clearMessage(); }} role="tab" aria-selected={isSignup}>Criar conta</button></div>}
    <div className="auth-intro"><h1>{title}</h1><p>{recovery ? "Escolha uma senha pessoal para concluir seu acesso." : isSignup ? "Use seus dados profissionais para entrar na turma beta." : "Acesse com seu e-mail e senha cadastrados."}</p></div>
    <form className="login-form" onSubmit={(event) => void (recovery ? setNewPassword(event) : submit(event))}>
      {isSignup && <label>Nome completo<div><Users size={17} /><input required minLength={2} maxLength={100} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></div></label>}
      {!recovery && <label>E-mail profissional<div><Mail size={17} /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>}
      <label>{recovery ? "Nova senha" : "Senha"}<div><KeyRound size={17} /><input required minLength={8} type="password" autoComplete={recovery || isSignup ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></div></label>
      {isSignup && <label className="auth-consent"><input required type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /><span>Li e aceito os <a href="/termos" target="_blank">Termos e a Política de Privacidade</a>. Confirmo que publicarei apenas dados anonimizados.</span></label>}
      {error && <p className="login-error" role="alert">{error}</p>}{notice && <p className="login-notice" role="status">{notice}</p>}
      <button disabled={pending}>{pending ? "Aguarde…" : recovery ? "Salvar nova senha" : isSignup ? "Criar conta" : "Entrar"}</button>
    </form>
    {!recovery && !isSignup && <button className="auth-link" disabled={pending} onClick={() => void reset()}>Esqueci minha senha</button>}
    {!recovery && googleEnabled && <button className="google-auth" disabled={pending} onClick={() => void signInWithGoogle()}>Continuar com Google</button>}
    <p className="auth-disclaimer"><LockKeyhole size={14} />Ambiente beta educacional. Dados anonimizados obrigatórios.</p>
  </section></main>;
}

function ConfigurationScreen() { return <main className="auth-shell"><section className="auth-panel"><div className="auth-brand"><span className="brand-mark">K</span><div><b>KÓS</b><span>COOPERA</span></div></div><div className="auth-intro"><p className="eyebrow">CONFIGURAÇÃO NECESSÁRIA</p><h1>Ambiente ainda<br /><em>não conectado.</em></h1><p>O serviço de autenticação ainda não foi configurado neste deploy.</p></div></section></main>; }
function LoadingScreen() { return <main className="auth-shell"><section className="auth-panel"><p className="auth-disclaimer">Verificando acesso seguro…</p></section></main>; }
function AccessPending({ onSignOut }: { onSignOut: () => void }) { return <main className="auth-shell"><section className="auth-panel"><div className="auth-intro"><p className="eyebrow">ACESSO PENDENTE</p><h1>Sua conta ainda<br /><em>não está em uma turma.</em></h1><p>Peça à equipe Kós para concluir seu convite.</p></div><button className="preview-button" onClick={onSignOut}>Sair</button></section></main>; }
function LegalGate({ documents, userId, onAccepted, onSignOut }: { documents: Array<{ slug: string; version: string; title: string }>; userId: string; onAccepted: () => void; onSignOut: () => void }) { const [checked, setChecked] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const accept = async () => { if (!supabase || !checked || !documents.length) return; setBusy(true); const { error: insertError } = await supabase.from("legal_acceptances").insert(documents.map((document) => ({ user_id: userId, document_slug: document.slug, document_version: document.version }))); setBusy(false); if (insertError) setError("Não foi possível registrar seu aceite. Tente novamente."); else onAccepted(); }; return <main className="auth-shell"><section className="auth-panel"><div className="auth-brand"><span className="brand-mark">K</span><div><b>KÓS</b><span>COOPERA</span></div></div><div className="auth-intro"><p className="eyebrow">PRIMEIRO ACESSO</p><h1>Uso consciente,<br /><em>comunidade segura.</em></h1><p>Antes de participar, leia e aceite os documentos que regem a comunidade.</p></div><ul className="legal-list">{documents.map((document) => <li key={document.slug}><a href="/termos" target="_blank">{document.title} · {document.version}</a></li>)}</ul><label className="privacy-check legal-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span>Li e aceito os documentos. Confirmo que a responsabilidade por qualquer decisão clínica é exclusivamente minha.</span></label>{error && <p className="login-error">{error}</p>}<button className="preview-button" disabled={!checked || busy} onClick={() => void accept()}>{busy ? "Registrando…" : "Aceitar e entrar"}</button><button className="auth-link" onClick={onSignOut}>Sair</button></section></main>; }
function EmptyCases({ hasQuery = false, onCreate }: { hasQuery?: boolean; onCreate?: () => void }) { return <div className="empty-state"><div className="empty-icon"><BookOpen size={24} /></div><span className="beta-pill">BETA</span><h2>{hasQuery ? "Nenhum caso com estes filtros" : "Ainda não há discussões nesta turma"}</h2><p>{hasQuery ? "Tente outro tema, técnica ou status." : "Comece com uma pergunta clínica objetiva e contexto estritamente anonimizado. Sua turma verá a discussão aqui."}</p>{onCreate && !hasQuery && <button className="publish" onClick={onCreate}><Plus size={16} />Publicar o primeiro caso</button>}</div>; }
