# SOPFlow Agent Workspace

`.agent/` adalah workspace reusable untuk **development reasoning dan execution**, bukan runtime application state.

Canonical protocol berada di root `AGENTS.md`.

## Operating Model

```text
SPEC → GRAPH → EVIDENCE
```

Implementation harness:

```text
task
  ↓
design-thinking
  ↓
UI involved? ── yes → design-graph
  ↓
graph-protocol      only when dependency structure merits it
  ↓
IMPLEMENT
  ↓
targeted verification
  ↓
call-graph-output   when human explanation is useful
  ↓
SHIP
```

## Structure

```text
.agent/
  README.md
  skills/
    design-thinking/
    design-graph/
    graph-protocol/
    call-graph-output/
    creating-project-diagrams/
  specs/
  plans/
```

### `skills/`

Reusable project-development methods.

- `design-thinking` — software/data-flow graph: A/E/R, boundaries, dependencies, lifecycle, test substitution.
- `design-graph` — UI flow graph: surfaces, C/V/N, moves, interaction states, attention scope.
- `graph-protocol` — engineering orchestration graph: nodes, edges, waves, gates, delegated-vs-implemented proof.
- `call-graph-output` — plain-text convention untuk menjelaskan runtime/test execution path.
- `creating-project-diagrams` — repository-specific documentation diagram conventions.

Skill tidak mengubah core architecture dengan sendirinya. Apply hanya pada scope yang relevan.

### `specs/`

Gunakan hanya jika ada material decision yang perlu persistent record, misalnya:

- public API/contract;
- database schema/migration/invariant;
- auth/RBAC/security boundary;
- concurrency/idempotency policy;
- TTE/P12/secret handling;
- destructive migration/rollout;
- major architecture/infra boundary.

Spec harus compact dan decision-oriented. Untuk task jelas, acceptance criteria di issue/PR cukup.

### `plans/`

Bukan default workflow. Gunakan hanya jika sequencing/dependency/rollout terlalu kompleks untuk direpresentasikan langsung oleh execution graph di task/PR.

Plan lama adalah historical evidence, bukan otomatis source of truth.

## Graph Artifacts

Graph tidak wajib menjadi file. Default-nya ephemeral reasoning di task/PR/chat.

Persist graph hanya bila membantu salah satu dari:

- cross-session continuity;
- reviewability;
- multi-worker delegation;
- risky migration/rollout;
- debugging architecture;
- auditability.

Jangan membuat graph artifact untuk perubahan trivial.

## Development Boundary

Folder ini tidak boleh dipakai sebagai alasan untuk:

- menambah graph engine/database ke production;
- mengubah SOP workflow/status;
- membuat framework internal baru;
- memaksa Effect syntax ke NestJS/React;
- membuat multi-agent execution untuk task yang sebenarnya satu coherent change.

Graph-first adalah **engineering method**, bukan fitur produk.
