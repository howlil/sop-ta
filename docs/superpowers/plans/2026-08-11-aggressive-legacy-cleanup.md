# Aggressive Legacy Cleanup Implementation Plan

> **Historical implementation record — not the current development contract.** This document captures a past plan and may name code, flags, or UI props already removed. Follow `AGENTS.md`, `.agents/engineering.md`, and current production code/tests for current behavior.

Date: 2026-08-11
Branch: `cleanup/legacy-code-docs`
Target: `main`

## Goal

Execute the approved aggressive cleanup without changing the SOP business workflow. Remove obsolete compatibility surfaces, dead code, and stale documentation; preserve current TTE/PDF behavior; and leave the repository with tests and documentation that describe the actual implementation.

## Task 1 — WhatsApp credential-pair contract

Files to inspect/update:
- `server/src/config/env.validation.spec.ts`
- `server/src/config/env.validation.ts`
- `server/src/modules/notifications/reminders/providers/whaapi.provider.spec.ts` or the nearest provider tests
- `server/src/modules/notifications/reminders/providers/whaapi.provider.ts`
- `server/src/modules/notifications/reminders/notification-reminder-scheduler.service.spec.ts`
- `server/src/modules/notifications/reminders/notification-reminder-scheduler.service.ts`
- `server/test/integration/whatsapp-reminder-e2e.integration-spec.ts`
- `server/.env.test`
- `.env.example`
- `compose.yml`
- `.github/workflows/ci.yml`
- documentation references found by repository search

Steps:
1. Add/adjust tests first for the new contract: no credentials = disabled; both credentials = enabled; token-only/channel-only = environment validation error.
2. Run focused tests and confirm the old implementation fails the new expectations.
3. Remove `WHATSAPP_ENABLED` from schema and runtime consumers.
4. Derive provider/scheduler availability only from the credential pair.
5. Remove the flag from Compose, test env, CI and docs.
6. Re-run focused unit/integration tests.

## Task 2 — TTE passphrase ciphertext v2 only

Files:
- `server/src/modules/tte/shared/utils/tte-crypto.util.spec.ts`
- `server/src/modules/tte/shared/utils/tte-crypto.util.ts`
- direct consumers found by search

Steps:
1. Add/adjust a test asserting valid `v2:` ciphertext round-trips.
2. Add/adjust a test asserting unversioned legacy ciphertext is rejected.
3. Run the focused spec and observe failure while legacy fallback still exists.
4. Remove `deriveLegacyKey`, `isLegacyP12PassphraseCiphertext`, `decryptLegacy`, and the fallback branch.
5. Keep strict version/shape validation for the v2 payload.
6. Re-run focused TTE tests and signing-related tests.

## Task 3 — Legacy workflow seed removal

Files:
- `server/src/database/seed/seed.service.ts`
- related seed tests/helpers if present
- docs/env references found by search

Steps:
1. Search every `SEED_INCLUDE_WORKFLOW_DUMMY` reference and workflow-only helper/constant.
2. Remove the opt-in workflow-dummy branch from `SeedService.run()`.
3. Remove helper methods, constants, fixture arrays, imports and types proven to be used only by that branch.
4. Keep base/master-data seed behavior, including the configurable seed user password where still used.
5. Run backend typecheck/lint/tests to catch any over-deletion.

## Task 4 — Frontend dead code and CSS compatibility aliases

Files:
- exact router/diagram file containing deprecated `CellInfo`
- stylesheet/token files defining compatibility aliases
- active client components/pages still using those aliases

Steps:
1. Search exact deprecated symbols and alias classes.
2. Remove zero-consumer deprecated types/components.
3. Replace active legacy utility aliases with canonical design-token utilities.
4. Remove alias definitions only after repository search reports zero active references.
5. Run client typecheck, lint, unit tests, and build.
6. Do not touch the known J04 multi-SOP selection behavior.

## Task 5 — Documentation synchronization

Files:
- `docs/detail_workflow_dan_teknis_tte.md`
- `docs/tanda_tangan_elektronik_dan_ca.md`
- `docs/arsitektur-sistem.md`
- `docs/interation-test.md` -> `docs/integration-test.md`
- `docs/unit-test-coverage-output.txt`
- historical test/result documents
- `client/e2e/README.md`
- cross-links found by search

Steps:
1. Rewrite TTE documentation around the implemented internal model: personal PKCS#12, MariaDB credentials, encrypted passphrase, internal signing/QR verification, and persistent local PDF volume.
2. Separate implemented behavior from production-grade PSrE/BSrE/HSM recommendations.
3. Update runtime architecture to frontend nginx `8080`, backend `3001`, MariaDB `3306`, reverse proxy/public ingress, and signed-PDF persistent storage.
4. Rename the typoed integration-test document and synchronize its actual suite inventory.
5. Delete the raw generated coverage output file.
6. Mark historical numerical test/UAT/coverage documents as snapshots where applicable.
7. Repair links affected by renamed/deleted files.

## Task 6 — Repository-wide verification and PR

Verification commands/gates:
- backend typecheck
- backend lint
- backend unit tests
- backend build
- focused TTE tests
- focused WhatsApp/reminder tests
- frontend typecheck
- frontend lint
- frontend unit tests
- frontend build
- repository search confirms removed symbols (`WHATSAPP_ENABLED`, `SEED_INCLUDE_WORKFLOW_DUMMY`, legacy P12 helpers, removed CSS aliases) are absent except deliberate migration notes
- documentation links point to existing files
- inspect GitHub Actions for the cleanup branch

If CI still fails at the already-known J04 evaluator multi-SOP selection test while all cleanup-specific gates pass, document it as a pre-existing unrelated failure rather than weakening the assertion.

Finally open a dedicated pull request from `cleanup/legacy-code-docs` to `main`. Do not merge it without an explicit user request.