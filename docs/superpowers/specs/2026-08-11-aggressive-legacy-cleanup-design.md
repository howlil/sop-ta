# Aggressive Legacy Cleanup Design

> **Historical implementation record — not the current development contract.** This document captures a past plan and may name code, flags, or UI props already removed. Follow `AGENTS.md`, `.agents/engineering.md`, and current production code/tests for current behavior.

Date: 2026-08-11
Branch: `cleanup/legacy-code-docs`
Target: `main`

## Goal

Remove legacy compatibility code, dead source paths, stale configuration surfaces, generated documentation artifacts, and documentation that no longer matches the implemented SOPFlow architecture. The cleanup should make the repository easier to understand and maintain, while keeping the current business workflow unchanged.

This cleanup is intentionally more aggressive than a compatibility-preserving refactor. Some old deployment/data formats will no longer be supported after upgrade.

## Branch and open-PR policy

The cleanup branch is based directly on the current `main` and must not depend on PR #9, #10, #13, or #14. Where this cleanup overlaps the minimal-env work in PR #13, the implementation should preserve the same intended end state without making this branch depend on that PR. If both PRs remain open, conflicts must be resolved explicitly before either is merged.

## Scope

### Backend

1. Remove the opt-in legacy demo workflow seeding path controlled by `SEED_INCLUDE_WORKFLOW_DUMMY`.
2. Remove helper methods, constants, imports, and fixture data used only by that legacy workflow seed path.
3. Remove `WHATSAPP_ENABLED` as a runtime compatibility flag.
4. WhatsApp outbound becomes enabled only when both `WHAAPI_TOKEN` and `WHAAPI_CHANNEL_ID` are configured.
5. If only one WhatsApp credential is configured, environment validation must fail at startup.
6. Remove legacy P12 passphrase ciphertext decryption support from `tte-crypto.util.ts`.
7. Keep only the current versioned P12 passphrase format using server-side `TTE_ENCRYPTION_SECRET` + user PIN.
8. Remove tests that exist only to validate deleted compatibility behavior, and replace them with tests that reject legacy ciphertext explicitly.
9. Preserve current personal P12 certificate/private-key storage model and PDF signing behavior.

### Breaking migration behavior

Legacy P12 passphrase ciphertext created before the current server-secret-backed format will no longer be decryptable after this cleanup. Affected users must set up/upload their TTE credential again after upgrade. No automatic migration is possible without the user's PIN.

The cleanup must document this breaking behavior clearly in upgrade/TTE documentation.

### Frontend

1. Remove deprecated or dead internal types/components with zero active consumers.
2. Migrate active uses of legacy CSS utility aliases to the canonical design tokens/classes.
3. Remove compatibility aliases only after repository search confirms zero active references.
4. Do not redesign the UI or alter business behavior as part of this cleanup.
5. Do not mix the known evaluator J04 multi-SOP selection bug into this PR.

### Configuration

1. Remove `WHATSAPP_ENABLED` from production configuration, Compose, tests, CI, and docs.
2. Keep secrets such as JWT secrets, DB password, and `TTE_ENCRYPTION_SECRET` external to source control.
3. Do not add new environment knobs for stable runtime values.
4. When this branch touches configuration also changed by PR #13, preserve the minimal operator-facing configuration goal rather than reintroducing tuning variables.

### Documentation

1. Rewrite `docs/detail_workflow_dan_teknis_tte.md` to describe the actual implementation:
   - internal SOPFlow TTE simulation,
   - personal PKCS#12/P12 credentials per user,
   - MariaDB persistence,
   - encrypted P12 passphrase,
   - local persistent Docker volume for signed PDF artifacts,
   - internal QR/signature verification,
   - no production HSM/KMS/OCSP/TSA/MinIO architecture unless explicitly marked as future/production-grade guidance.
2. Update `docs/tanda_tangan_elektronik_dan_ca.md` so implemented behavior and production recommendations are clearly separated.
3. Update `docs/arsitektur-sistem.md` to match current runtime ports, services, storage, and reverse-proxy deployment.
4. Rename typoed `docs/interation-test.md` to `docs/integration-test.md` and update its current integration-test inventory.
5. Remove `docs/unit-test-coverage-output.txt` if it is generated/raw output rather than authored documentation.
6. Mark historical test/UAT/coverage reports as snapshots when their numbers are not guaranteed to represent the current branch.
7. Update repository cross-links and E2E documentation after file renames/removals.

## Explicit non-goals

- Do not fix the known J04 evaluator multi-SOP selection bug in this cleanup.
- Do not redesign business workflows.
- Do not change Prisma domain models merely to make the cleanup easier.
- Do not upgrade dependencies as part of this PR.
- Do not replace internal TTE with an external PSrE/BSrE/HSM integration.
- Do not merge unrelated open testing/config PRs into this cleanup.

## Safety rules

1. Search for every symbol/file before deletion and verify zero required consumers remain.
2. Add or adjust tests before deleting compatibility behavior where the changed contract is externally observable.
3. For TTE ciphertext, explicitly test that the current format still encrypts/decrypts and that legacy unversioned ciphertext is rejected.
4. For WhatsApp configuration, test: no credentials = disabled; both credentials = enabled; partial credentials = startup validation error.
5. For CSS alias removal, repository search must show zero references to each removed alias.
6. Documentation must distinguish implemented architecture from production-grade recommendations.

## Verification

Before declaring the cleanup complete:

- backend typecheck passes;
- backend lint passes;
- backend unit tests pass;
- backend build passes;
- frontend typecheck passes;
- frontend lint passes;
- frontend unit tests pass;
- frontend build passes;
- repository search shows removed legacy symbols/classes are gone;
- documentation links resolve to existing repository paths;
- current P12 signing unit/integration coverage still passes;
- WhatsApp reminder tests pass under the new credential-pair contract;
- CI results are inspected and any pre-existing unrelated failures are identified separately rather than hidden.

## Rollout note

This PR contains deliberate breaking compatibility cleanup. Before deploying over an environment that may contain old TTE ciphertext, operators must notify affected signing users that TTE setup may need to be performed again. Database backup should be taken before deployment. The cleanup does not delete P12 data automatically; it removes the old decryption path.