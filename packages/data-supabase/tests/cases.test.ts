import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCoopera } from "../src/index.ts";

test("mentor summary resolves through protected server action", async () => {
  const calls: Array<{ url: string; body: unknown; authorization: string | null }> = [];
  const client = { auth: { getSession: async () => ({ data: { session: { access_token: "token" } }, error: null }) } };
  const app = createCoopera(client as unknown as SupabaseClient, {
    fetch: async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)), authorization: new Headers(init?.headers).get("authorization") });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });
  await assert.rejects(app.cases.resolve("case-1", "curta"), /20 a 8000/);
  assert.equal(calls.length, 0);
  await app.cases.resolve("case-1", "Síntese educacional objetiva.");
  assert.deepEqual(calls, [{ url: "/api/cases/resolve", body: { caseId: "case-1", body: "Síntese educacional objetiva." }, authorization: "Bearer token" }]);
});
