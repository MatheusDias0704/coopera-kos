import assert from "node:assert/strict";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const healthUrl = new URL("/api/health", baseUrl);
const response = await fetch(healthUrl, { signal: AbortSignal.timeout(10_000) });
assert.equal(response.status, 200, "Health endpoint must return HTTP 200");
const health = await response.json();
assert.equal(health.status, "ok");
assert.equal(health.service, "coopera-kos");
assert.ok(Number.isFinite(Date.parse(health.timestamp)), "Health timestamp must be valid");
for (const path of ["/", "/termos", "/privacidade", "/suporte", "/remocao", "/exclusao"]) {
  const page = await fetch(new URL(path, baseUrl), { signal: AbortSignal.timeout(10_000) });
  assert.equal(page.status, 200, `${path} must be publicly reachable`);
}
console.log(`Smoke passed: ${healthUrl.origin}`);
