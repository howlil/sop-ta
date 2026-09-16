# SOPFlow Agent Development Protocol

Instruksi ini mengatur **cara mengembangkan repository**, bukan workflow bisnis SOPFlow.

Jangan mengubah runtime menjadi graph engine, menambah workflow framework, mengubah status SOP, schema, API, permission, atau business process hanya untuk mengikuti dokumen ini. Graph di sini adalah **model reasoning, execution, dan communication untuk engineering**.

## North Star

Optimalkan:

`User Value × Correctness × Maintainability / Lead Time`

Default operating model:

```text
USER INTENT
  → UNDERSTAND OUTCOME
  → BOUND MATERIAL DECISIONS
  → MODEL ONLY WHAT MATTERS
  → IMPLEMENT
  → VERIFY ACTUAL RISK
  → INTEGRATE / SHIP
```

Untuk perubahan non-trivial, `MODEL ONLY WHAT MATTERS` menggunakan graph-first harness di bawah.

## Canonical Development Loop

```text
Intent
  ↓
Compact Spec
  ↓
Design Thinking          software/data flow
  ↓
Design Graph             only when UI/interaction changes
  ↓
Graph Protocol           only when execution has meaningful dependencies
  ↓
Implement smallest coherent vertical change
  ↓
Evidence                 tests / CI / runtime proof
  ↓
Call Graph Output        when execution path needs human explanation
  ↓
Integrate / Ship
```

Mental model singkat:

```text
SPEC → GRAPH → EVIDENCE
```

- **Spec** menentukan desired truth: outcome, observable behavior, constraints, acceptance criteria.
- **Graph** memodelkan data flow, failure, dependencies, surfaces, dan execution dependencies.
- **Evidence** membuktikan implementation sesuai graph dan outcome.

Spec tidak harus menjadi dokumen baru. Untuk task kecil, acceptance criteria di task/PR sudah cukup.

## 1. Design Thinking — Software Graph

Gunakan `.agent/skills/design-thinking/SKILL.md` ketika mendesain, memahami, mengubah, atau mereview code/runtime flow.

Core model:

```text
X → Graph → A / E / R

A = successful values/results/data flow
E = expected failures / break points
R = runtime dependencies required by nodes
```

Urutan reasoning:

```text
Problem
  → Shapes
  → Happy-path call graph
  → Cardinality
  → Failures
  → Dependencies
  → Trust boundaries
  → Cross-cutting behavior
  → Resource lifecycle
  → Test by dependency substitution
  → Code
```

Tidak perlu memaksakan Effect-specific syntax pada NestJS/React. Gunakan konsepnya secara language-neutral.

Rule utama: **code seharusnya dapat dijelaskan oleh call graph yang sederhana.** Jika implementation dan intended graph berbeda secara material, investigasi sebelum menambah abstraction.

## 2. Design Graph — Interface Graph

Gunakan `.agent/skills/design-graph/SKILL.md` **hanya** jika perubahan menyentuh UI, interaction, navigation, form, dashboard, atau user-visible state.

Core model:

```text
Job → Flow → Surface<C, V, N>

C = content / successful interaction
V = void states: empty, loading, partial, error, denied
N = needs: data, permission, prior step, viewport, context
```

Nodes adalah surfaces. Edges adalah user moves.

Jangan membuat redesign luas jika perubahan hanya membutuhkan satu affected flow.

## 3. Graph Protocol — Engineering Execution Graph

Gunakan `.agent/skills/graph-protocol/SKILL.md` untuk task MEDIUM/LARGE yang memiliki dependency antar area kerja.

Task bukan checklist. Task adalah dependency graph:

```text
wave1 [A ∥ B]
        ↓
       gate
        ↓
wave2 [C]
        ↓
wave3 [D]
```

Definitions:

- **Node** = coherent unit of engineering work.
- **Edge** = data/output dependency antar node.
- **Wave** = independent nodes yang benar-benar dapat berjalan paralel.
- **Gate** = dependency barrier sebelum wave berikutnya.

Cardinality:

```text
SMALL
→ one coherent change
→ one worker
→ no graph ceremony

MEDIUM
→ several dependent/independent nodes
→ explicit execution graph

LARGE
→ multiple ownership areas
→ waves + gates + delegated subgraphs
```

Jangan parallelize `A → B`. Parallel hanya untuk `A ∥ B` yang benar-benar independent.

Jika delegation digunakan, worker prompt minimum:

```text
WHY
SUBGRAPH / exact responsibility
RELEVANT CONTEXT
CONSTRAINTS
VERIFICATION
```

Worker return harus menyebut implemented graph agar coordinator dapat membandingkan:

```text
delegated graph
      ↕
implemented graph
```

Material divergence harus dijelaskan atau diperbaiki.

## 4. Call Graph Output — Human Explanation

Gunakan `.agent/skills/call-graph-output/SKILL.md` ketika architecture/execution path perlu dilihat manusia, terutama untuk perubahan medium/large, review architecture, debugging flow, atau handoff.

Format:

Production:

```ts
Route / Event
  → Controller / Entry
    → Application / Domain Service
      → Repository / Adapter
        → Database / External System
```

Tests hanya ditampilkan jika graph-nya berbeda:

```ts
Route / Event
  → Service
    → Fake / Test Adapter
```

Call graph adalah **output convention**, bukan alasan membuat abstraction baru.

## 5. Graph Is a Model, Not Source of Truth

```text
intended graph
      ↕
implementation
      ↕
runtime behavior
```

Jika tidak cocok, jangan otomatis memaksa code mengikuti graph lama. Kemungkinan:

- implementation salah;
- graph tidak lengkap;
- requirement berubah;
- runtime dependency berbeda dari asumsi.

Investigasi source yang sebenarnya lalu update model atau code yang salah.

## 6. Minimum Change Rule

Default decision path:

```text
reuse existing code
      ↓ no
extend existing owner
      ↓ no
small local abstraction
      ↓ no
new component/module
      ↓ only when justified
material architecture change
      ↓ user decision
```

Pilih **smallest coherent change that delivers the requested behavior**.

Jangan memecah delivery berdasarkan layer seperti schema → repository → service → UI jika hasil tiap bagian belum usable. Prefer vertical outcome yang mengalir melalui layer yang diperlukan.

## 7. Verification = Evidence

Verification proportional terhadap failure risk.

Default hierarchy:

```text
static / type / build
      ↓
targeted unit
      ↓
integration for real boundary
      ↓
critical E2E only when journey risk requires it
```

Untuk perubahan executable:

1. tentukan observable behavior/invariant;
2. gunakan regression/behavior test bila test memberikan signal yang jelas;
3. implement smallest coherent change;
4. run cheapest relevant verification;
5. widen hanya sesuai blast radius dan risk;
6. jangan menghapus/melemahkan valid test hanya supaya CI hijau.

Database transaction, auth/RBAC, TTE/P12, persistent PDF, webhook signature/idempotency, destructive changes, dan migration memerlukan verification lebih kuat karena failure cost tinggi.

## 8. Repository Boundaries

Source of truth:

1. runtime code + current tests untuk actual behavior;
2. user requirement untuk desired behavior;
3. `AGENTS.md` untuk development protocol;
4. `.agent/skills/*` untuk reusable reasoning/execution methods;
5. `.agent/specs/` hanya untuk material design decisions yang perlu persistent decision record;
6. `.agent/plans/` hanya jika sequencing kompleks benar-benar perlu disimpan;
7. `docs/` untuk product/architecture/operational documentation.

Jangan mengikuti artifact lama secara buta jika implementation sudah maju.

## 9. Git / Integration

Default:

```text
main
  → one coherent task branch
  → implement + verify on same branch
  → one PR
  → current-head verification
  → squash merge
```

- Jangan membuat branch baru untuk review fix dari task yang sama.
- Jangan menghasilkan milestone/plan/spec hanya untuk ceremony.
- Commit count, branch count, LOC, dan jumlah agent bukan productivity metric.
- Merge hanya setelah graph/outcome yang diminta tercapai dan evidence sesuai risk tersedia.

## 10. Required Agent Report

Untuk task non-trivial, laporan akhir cukup berisi:

```text
Outcome
Implemented graph / call graph (jika berguna)
Key trade-off atau unresolved risk
Verification evidence
```

Jangan otomatis menghasilkan retrospective, architecture report, milestone tree, atau diagram tambahan.

## Hard Boundary

Graph-first development **tidak memberi izin** untuk:

- mengganti SOP lifecycle dengan generic graph/workflow engine;
- menambah graph database;
- memigrasikan status workflow bisnis tanpa requirement;
- menambah queue/event sourcing/CQRS hanya agar arsitektur terlihat graph-like;
- merombak UI hanya agar sesuai diagram;
- mengubah public API/schema/permission/security boundary tanpa product need.

Graph membantu kita berpikir dan mengeksekusi perubahan. **Core system tetap ditentukan oleh business requirements dan implementation yang terbukti.**
