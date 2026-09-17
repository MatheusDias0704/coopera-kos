import { NextResponse } from "next/server";
import { getAdminClient } from "../../../../lib/server-supabase";

const BETA_COHORT_NAME = "Coopera Kós · Beta";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CK";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string; fullName?: string; acceptedTerms?: boolean };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const fullName = body.fullName?.trim() ?? "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Crie uma senha com pelo menos 8 caracteres." }, { status: 400 });
    if (fullName.length < 2 || fullName.length > 100) return NextResponse.json({ error: "Informe seu nome completo." }, { status: 400 });
    if (!body.acceptedTerms) return NextResponse.json({ error: "Aceite os termos para criar sua conta." }, { status: 400 });

    const admin = getAdminClient();
    const { data: cohort, error: cohortError } = await admin
      .from("cohorts")
      .upsert({ name: BETA_COHORT_NAME }, { onConflict: "name" })
      .select("id")
      .single();
    if (cohortError || !cohort) throw cohortError ?? new Error("Turma beta indisponível.");

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError || !created.user) {
      const exists = /already|registered|exists/i.test(createError?.message ?? "");
      return NextResponse.json({ error: exists ? "Esta conta já existe. Entre com sua senha ou use a recuperação." : "Não foi possível criar sua conta agora." }, { status: exists ? 409 : 400 });
    }

    const userId = created.user.id;
    const { error: profileError } = await admin.from("profiles").upsert({ id: userId, full_name: fullName, initials: initials(fullName) });
    const { error: membershipError } = await admin.from("memberships").upsert({ cohort_id: cohort.id, user_id: userId, role: "aluno", active: true });
    if (profileError || membershipError) {
      await admin.auth.admin.deleteUser(userId);
      throw profileError ?? membershipError;
    }

    const { data: documents } = await admin.from("legal_documents").select("slug,version").eq("active", true);
    if (documents?.length) {
      await admin.from("legal_acceptances").upsert(documents.map((document) => ({
        user_id: userId,
        document_slug: document.slug,
        document_version: document.version,
      })), { onConflict: "user_id,document_slug,document_version" });
    }

    await admin.from("audit_logs").insert({ actor_id: userId, action: "self_register", target_type: "membership", target_id: userId, metadata: { cohortId: cohort.id, email } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao criar conta." }, { status: 500 });
  }
}
