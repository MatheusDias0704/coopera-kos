import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/server-supabase";

export async function POST(request: Request) {
  try {
    const { admin, user } = await requireAdmin(request);
    const body = await request.json() as { email?: string; fullName?: string; cohortId?: string; role?: "aluno" | "mentor" | "admin" };
    const email = body.email?.trim().toLowerCase();
    if (!email || !body.cohortId || !body.fullName || !body.role) return NextResponse.json({ error: "Dados de convite incompletos." }, { status: 400 });
    const origin = new URL(request.url).origin;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: body.fullName }, redirectTo: `${origin}/?set-password=1`,
    });
    if (error || !data.user) return NextResponse.json({ error: error?.message || "Não foi possível criar o convite." }, { status: 400 });
    const initials = body.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    await admin.from("profiles").upsert({ id: data.user.id, full_name: body.fullName.trim(), initials });
    const { error: membershipError } = await admin.from("memberships").upsert({ cohort_id: body.cohortId, user_id: data.user.id, role: body.role, active: true });
    if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 400 });
    await admin.from("audit_logs").insert({ actor_id: user.id, action: "invite", target_type: "membership", target_id: data.user.id, metadata: { email, role: body.role, cohortId: body.cohortId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao convidar." }, { status: 403 });
  }
}
