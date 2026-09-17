import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCoopera } from "../src/index.ts";

function memoryAdapter({ registrationFails = false, cleanupFails = false } = {}) {
  const objects = new Map<string, Blob | ArrayBuffer>();
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "author" } }, error: null }) },
    from: () => ({ insert: async () => ({ error: registrationFails ? { message: "Database unavailable" } : null, data: null }) }),
    storage: { from: () => ({
      upload: async (path: string, body: Blob | ArrayBuffer) => { objects.set(path, body); return { data: { path }, error: null }; },
      remove: async (paths: string[]) => { if (!cleanupFails) paths.forEach(path => objects.delete(path)); return { error: cleanupFails ? { message: "Unavailable" } : null, data: null }; },
      createSignedUrl: async (path: string, seconds: number) => ({ data: { signedUrl: `https://storage.example.test/${path}?expires=${seconds}` }, error: null }),
    }) },
  };
  return { objects, app: createCoopera(client as unknown as SupabaseClient, { randomId: () => "random-id" }) };
}
const file = { name: "case.pdf", type: "application/pdf", size: 8, body: new ArrayBuffer(8) };
test("private media registers upload and returns a short-lived URL", async () => {
  const { app, objects } = memoryAdapter();
  const { path } = await app.media.upload("case", "cohort", file);
  assert.equal(objects.size, 1);
  assert.equal(path, "cohort/case/random-id-case.pdf");
  assert.match(await app.media.getTemporaryUrl(path), /expires=60$/);
});
test("failed registration compensates the uploaded object", async () => {
  const { app, objects } = memoryAdapter({ registrationFails: true });
  await assert.rejects(app.media.upload("case", "cohort", file), /registrar o anexo/);
  assert.equal(objects.size, 0);
});
test("failed cleanup is visible, and rejected file never uploads", async () => {
  const { app, objects } = memoryAdapter({ registrationFails: true, cleanupFails: true });
  await assert.rejects(app.media.upload("case", "cohort", file), /limpeza pendente/);
  assert.equal(objects.size, 1);
  await assert.rejects(app.media.upload("case", "cohort", { ...file, type: "text/html" }), /Use imagem/);
  assert.equal(objects.size, 1);
});
