import { NextResponse } from "next/server";
import { deliverWithResend } from "../../../../lib/email";
import { getAdminClient } from "../../../../lib/server-supabase";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const admin = getAdminClient();
    const { data: queued, error } = await admin.from("email_deliveries").select("id, recipient_email, subject, html").eq("status", "queued").lt("attempts", 5).limit(25);
    if (error) throw error;
    for (const delivery of queued ?? []) {
      try {
        const result = await deliverWithResend(delivery);
        await admin.from("email_deliveries").update({ status: result.status, provider_id: result.providerId, attempts: 1, sent_at: result.status === "sent" ? new Date().toISOString() : null }).eq("id", delivery.id);
      } catch (sendError) {
        await admin.from("email_deliveries").update({ status: "failed", attempts: 1, last_error: sendError instanceof Error ? sendError.message : "Erro de entrega" }).eq("id", delivery.id);
      }
    }
    return NextResponse.json({ processed: queued?.length ?? 0 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha." }, { status: 500 }); }
}
