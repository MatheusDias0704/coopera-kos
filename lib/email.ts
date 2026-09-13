type Delivery = { id: string; recipient_email: string; subject: string; html: string };

export async function deliverWithResend(delivery: Delivery) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { status: "queued" as const, providerId: null };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [delivery.recipient_email], subject: delivery.subject, html: delivery.html }),
  });
  if (!response.ok) throw new Error(`Resend respondeu ${response.status}`);
  const body = await response.json() as { id?: string };
  return { status: "sent" as const, providerId: body.id ?? null };
}
