import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/server-supabase";

function isMissingCohortAuditColumn(message: string) {
  return /cohort_id|schema cache|column/i.test(message);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { cohortId?: string; userId?: string; role?: "aluno" | "mentor" | "admin"; active?: boolean };
    if (!body || typeof body.cohortId !== "string" || typeof body.userId !== "string" || !body.cohortId || !body.userId ||
      (body.role === undefined && body.active === undefined) ||
      (body.role !== undefined && !["aluno", "mentor", "admin"].includes(body.role)) ||
      (body.active !== undefined && typeof body.active !== "boolean")) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    const { admin, user } = await requireAdmin(request, body.cohortId);
    if (body.userId === user.id && (body.active === false || (body.role !== undefined && body.role !== "admin"))) return NextResponse.json({ error: "Peça a outro administrador para alterar seu próprio acesso." }, { status: 400 });
    const update: Record<string, unknown> = {};
    if (body.role) update.role = body.role;
    if (typeof body.active === "boolean") update.active = body.active;
    const { data, error } = await admin.from("memberships").update(update).eq("cohort_id", body.cohortId).eq("user_id", body.userId).select("user_id").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Participante não encontrado nesta turma." }, { status: 404 });
    const auditPayload = { actor_id: user.id, cohort_id: body.cohortId, action: "membership_update", target_type: "membership", target_id: body.userId, metadata: { cohortId: body.cohortId, ...update } };
    const { error: auditError } = await admin.from("audit_logs").insert(auditPayload);
    if (auditError) {
      const { cohort_id: _cohortId, ...legacyAuditPayload } = auditPayload;
      const { error: legacyAuditError } = isMissingCohortAuditColumn(auditError.message) ? await admin.from("audit_logs").insert(legacyAuditPayload) : { error: auditError };
      if (legacyAuditError) return NextResponse.json({ error: `Acesso alterado, mas a auditoria falhou: ${legacyAuditError.message}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha." }, { status: 403 }); }
}
