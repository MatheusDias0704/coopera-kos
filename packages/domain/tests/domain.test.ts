import assert from "node:assert/strict";
import { test } from "node:test";
import { AdminOperations, ClinicalCases, CohortAccess, Discussion, IdentityAccess, LegalConsent, Messaging, PrivateMedia } from "../src/index.ts";
import type { CaseInput, Membership } from "../src/types.ts";

const member: Membership = { cohort_id: "cohort-a", role: "aluno", active: true, cohorts: null };
const caseInput: CaseInput = { cohortId: "cohort-a", title: "Discussão educacional", mode: "texto_livre", communityQuestion: "Como vocês conduziriam esse caso?", body: "Descrição anonimizada", privacyAcknowledged: true };

test("permissions deny missing, inactive and cross-cohort membership", () => {
  assert.equal(CohortAccess.can(null, "read"), false);
  assert.equal(CohortAccess.can({ ...member, active: false }, "create"), false);
  assert.equal(CohortAccess.can(member, "read", { cohortId: "other" }), false);
  assert.equal(CohortAccess.can(member, "admin"), false);
  assert.equal(CohortAccess.can({ ...member, role: "mentor" }, "resolve", { cohortId: "cohort-a", status: "em_discussao" }), true);
  assert.equal(CohortAccess.can(member, "resolve", { cohortId: "cohort-a", status: "em_discussao" }), false);
  assert.equal(CohortAccess.can({ ...member, role: "admin" }, "read", { cohortId: "other", status: "oculto" }), false);
  assert.equal(CohortAccess.can({ ...member, role: "admin" }, "read", { cohortId: "cohort-a", status: "oculto" }), true);
});
test("only author can edit their open case", () => {
  assert.equal(CohortAccess.can(member, "edit", { cohortId: "cohort-a", authorId: "a", userId: "a", status: "em_discussao" }), true);
  assert.equal(CohortAccess.can(member, "edit", { cohortId: "cohort-a", authorId: "a", userId: "b", status: "em_discussao" }), false);
  assert.equal(CohortAccess.can(member, "edit", { cohortId: "cohort-a", authorId: "a", userId: "a", status: "resolvido" }), false);
});
test("case publication validates consent and all field limits", () => {
  assert.throws(() => ClinicalCases.prepare({ ...caseInput, privacyAcknowledged: false }));
  assert.throws(() => ClinicalCases.prepare({ ...caseInput, body: "" }));
  assert.throws(() => ClinicalCases.prepare({ ...caseInput, communityQuestion: "curta" }));
  assert.throws(() => ClinicalCases.prepare({ ...caseInput, tags: Array.from({ length: 9 }, (_, n) => String(n)) }));
  assert.deepEqual(ClinicalCases.prepare({ ...caseInput, tags: [" técnica ", "técnica"] }).tags, ["técnica"]);
});
test("private attachments enforce size, type and nonempty content", () => {
  assert.equal(PrivateMedia.validate({ name: "caso.pdf", type: "application/pdf", size: 100 }).kind, "pdf");
  for (const invalid of [{ size: 0, type: "image/png" }, { size: 52428801, type: "image/png" }, { size: 100, type: "image/svg+xml" }]) assert.throws(() => PrivateMedia.validate({ name: "arquivo", ...invalid }));
});
test("legal consent fails closed and invalidates older acceptances", () => {
  assert.equal(LegalConsent.hasAcceptedCurrentVersions([], []), false);
  const documents = [{ slug: "terms", version: "v2", title: "Termos" }];
  assert.equal(LegalConsent.hasAcceptedCurrentVersions(documents, [{ document_slug: "terms", document_version: "v1" }]), false);
  assert.equal(LegalConsent.hasAcceptedCurrentVersions(documents, [{ document_slug: "terms", document_version: "v2" }]), true);
});
test("reports have exactly one target and admin cannot revoke self", () => {
  assert.throws(() => Discussion.report({ reason: "Conteúdo irregular" }));
  assert.throws(() => Discussion.report({ caseId: "a", commentId: "b", reason: "Conteúdo irregular" }));
  assert.throws(() => AdminOperations.membership("a", "a", { active: false }));
  assert.throws(() => AdminOperations.membership("a", "a", { role: "aluno" }));
  assert.deepEqual(AdminOperations.membership("a", "b", { active: false }), { active: false });
  assert.equal(IdentityAccess.credentials(" A@Example.com ", "password").email, "a@example.com");
  assert.equal(IdentityAccess.password(" password "), " password ");
  assert.throws(() => Messaging.block("a", "a"));
  assert.deepEqual(Messaging.block("a", "b"), { blocker_id: "a", blocked_id: "b" });
});

test("mentor summary validates minimum length before database insert", () => {
  assert.throws(() => Discussion.summary("tudo beemm"), /20 a 8000/);
  assert.equal(Discussion.summary("Síntese educacional objetiva."), "Síntese educacional objetiva.");
});
