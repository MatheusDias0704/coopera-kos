import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getAdminClient() {
  if (!url || !key) throw new Error("Configuração de servidor do Supabase ausente.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function requireAdmin(request: Request, cohortId: string) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) throw new Error("Não autenticado.");
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) throw new Error("Sessão inválida.");
  const { data: membership, error: membershipError } = await admin.from("memberships").select("role").eq("cohort_id", cohortId).eq("user_id", user.id).eq("active", true).eq("role", "admin").maybeSingle();
  if (membershipError || !membership) throw new Error("Permissão administrativa nesta turma necessária.");
  return { admin, user };
}
