import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/server-supabase";

export async function PATCH(request: Request) {
  try {
    const { admin, user } = await requireAdmin(request);
    const body = await request.json() as { cohortId?: string; userId?: string; role?: "aluno" | "mentor" | "admin"; active?: boolean };
    if (!body.cohortId || !body.userId || (body.role === undefined && body.active === undefined)) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    const update: Record<string, unknown> = {};
    if (body.role) update.role = body.role;
    if (typeof body.active === "boolean") update.active = body.active;
    const { error } = await admin.from("memberships").update(update).eq("cohort_id", body.cohortId).eq("user_id", body.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("audit_logs").insert({ actor_id: user.id, action: "membership_update", target_type: "membership", target_id: body.userId, metadata: { cohortId: body.cohortId, ...update } });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha." }, { status: 403 }); }
}
