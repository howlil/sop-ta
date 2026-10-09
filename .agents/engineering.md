# SOP-TA — Engineering contract

This file specifies runtime responsibility and state ownership. Root `AGENTS.md` governs the engineering workflow; existing `.agent/skills/` provide the methods.

## System

```text
HTTP / JWT / authorization
  ├─ Core: identity, OPD membership, user roles
  ├─ SOP: document versions, editability, procedure, diagram, publication state
  ├─ Evaluation: submission membership, scores, comments, evaluation state
  ├─ TTE: credentials, certificate signing, signature evidence
  ├─ Notification: delivery and channels
  └─ Work items: read-only projection of actionable work
                    ↓
             Prisma / MariaDB
```

This is one modular monolith and one transactional database. Do not introduce services, queues, generic workflow engines, or repositories merely to rearrange files.

## State ownership and invariants

| State | Authoritative owner | Guarantee |
| --- | --- | --- |
| `DetailSOP` lifecycle, SOP versions | SOP | Only legal transitions; obsolete versions are not silently republished; edits on non-editable versions are rejected |
| SOP authoring revision | SOP | Every autosave conditionally claims the expected revision |
| `PengajuanEvaluasi`, `NilaiEvaluasi`, `LogNilaiEvaluasi` | Evaluation | Submission creation and evaluation completion atomically update member SOP state |
| `DokumenTte`, signature metadata, `RiwayatTandaTangan` | TTE | No partial successful signing and no duplicate accepted publication |
| Official PDF contents/path | SOP PDF storage, orchestrated by TTE | Signing attempts write unique files; only finalized paths become published; failed cleanup never removes a committed artifact |
| OPD membership/access | Core | Caller must be authorized and OPD-scoped before cross-domain reads or writes |

Cross-domain writes are permitted **only inside a named atomic use case** and must re-check current state in the transaction. A repository can coordinate multiple tables in one Prisma transaction when splitting it would weaken atomicity. A module folder alone is not an ownership boundary.

## Contracts / dependency rules

1. Controllers own HTTP parsing and guards, services own application decisions, repositories own database operations and concurrency enforcement. Do not implement cross-domain business decisions inside a generic `common` utility.
2. `common` is framework-neutral shared infrastructure (validation, auth, Prisma, dates, logging), not a place for SOP or Evaluation-specific lifecycle policies or DTOs.
3. Evaluation may read SOP's public workbench contract; it must not reach into SOP's private authoring helpers. TTE may orchestrate the publication transaction but must use SOP's lifecycle preconditions.
4. `GET` endpoints cannot create submissions or change persisted workflow state. `POST /evaluasi/workspace/opd/:opdId/ensure-submission` is the explicit, idempotent bootstrap command.
5. For a state transition based on previously loaded status, condition the write on `expectedStatus` (and version where available). Losing a race is `409 Conflict`, not a silently accepted transition.
6. Never `return { error }` from an interactive database transaction **after a previous write**: throw to force rollback, then map the domain error outside the transaction.
7. Never write a signed PDF to a shared deterministic path that another request could publish or clean up. A failed signing attempt may delete **its own** distinct artifact only.

## Critical runtime flows

```text
SOP authoring PATCH
  → authorize OPD + editability
  → validate input
  → conditional revision write + log in one transaction
  → return workbench

Evaluator workspace opening
  → explicit ensure-submission POST
  → authorized + locked evaluation submission create (if needed)
  → read-only GET projection

SOP official signing
  → authorize Kepala OPD + verify PIN
  → prepare document identifiers
  → render/sign PDFs into unique per-attempt paths
  → compare-and-set submission claim in transaction
  → validate each document and commit ALL statuses, signatures, and PDF metadata together
  → on error: roll back database changes, delete only this attempt's files
```

## Proof

For boundary changes, prioritize:
- transaction rollback on a failure at item N after item N-1 has written;
- concurrent finalization of the same submission (exactly one winner);
- stale status rejection without audit-log write;
- two signing attempts for the same SOP generating distinct paths;
- GET workspace never invoking mutations; explicit POST finding eligible SOPs;
- real MariaDB integration tests for isolation/locking and concurrency (unit mocks alone do not establish this).

## Known constraints

Database + filesystem cannot be committed atomically. The current unique-attempt file + database-last protocol prevents accidental deletion of published artifacts, but a process crash can leave orphaned unreferenced files. Production requires scheduled reconciliation/cleanup of only unreferenced attempt files; do not delete a file referenced by published `DokumenTte.pdfPath`.

Do not declare a new abstraction or refactor entire directories unless a concrete invariant or dependency demands it.
