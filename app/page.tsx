"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Bell, BookOpen, Check, ChevronDown, CircleHelp, FileText, Heart, Home as HomeIcon,
  Image as ImageIcon, KeyRound, LockKeyhole, Mail, Menu, MessageCircle, MoreHorizontal,
  Paperclip, Plus, Search, Send, ShieldCheck, SlidersHorizontal, Sparkles, UserRound,
  Users, Video, X,
} from "lucide-react";
import { comments as initialComments, CommunityCase, CaseMode, CaseStatus, Role, starterCases } from "./data";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const filters: { label: string; value: "todos" | CaseStatus }[] = [
  { label: "Todos", value: "todos" },
  { label: "Em discussão", value: "em discussão" },
  { label: "Resolvidos", value: "resolvido" },
];

function MediaGlyph({ type }: { type: CommunityCase["media"] }) {
  if (type === "photo") return <ImageIcon size={16} />;
  if (type === "video") return <Video size={16} />;
  if (type === "document") return <FileText size={16} />;
  return null;
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [memberRole, setMemberRole] = useState<Role | null>(null);
  const [memberName, setMemberName] = useState("");
  const [cases, setCases] = useState(starterCases);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"todos" | CaseStatus>("todos");
  const [selected, setSelected] = useState<CommunityCase | null>(starterCases[0]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [commentList, setCommentList] = useState(initialComments);
  const [commentText, setCommentText] = useState("");
  const [liked, setLiked] = useState<number[]>([]);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const visibleCases = useMemo(() => cases.filter((item) => {
    const haystack = `${item.title} ${item.tags.join(" ")} ${item.author}`.toLowerCase();
    return (status === "todos" || item.status === status) && haystack.includes(query.toLowerCase());
  }), [cases, query, status]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    setNeedsPasswordSetup(new URLSearchParams(window.location.search).get("set-password") === "1");
    const syncSession = async () => {
      const { data: { session } } = await client.auth.getSession();
      setAuthenticated(Boolean(session));
      setMemberName(session?.user.user_metadata.full_name || session?.user.email?.split("@")[0] || "Participante");
      if (session) {
        const { data } = await client.from("memberships").select("role").eq("user_id", session.user.id).eq("active", true).limit(1).maybeSingle();
        setMemberRole((data?.role as Role | undefined) ?? null);
      }
      setAuthReady(true);
    };
    void syncSession();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
      setMemberName(session?.user.user_metadata.full_name || session?.user.email?.split("@")[0] || "Participante");
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured && !previewMode) return <ConfigurationScreen onPreview={() => setPreviewMode(true)} />;
  if (!authReady && !previewMode) return <LoadingScreen />;
  if (authenticated && needsPasswordSetup) return <SetPasswordScreen onComplete={() => setNeedsPasswordSetup(false)} />;
  if (!authenticated && !previewMode) return <LoginScreen />;

  const addReaction = (id: number) => {
    setLiked((old) => old.includes(id) ? old.filter((value) => value !== id) : [...old, id]);
    setCases((old) => old.map((item) => item.id === id ? { ...item, reactions: item.reactions + (liked.includes(id) ? -1 : 1) } : item));
    if (selected?.id === id) setSelected((old) => old ? { ...old, reactions: old.reactions + (liked.includes(id) ? -1 : 1) } : old);
  };

  const submitComment = (event: FormEvent) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    setCommentList((old) => [...old, { initials: "JS", name: "Dra. Juliana S.", time: "agora", text: commentText.trim() }]);
    if (selected) {
      setCases((old) => old.map((item) => item.id === selected.id ? { ...item, comments: item.comments + 1 } : item));
      setSelected({ ...selected, comments: selected.comments + 1 });
    }
    setCommentText("");
  };

  const resolveCase = () => {
    if (!selected) return;
    const next = { ...selected, status: "resolvido" as CaseStatus, hasMentor: true };
    setSelected(next);
    setCases((old) => old.map((item) => item.id === next.id ? next : item));
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark">K</span><span className="brand-kos">KÓS</span><span className="brand-divider" /><span className="brand-coopera">COOPERA</span></div>
        <p className="cohort-label">HANDS-ON 2025 · TURMA 03</p>
        <nav>
          <button className="nav-item active"><BookOpen size={18} />Casos clínicos</button>
          <button className="nav-item" onClick={() => setMessagesOpen(true)}><MessageCircle size={18} />Mensagens<span className="nav-count">2</span></button>
          <button className="nav-item" onClick={() => setNoticeOpen(true)}><Bell size={18} />Atualizações<span className="nav-count alert">4</span></button>
          <button className="nav-item"><Users size={18} />Comunidade</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="disclaimer-mini"><ShieldCheck size={17} /><span>Ambiente educacional<br />com dados anonimizados</span></div>
          <button className="profile" onClick={() => previewMode ? setPreviewMode(false) : void supabase?.auth.signOut()}><span className="avatar avatar-user">{(previewMode ? "BD" : memberName.slice(0, 2)).toUpperCase()}</span><span><b>{previewMode ? "Prévia do beta" : memberName}</b><small>{previewMode ? "Dados fictícios · Sair" : `${memberRole || "participante"} · Sair`}</small></span><ChevronDown size={16} /></button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu"><Menu size={22} /></button>
          <div className="crumb"><span>Comunidade</span><b>/</b><strong>Casos clínicos</strong><small className="beta-pill">BETA · FICTÍCIO</small></div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setNoticeOpen(true)} aria-label="Notificações"><Bell size={19} /><i /></button>
            <button className="new-case" onClick={() => setComposerOpen(true)}><Plus size={18} />Publicar caso</button>
          </div>
        </header>

        <div className="content-area">
          <section className="feed-column">
            <div className="editorial-head">
              <div><p className="eyebrow">BASE VIVA · BLEFAROPLASTIA</p><h1>Decisões melhores<br /><em>não acontecem sozinhas.</em></h1></div>
              <div className="weekly-note"><Sparkles size={17} /><span><b>Ronda da semana</b><br />3 novos casos para discutir</span></div>
            </div>
            <div className="privacy-banner"><LockKeyhole size={18} /><span><b>Confidencialidade é coletiva.</b> Publique apenas informações e arquivos anonimizados, com base legal para compartilhamento.</span><button aria-label="Saiba mais"><CircleHelp size={18} /></button></div>
            <div className="discovery-row">
              <label className="search-box"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar técnica, tema ou colega" /></label>
              <button className="filter-button"><SlidersHorizontal size={17} />Filtros</button>
            </div>
            <div className="filter-tabs">{filters.map((filter) => <button key={filter.value} className={status === filter.value ? "selected" : ""} onClick={() => setStatus(filter.value)}>{filter.label}</button>)}</div>
            <div className="case-list">
              {visibleCases.map((item, index) => <article className={`case-card ${selected?.id === item.id ? "case-selected" : ""}`} key={item.id} onClick={() => { setSelected(item); setMobileDetailOpen(true); }} style={{ animationDelay: `${index * 70}ms` }}>
                <div className="case-topline"><span className="case-code">{item.code}</span><span className={`status-dot ${item.status === "resolvido" ? "done" : ""}`}>{item.status === "resolvido" ? <Check size={13} /> : <span />} {item.status}</span><button className="more" onClick={(event) => event.stopPropagation()} aria-label="Mais opções"><MoreHorizontal size={19} /></button></div>
                <div className="case-body"><span className={`avatar ${item.role === "mentor" ? "avatar-mentor" : ""}`}>{item.initials}</span><div><p className="byline">{item.author}<span>·</span>{item.createdAt}</p><h2>{item.title}</h2><p className="case-excerpt">{item.excerpt}</p></div></div>
                <div className="case-question"><span>PERGUNTA À COMUNIDADE</span><p>{item.question}</p></div>
                <div className="case-foot"><div className="tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="case-metrics"><span><MediaGlyph type={item.media} /></span><button onClick={(event) => { event.stopPropagation(); setSelected(item); }}><MessageCircle size={16} />{item.comments}</button><button className={liked.includes(item.id) ? "hearted" : ""} onClick={(event) => { event.stopPropagation(); addReaction(item.id); }}><Heart size={16} fill={liked.includes(item.id) ? "currentColor" : "none"} />{item.reactions}</button></div></div>
              </article>)}
              {!visibleCases.length && <div className="empty-state"><Search size={28} /><h2>Nenhum caso encontrado</h2><p>Tente buscar por outra técnica, pessoa ou filtro.</p></div>}
            </div>
          </section>

          <aside className="detail-column">
            {selected ? <CaseDetail selected={selected} comments={commentList} commentText={commentText} setCommentText={setCommentText} submitComment={submitComment} liked={liked.includes(selected.id)} onLike={() => addReaction(selected.id)} onResolve={resolveCase} canResolve={memberRole === "mentor" || memberRole === "admin"} /> : <div className="detail-empty">Selecione um caso para entrar na discussão.</div>}
          </aside>
        </div>
        <nav className="mobile-bottom-nav" aria-label="Navegação principal">
          <button className="active"><HomeIcon size={19} /><span>Casos</span></button>
          <button onClick={() => setMessagesOpen(true)}><MessageCircle size={19} /><span>Mensagens</span></button>
          <button onClick={() => setComposerOpen(true)} className="mobile-create" aria-label="Publicar caso"><Plus size={21} /></button>
          <button onClick={() => setNoticeOpen(true)}><Bell size={19} /><span>Alertas</span></button>
          <button><UserRound size={19} /><span>Perfil</span></button>
        </nav>
      </section>

      <div className={`mobile-case-sheet ${mobileDetailOpen ? "open" : ""}`}>
        <div className="mobile-sheet-header"><span>DISCUSSÃO CLÍNICA</span><button onClick={() => setMobileDetailOpen(false)} aria-label="Fechar caso"><X size={21} /></button></div>
        {selected && <CaseDetail selected={selected} comments={commentList} commentText={commentText} setCommentText={setCommentText} submitComment={submitComment} liked={liked.includes(selected.id)} onLike={() => addReaction(selected.id)} onResolve={resolveCase} canResolve={memberRole === "mentor" || memberRole === "admin"} />}
      </div>

      {composerOpen && <CaseComposer onClose={() => setComposerOpen(false)} onPublish={(draft) => { const created: CommunityCase = { ...draft, id: Date.now(), code: `CASO ${String(cases.length + 15).padStart(3, "0")}`, author: "Dra. Juliana S.", initials: "JS", role: "aluno", createdAt: "agora", status: "em discussão", comments: 0, reactions: 0, media: "none", hasMentor: false }; setCases((old) => [created, ...old]); setSelected(created); setComposerOpen(false); }} />}
      {noticeOpen && <NotificationPanel onClose={() => setNoticeOpen(false)} />}
      {messagesOpen && <MessagesPanel onClose={() => setMessagesOpen(false)} />}
    </main>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setError(""); setNotice(""); setPending(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    if (signInError) setError("Não foi possível entrar. Verifique seu e-mail e senha.");
  };
  const resetPassword = async () => {
    if (!supabase || !email.trim()) { setError("Informe seu e-mail profissional para receber o link."); return; }
    setError(""); setNotice(""); setPending(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/?set-password=1` });
    setPending(false);
    if (resetError) setError("Não foi possível enviar o link agora. Tente novamente mais tarde.");
    else setNotice("Se este e-mail tiver acesso, você receberá um link seguro para definir uma nova senha.");
  };
  return <main className="auth-shell">
    <div className="auth-ornament auth-ornament-one" /><div className="auth-ornament auth-ornament-two" />
    <section className="auth-panel">
      <div className="auth-brand"><span className="brand-mark">K</span><div><b>KÓS</b><span>COOPERA</span></div></div>
      <div className="auth-intro"><p className="eyebrow">COMUNIDADE CLÍNICA</p><h1>O conhecimento<br /><em>continua aqui.</em></h1><p>Um ambiente reservado para a turma discutir casos, técnicas e decisões em blefaroplastia.</p></div>
      <form className="login-form" onSubmit={submit}>
        <label>E-mail profissional<div><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></div></label>
        <label>Senha<div><KeyRound size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></div></label>
        {error && <p className="login-error">{error}</p>}
        {notice && <p className="login-notice">{notice}</p>}
        <button type="submit" disabled={pending}>{pending ? "Verificando acesso…" : <>Entrar na comunidade <ArrowRight size={18} /></>}</button>
      </form>
      <button className="auth-link" type="button" onClick={() => void resetPassword()} disabled={pending}>Esqueci minha senha</button>
      <p className="auth-disclaimer"><LockKeyhole size={14} />Beta privado com dados fictícios. Ambiente educacional.</p>
    </section>
  </main>;
}

function SetPasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || password.length < 10) { setError("Use uma senha com pelo menos 10 caracteres."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setPending(true); setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) setError("O link expirou ou não é válido. Solicite uma nova senha.");
    else { window.history.replaceState({}, "", "/"); onComplete(); }
  };
  return <main className="auth-shell"><section className="auth-panel"><div className="auth-brand"><span className="brand-mark">K</span><div><b>KÓS</b><span>COOPERA</span></div></div><div className="auth-intro"><p className="eyebrow">ACESSO SEGURO</p><h1>Defina sua<br /><em>senha.</em></h1></div><form className="login-form" onSubmit={submit}><label>Nova senha<div><KeyRound size={17} /><input type="password" value={password} minLength={10} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></div></label><label>Repita a senha<div><KeyRound size={17} /><input type="password" value={confirm} minLength={10} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" /></div></label>{error && <p className="login-error">{error}</p>}<button type="submit" disabled={pending}>{pending ? "Salvando…" : "Concluir acesso"}</button></form></section></main>;
}

function ConfigurationScreen({ onPreview }: { onPreview: () => void }) {
  return <main className="auth-shell"><section className="auth-panel"><div className="auth-brand"><span className="brand-mark">K</span><div><b>KÓS</b><span>COOPERA</span></div></div><div className="auth-intro"><p className="eyebrow">BETA PRIVADO</p><h1>A comunidade está<br /><em>sendo preparada.</em></h1><p>O acesso por convite está sendo conectado. Enquanto isso, você pode conhecer a experiência mobile com conteúdo inteiramente fictício.</p></div><button className="preview-button" type="button" onClick={onPreview}>Explorar prévia do beta <ArrowRight size={18} /></button><p className="auth-disclaimer"><ShieldCheck size={14} />Sem dados clínicos reais nesta fase.</p></section></main>;
}

function LoadingScreen() {
  return <main className="auth-shell"><section className="auth-panel"><div className="auth-brand"><span className="brand-mark">K</span><div><b>KÓS</b><span>COOPERA</span></div></div><p className="auth-disclaimer">Verificando acesso seguro…</p></section></main>;
}

function CaseDetail({ selected, comments, commentText, setCommentText, submitComment, liked, onLike, onResolve, canResolve }: { selected: CommunityCase; comments: typeof initialComments; commentText: string; setCommentText: (value: string) => void; submitComment: (event: FormEvent) => void; liked: boolean; onLike: () => void; onResolve: () => void; canResolve: boolean }) {
  return <div className="detail-panel">
    <div className="detail-label"><span>{selected.code}</span><button aria-label="Mais opções"><MoreHorizontal size={19} /></button></div>
    <h2>{selected.title}</h2>
    <div className="detail-author"><span className={`avatar ${selected.role === "mentor" ? "avatar-mentor" : ""}`}>{selected.initials}</span><span><b>{selected.author}</b><small>{selected.createdAt} · {selected.mode}</small></span></div>
    <div className="detail-question"><p>O que está em discussão</p><strong>{selected.question}</strong></div>
    {selected.hasMentor && <div className="mentor-summary"><div><span className="avatar avatar-mentor">HA</span><p><b>Síntese do mentor</b><small>Dra. Helena A. · hoje</small></p><Check size={17} /></div><p>A conduta deve considerar a assimetria estática antes de qualquer ampliação do fuso. Priorize uma retirada conservadora e documente o teste de pinçamento bilateral.</p></div>}
    {!selected.hasMentor && canResolve && <button className="mentor-action" onClick={onResolve}><Sparkles size={16} />Publicar síntese de mentor</button>}
    {!selected.hasMentor && !canResolve && <p className="mentor-waiting"><Sparkles size={15} />Aguardando a síntese de um mentor.</p>}
    <div className="detail-actions"><button><MessageCircle size={17} />{selected.comments} contribuições</button><button className={liked ? "hearted" : ""} onClick={onLike}><Heart size={17} fill={liked ? "currentColor" : "none"} />{selected.reactions}</button></div>
    <div className="comments-head"><h3>Discussão</h3><span>mais recentes</span></div>
    <div className="comment-stack">{comments.map((comment, index) => <div className="comment" key={`${comment.name}-${index}`}><span className="avatar avatar-comment">{comment.initials}</span><div><p><b>{comment.name}</b><small>{comment.time}</small></p><span>{comment.text}</span><button>Responder</button></div></div>)}</div>
    <form className="comment-form" onSubmit={submitComment}><span className="avatar avatar-user">JS</span><input value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Contribua com a discussão…" /><button aria-label="Enviar comentário"><Send size={17} /></button></form>
  </div>;
}

function CaseComposer({ onClose, onPublish }: { onClose: () => void; onPublish: (draft: Omit<CommunityCase, "id" | "code" | "author" | "initials" | "role" | "createdAt" | "status" | "comments" | "reactions" | "media" | "hasMentor">) => void }) {
  const [mode, setMode] = useState<CaseMode>("roteiro clínico");
  const [agreed, setAgreed] = useState(false);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); if (!agreed || !title || !question) return; onPublish({ title, question, excerpt: "Novo caso publicado para troca de experiência com a comunidade.", mode, tags: ["Blefaroplastia", "Novo caso"] }); };
  return <div className="modal-backdrop"><form className="composer" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">NOVO CASO</p><h2>Convide a turma<br /><em>para raciocinar junto.</em></h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={22} /></button></div><div className="mode-select">{(["roteiro clínico", "texto livre", "modelo"] as CaseMode[]).map((value) => <button type="button" key={value} className={mode === value ? "active" : ""} onClick={() => setMode(value)}>{value}</button>)}</div><label>Título do caso<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Assimetria prévia em pálpebra superior" /></label>{mode === "roteiro clínico" && <div className="clinical-grid"><label>Contexto clínico<textarea placeholder="Apresente o cenário de forma anonimizável…" /></label><label>Avaliação e hipótese<textarea placeholder="Quais são os achados relevantes?" /></label></div>}{mode === "modelo" && <label>Modelo de caso<select><option>Planejamento pré-operatório</option><option>Complicação / intercorrência</option><option>Acompanhamento pós-operatório</option></select></label>}<label>Pergunta para a comunidade<textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Que decisão, técnica ou conduta você quer discutir?" /></label><button type="button" className="attachment"><Paperclip size={17} />Adicionar imagens, PDF ou vídeo <small>privado</small></button><label className="privacy-check"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>Confirmo que o caso e os anexos foram anonimizados e que tenho base legal para este compartilhamento educacional.</span></label><div className="composer-foot"><p><ShieldCheck size={16} />Visível somente à Turma 03</p><button className="publish" disabled={!agreed || !title || !question}>Publicar caso <Send size={16} /></button></div></form></div>;
}

function NotificationPanel({ onClose }: { onClose: () => void }) { return <div className="floating-panel notifications"><div><h3>Atualizações</h3><button onClick={onClose}><X size={18} /></button></div><button className="notification-item unread"><span className="avatar avatar-mentor">HA</span><p><b>Dra. Helena comentou no seu caso</b><small>“Confira a relação com a sobrancelha…” · agora</small></p></button><button className="notification-item"><span className="avatar avatar-comment">MA</span><p><b>Você foi mencionada em Caso 014</b><small>há 26 min</small></p></button><button className="notification-item"><span className="notice-icon"><Check size={15} /></span><p><b>Caso 009 recebeu síntese de mentor</b><small>ontem</small></p></button></div>; }

function MessagesPanel({ onClose }: { onClose: () => void }) { return <div className="modal-backdrop message-backdrop"><div className="messages-modal"><div className="modal-head"><div><p className="eyebrow">CONVERSAS PRIVADAS</p><h2>Entre colegas.</h2></div><button onClick={onClose}><X size={22} /></button></div><div className="message-contact"><span className="avatar avatar-mentor">HA</span><p><b>Dra. Helena A.</b><small>Mentora · online agora</small></p></div><div className="message-bubble">Oi, Juliana. Vi sua pergunta no Caso 014 — posso explicar meu raciocínio depois da discussão coletiva.</div><div className="message-bubble mine">Obrigada, Dra. Helena. Vou complementar a documentação antes.</div><form className="dm-form" onSubmit={(event) => event.preventDefault()}><input placeholder="Escreva uma mensagem privada" /><button><Send size={17} /></button></form></div></div>; }
