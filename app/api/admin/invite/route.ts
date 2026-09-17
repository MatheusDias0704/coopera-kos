import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/server-supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; fullName?: string; cohortId?: string; role?: "aluno" | "mentor" | "admin" };
    if (!body || typeof body.email !== "string" || typeof body.cohortId !== "string" || typeof body.fullName !== "string" || !body.cohortId || !body.role || !["aluno", "mentor", "admin"].includes(body.role)) return NextResponse.json({ error: "Dados de convite inválidos." }, { status: 400 });
    const email = body.email.trim().toLowerCase();
    const fullName = body.fullName.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2 || fullName.length > 100) return NextResponse.json({ error: "Informe e-mail válido e nome de 2 a 100 caracteres." }, { status: 400 });
    const { admin, user } = await requireAdmin(request, body.cohortId);
    const origin = new URL(request.url).origin;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName }, redirectTo: `${origin}/?set-password=1`,
    });
    if (error || !data.user) return NextResponse.json({ error: error?.message || "Não foi possível criar o convite." }, { status: 400 });
    const initials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, full_name: fullName, initials });
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
    const { error: membershipError } = await admin.from("memberships").upsert({ cohort_id: body.cohortId, user_id: data.user.id, role: body.role, active: true });
    if (membershipError) return NextResponse.json({ error: membershipError.message }, { status: 400 });
    await admin.from("audit_logs").insert({ actor_id: user.id, action: "invite", target_type: "membership", target_id: data.user.id, metadata: { email, role: body.role, cohortId: body.cohortId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao convidar." }, { status: 403 });
  }
}
