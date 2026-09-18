import { NextResponse } from "next/server";
import { Discussion } from "@coopera/domain";
import { getAdminClient } from "../../../../lib/server-supabase";

function isMissingCohortAuditColumn(message: string) {
  return /cohort_id|schema cache|column/i.test(message);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { caseId?: string; body?: string };
    if (!body?.caseId || typeof body.caseId !== "string" || typeof body.body !== "string") return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    const summary = Discussion.summary(body.body);
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    const admin = getAdminClient();
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    const { data: clinicalCase, error: caseError } = await admin.from("clinical_cases").select("id,cohort_id,status").eq("id", body.caseId).maybeSingle();
    if (caseError) return NextResponse.json({ error: caseError.message }, { status: 400 });
    if (!clinicalCase) return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });
    if (clinicalCase.status === "oculto") return NextResponse.json({ error: "Restaure o caso antes de publicar uma síntese." }, { status: 400 });
    const { data: membership, error: membershipError } = await admin.from("memberships").select("role").eq("cohort_id", clinicalCase.cohort_id).eq("user_id", user.id).eq("active", true).in("role", ["mentor", "admin"]).maybeSingle();
    if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 400 });
    if (!membership) return NextResponse.json({ error: "Apenas mentor ou administrador ativo da turma pode publicar síntese." }, { status: 403 });
    const { data: inserted, error: insertError } = await admin.from("mentor_summaries").insert({ case_id: body.caseId, mentor_id: user.id, body: summary }).select("id").maybeSingle();
    if (insertError) {
      const duplicate = insertError.code === "23505" || /duplicate|unique/i.test(insertError.message);
      return NextResponse.json({ error: duplicate ? "Este caso já possui uma síntese registrada." : insertError.message }, { status: 400 });
    }
    await admin.from("clinical_cases").update({ status: "resolvido", resolved_at: new Date().toISOString() }).eq("id", body.caseId);
    const auditPayload = { actor_id: user.id, cohort_id: clinicalCase.cohort_id, action: "mentor_summary_create", target_type: "clinical_case", target_id: body.caseId, metadata: { summaryId: inserted?.id } };
    const { error: auditError } = await admin.from("audit_logs").insert(auditPayload);
    if (auditError) {
      const { cohort_id: _cohortId, ...legacyAuditPayload } = auditPayload;
      const { error: legacyAuditError } = isMissingCohortAuditColumn(auditError.message) ? await admin.from("audit_logs").insert(legacyAuditPayload) : { error: auditError };
      if (legacyAuditError) return NextResponse.json({ error: `Síntese registrada, mas a auditoria falhou: ${legacyAuditError.message}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível publicar a síntese." }, { status: 400 });
  }
}
