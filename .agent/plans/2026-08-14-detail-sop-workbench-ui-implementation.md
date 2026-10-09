# Detail SOP Workbench UI Redesign Implementation Plan

> **Historical implementation record — not the current development contract.** This document captures a past plan and may name code, flags, or UI props already removed. Follow `AGENTS.md`, `.agents/engineering.md`, and current production code/tests for current behavior.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove redundant detail-page back controls and redesign the Penyusun/PJ Penyusun SOP workbench into a compact, intentional document editor while preserving the existing inline procedure-table workflow and all domain behavior.

**Architecture:** `DetailPageLayout` becomes a workspace-only layout that receives breadcrumb metadata but no longer owns standalone back/actions rows. The Penyusun SOP workbench keeps its current state/hooks and is refactored only at presentation boundaries: a compact document command bar, a flat property inspector, a consistent inline spreadsheet editor, and a quieter preview toolbar. Existing APIs, autosave, workflow transitions, versioning, diagrams, print logic, permission checks, and validation remain the source of truth.

**Tech Stack:** React 19, TypeScript, TanStack Router, Tailwind CSS, Vitest, Testing Library, Playwright, pnpm.

## Global Constraints

- Frontend/UI refactor only; do not change backend endpoints, DTOs, Prisma schema, API contracts, route permissions, role checks, or workflow transitions.
- Preserve `useDetailSopPenyusun`, header/procedure autosave hooks, `useProsedurEditor`, version-domain helpers, print helpers, and diagram configuration behavior.
- Preserve the procedure editor as an inline table/spreadsheet on desktop. Do not replace it with modal, drawer, master-detail, or per-step navigation.
- Preserve existing mobile procedure-editing architecture; only inherit safe control-style improvements.
- Breadcrumb ancestors are the visible back-navigation mechanism. Do not introduce browser-history back buttons.
- Exactly one primary workflow action may be visually dominant in the SOP command bar.
- Secondary actions such as print/version creation remain reachable without competing visually with the primary workflow action.
- Property metadata keeps the existing data model and add/remove/change handlers.
- Multiline procedure fields start compact and auto-grow only when content requires more lines.
- Wide procedure data uses intentional minimum column widths plus horizontal scrolling rather than crushing controls.
- Accessibility, keyboard focus, live-region autosave announcements, and existing dialog semantics must be preserved.
- Use the single branch `refactor/detail-sop-workbench-ui` for the whole task.
- Follow TDD for behavior/contract changes and require the repository CI gate to pass before squash merge.

---

## File map

### Shared detail shell

- Modify: `client/src/components/layout/DetailPageLayout.tsx`
- Modify: `client/src/components/layout/__tests__/DetailPageLayout.test.tsx`
- Modify: `client/src/pages/penyusun/sop/detail/DetailSOPPenyusun.tsx`
- Modify: `client/src/pages/kepala-opd/sop/DetailSOP.tsx`
- Modify: `client/src/pages/kepala-opd/pengajuan/DetailPengajuanSOPPage.tsx`
- Modify: `client/src/pages/evaluator/evaluasi/evaluasi-workspace-page.tsx`
- Modify: `client/src/pages/pj-evaluator/evaluasi/DetailPengajuanEvaluasi.tsx`
- Modify: `client/src/pages/penyusun/koordinator/berita-acara/DetailBeritaAcaraPage.tsx`

### SOP command bar and workbench composition

- Modify: `client/src/pages/penyusun/sop/detail/components/DetailSopPenyusunHeader.tsx`
- Create: `client/src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunHeader.test.tsx`

### Property inspector

- Modify: `client/src/pages/penyusun/sop/detail/components/DetailSopPenyusunSidePanel.tsx`
- Modify: `client/src/pages/penyusun/sop/detail/components/DetailSopMetadataPanel.tsx`
- Modify: `client/src/pages/penyusun/sop/detail/components/SOPHeaderSection.tsx`
- Create: `client/src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunSidePanel.test.tsx`
- Create: `client/src/pages/penyusun/sop/detail/components/__tests__/SOPHeaderSection.test.tsx`

### Procedure spreadsheet editor

- Modify: `client/src/pages/penyusun/sop/detail/components/ProsedurEditorCells.tsx`
- Modify: `client/src/pages/penyusun/sop/detail/components/DetailSopProsedurEditor.tsx`
- Create: `client/src/pages/penyusun/sop/detail/components/__tests__/ProsedurEditorCells.test.tsx`
- Create: `client/src/pages/penyusun/sop/detail/components/__tests__/DetailSopProsedurEditor.test.tsx`

### Preview/edit toolbar

- Modify: `client/src/pages/penyusun/sop/detail/components/DetailSopPenyusunMain.tsx`
- Create: `client/src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunMain.test.tsx`

### E2E

- Create: `client/e2e/detail-sop-workbench-ui.spec.ts`

---

## Task 1: Remove standalone detail back controls and make breadcrumb the only visible back navigation

**Files:**
- Modify: `client/src/components/layout/DetailPageLayout.tsx`
- Modify: `client/src/components/layout/__tests__/DetailPageLayout.test.tsx`
- Modify all six production consumers listed under Shared detail shell.

**Interfaces:**

Final contract:

```ts
export interface DetailPageLayoutProps {
  breadcrumb?: BreadcrumbItem[] | null
  title: string
  header?: React.ReactNode
  main?: React.ReactNode
  children?: React.ReactNode
  leftPanel?: React.ReactNode
  rightPanel?: React.ReactNode
  className?: string
  workspaceClassName?: string
}
```

`description`, `backTo`, `backSize`, and generic page-level `actions` are removed from the public contract.

- [ ] **Step 1: Write the failing breadcrumb-only layout test**

Replace `client/src/components/layout/__tests__/DetailPageLayout.test.tsx` with:

```tsx
import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))

vi.mock('@/components/layout/NotificationBell', () => ({
  NotificationBell: () => <button type="button">Notifikasi</button>,
}))

import { DetailPageLayout } from '@/components/layout/DetailPageLayout'
import { HeaderBar } from '@/components/layout/HeaderBar'
import { PageHeaderProvider } from '@/components/layout/PageHeaderProvider'

describe('DetailPageLayout', () => {
  it('menggunakan breadcrumb sebagai navigasi balik tanpa standalone back row', async () => {
    render(
      <PageHeaderProvider>
        <HeaderBar />
        <DetailPageLayout
          breadcrumb={[
            { label: 'Manajemen SOP', to: '/penyusun/sop' },
            { label: 'Edit SOP' },
          ]}
          title="Edit Dokumen SOP"
          main={<div>Dokumen</div>}
        />
      </PageHeaderProvider>,
    )

    expect(await screen.findByRole('link', { name: 'Manajemen SOP' })).toHaveAttribute(
      'href',
      '/penyusun/sop',
    )
    expect(screen.getByText('Edit SOP')).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByTitle('Kembali')).not.toBeInTheDocument()
    expect(screen.queryByText('Kembali')).not.toBeInTheDocument()
    expect(screen.getByText('Dokumen')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run RED**

```bash
cd client
pnpm test -- src/components/layout/__tests__/DetailPageLayout.test.tsx
```

Expected: FAIL because current `DetailPageLayout` still requires/renders `BackButton`.

- [ ] **Step 3: Simplify `DetailPageLayout`**

Delete the `BackButton` import, `description`, `backTo`, `backSize`, `actions`, and the extra local toolbar row. Keep `DetailWorkspace` unchanged. Final render shape:

```tsx
export function DetailPageLayout({
  breadcrumb,
  title,
  header,
  main,
  children,
  leftPanel,
  rightPanel,
  className,
  workspaceClassName,
}: DetailPageLayoutProps) {
  const mainContent = main ?? children

  return (
    <div
      suppressHydrationWarning
      className={className ?? 'flex h-[calc(100vh-5rem)] min-h-0 flex-col gap-3 sm:gap-4'}
    >
      <SetPageHeader breadcrumb={breadcrumb ?? []} title={title} />
      <DetailWorkspace
        className={workspaceClassName}
        header={header}
        leftPanel={leftPanel}
        main={mainContent}
        rightPanel={rightPanel}
      />
    </div>
  )
}
```

- [ ] **Step 4: Migrate Penyusun SOP detail**

Keep:

```tsx
breadcrumb={[
  { label: 'Manajemen SOP', to: ROUTES.PENYUSUN.SOP },
  { label: isReadOnly ? 'Lihat SOP' : 'Edit SOP' },
]}
```

Remove `description`, `backTo`, and `backSize` from the call.

- [ ] **Step 5: Migrate Kepala OPD SOP detail**

Change `DetailSOPProps` to:

```ts
export interface DetailSOPProps {
  breadcrumb?: { label: string; to?: string }[]
}
```

Keep:

```tsx
const effectiveBreadcrumb = breadcrumb ?? [
  { label: 'SOP', to: ROUTES.KEPALA_OPD.SOP },
  { label: 'Detail SOP' },
]
```

Delete `effectiveBackTo` and remove `description`, `backTo`, `backSize`, and `actions={null}` from the layout call. Preserve `workspaceHeaderToolbar` and Cabut SOP behavior.

- [ ] **Step 6: Migrate Kepala OPD pengajuan detail**

Keep exactly:

```tsx
breadcrumb={[
  { label: 'Pengajuan SOP', to: ROUTES.KEPALA_OPD.PENGAJUAN },
  { label: 'Detail Pengajuan' },
]}
```

Remove `description`, `backTo`, and `backSize`. Preserve local print/sign controls.

- [ ] **Step 7: Migrate PJ Evaluator evaluation detail**

Keep exactly:

```tsx
breadcrumb={[
  {
    label: IA.NAV_BIRO_EVALUASI_REQUEST_EVALUATOR,
    to: ROUTES.PJ_EVALUATOR.EVALUASI,
  },
  { label: pengajuan.opdNama ?? '' },
]}
```

Remove `description`, `backTo`, and `backSize`. Preserve TTE/print controls.

- [ ] **Step 8: Migrate PJ Penyusun Berita Acara detail**

Change the breadcrumb to:

```tsx
breadcrumb={[
  { label: 'PJ Penyusun', to: ROUTES.PENYUSUN.SOP },
  { label: 'Berita Acara', to: ROUTES.PENYUSUN.PJ_PENYUSUN_BERITA_ACARA },
  { label: 'Detail Berita Acara' },
]}
```

Remove `description`, `backTo`, and `backSize`. Preserve BA/TTE controls.

- [ ] **Step 9: Migrate Evaluator workspace**

At its `DetailPageLayout` call use:

```tsx
breadcrumb={[
  { label: 'Evaluasi SOP', to: listHref },
  { label: workspace?.opd.nama ?? 'Detail Evaluasi' },
]}
```

Remove `description`, `backTo`, and `backSize`. Do not change evaluation submit/reject state or handlers.

- [ ] **Step 10: Run GREEN and typecheck**

```bash
pnpm test -- src/components/layout/__tests__/DetailPageLayout.test.tsx
pnpm typecheck
```

- [ ] **Step 11: Scan stale layout props**

```bash
rg "backTo=|backSize=" client/src/pages client/src/components/layout
rg "<DetailPageLayout" client/src/pages
```

`BackButton` may remain in not-found/error states; only `DetailPageLayout` standalone back navigation is removed.

- [ ] **Step 12: Commit**

```bash
git add client/src/components/layout/DetailPageLayout.tsx client/src/components/layout/__tests__/DetailPageLayout.test.tsx client/src/pages/penyusun/sop/detail/DetailSOPPenyusun.tsx client/src/pages/kepala-opd/sop/DetailSOP.tsx client/src/pages/kepala-opd/pengajuan/DetailPengajuanSOPPage.tsx client/src/pages/evaluator/evaluasi/evaluasi-workspace-page.tsx client/src/pages/pj-evaluator/evaluasi/DetailPengajuanEvaluasi.tsx client/src/pages/penyusun/koordinator/berita-acara/DetailBeritaAcaraPage.tsx
git commit -m "refactor(client): use breadcrumb for detail navigation"
```

---

## Task 2: Redesign the SOP document command bar without changing workflow logic

**Files:**
- Modify: `client/src/pages/penyusun/sop/detail/components/DetailSopPenyusunHeader.tsx`
- Create: `client/src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunHeader.test.tsx`

**Interfaces:**
- Keep `DetailSOPPenyusunHeaderProps` names and callback signatures unchanged.
- Preserve the same print helper, version-create handler, primary workflow condition, confirmation dialog, blocking reasons, and read-only conditions.

- [ ] **Step 1: Create test helper and failing hierarchy tests**

In `DetailSopPenyusunHeader.test.tsx`, mock `useSopEditor`, `usePenyusunWorkbench`, `useToast`, print helper, and mapper. Define:

```tsx
import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SOPDetailMetadata } from '@/types/ui/sop'
import { DetailSOPPenyusunHeader } from '../DetailSopPenyusunHeader'

const retry = vi.fn()
const complete = vi.fn()

function renderHeader(overrides: Partial<ComponentProps<typeof DetailSOPPenyusunHeader>> = {}) {
  const props: ComponentProps<typeof DetailSOPPenyusunHeader> = {
    metadata: {
      nama: 'SOP Pelayanan Administrasi',
      judul: 'SOP Pelayanan Administrasi',
      version: 2,
    } as SOPDetailMetadata,
    currentSopStatus: 'DRAFT',
    currentSopStatusLabel: 'Draft',
    isRevisionFlow: false,
    primaryActionLabel: 'Selesai',
    autosaveStatus: 'saved',
    onRetryAutosave: retry,
    onComplete: complete,
    ...overrides,
  }
  return render(<DetailSOPPenyusunHeader {...props} />)
}
```

Tests:

```tsx
it('menjadikan identitas SOP sebagai hierarchy utama', () => {
  renderHeader()
  expect(screen.getByText('SOP Pelayanan Administrasi')).toBeInTheDocument()
  expect(screen.getByText('v2')).toBeInTheDocument()
  expect(screen.getByText('Draft')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Selesai' })).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('Tersimpan')
  expect(screen.queryByText('Dokumen SOP')).not.toBeInTheDocument()
})

it('mempertahankan retry saat autosave gagal', () => {
  renderHeader({ autosaveStatus: 'error' })
  fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))
  expect(retry).toHaveBeenCalledTimes(1)
})
```

Add a third test with `currentSopStatus="BERLAKU"`, `canBuatVersiBaru={true}`, and `onBuatVersiBaru={vi.fn()}`; open `Aksi dokumen lainnya` and assert menu items `Cetak PDF` and `Buat versi baru` exist.

- [ ] **Step 2: Run RED**

```bash
pnpm test -- src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunHeader.test.tsx
```

- [ ] **Step 3: Make autosave indicator semantic and compact**

Keep `autosaveAppearance`, but map status to text emphasis rather than colored bordered badges:

```ts
saved   -> className: 'text-muted-foreground'
saving  -> className: 'text-secondary-foreground'
pending -> className: 'text-secondary-foreground'
error   -> className: 'text-danger'
idle    -> null
```

Render `role="status" aria-live="polite"` as inline icon + text. Preserve `Coba lagi` only for `error`.

- [ ] **Step 4: Replace scrollable header with wrapping command bar**

Delete `overflow-x-auto`, hidden-scrollbar classes, and `onWheel`. Use:

```tsx
<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
  <div className="min-w-0">
    <h2 className="truncate text-sm font-semibold text-foreground">
      {metadata.nama ?? metadata.judul ?? 'SOP'}
    </h2>
    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>v{metadata.version || 1}</span>
      {metadata.revisiDariVersi != null ? <span>Revisi dari v{metadata.revisiDariVersi}</span> : null}
      <SopStatusBadge
        status={currentSopStatus}
        label={currentSopStatusLabel}
        showDomain={false}
        className="text-xs"
      />
    </div>
  </div>
  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
    {autosaveIndicator}
    {retryButton}
    {primaryWorkflowButton}
    {secondaryActionsMenu}
  </div>
</div>
```

Implement the four JSX variables locally or inline them; do not create a new global abstraction.

- [ ] **Step 5: Put print/version under one secondary menu**

Import the existing dropdown primitives and `MoreHorizontal`. Trigger:

```tsx
<Button
  type="button"
  variant="ghost"
  size="icon"
  className="h-8 w-8"
  aria-label="Aksi dokumen lainnya"
>
  <MoreHorizontal className="h-4 w-4" aria-hidden />
</Button>
```

Menu rules:
- `Cetak PDF` only when `currentSopStatus === 'BERLAKU'`;
- disable print using `isWorkbenchLoading || isPrinting`;
- `Buat versi baru` only when `canBuatVersiBaru && onBuatVersiBaru`;
- preserve `isBuatVersiBaruPending` and `buatVersiBaruBlockingReason`;
- omit the menu trigger if neither action is available.

- [ ] **Step 6: Keep the primary workflow action behavior exactly**

Preserve:

```tsx
!isReadOnly && (!isRevisionFlow || canShowKirimUlangAction)
```

and current pending/blocking/confirmation behavior. Only simplify styling to the normal primary button contract.

- [ ] **Step 7: Flatten revision guidance**

Keep the existing three text branches unchanged. Replace the rounded warning card with a compact top-divider notice:

```tsx
<div className="mt-2 flex gap-2 border-t border-border pt-2 text-xs text-secondary-foreground">
  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
  <p>{revisionMessage}</p>
</div>
```

`revisionMessage` must use the same existing role/blocking branches; no domain copy is removed.

- [ ] **Step 8: Run GREEN**

```bash
pnpm test -- src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunHeader.test.tsx
pnpm typecheck
```

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/penyusun/sop/detail/components/DetailSopPenyusunHeader.tsx client/src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunHeader.test.tsx
git commit -m "refactor(client): simplify SOP document command bar"
```

---

## Task 3: Convert the right metadata area from card stack into a property inspector

**Files:**
- Modify: `client/src/pages/penyusun/sop/detail/components/DetailSopPenyusunSidePanel.tsx`
- Modify: `client/src/pages/penyusun/sop/detail/components/DetailSopMetadataPanel.tsx`
- Modify: `client/src/pages/penyusun/sop/detail/components/SOPHeaderSection.tsx`
- Modify: `client/src/pages/penyusun/sop/detail/DetailSOPPenyusun.tsx`
- Create: `client/src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunSidePanel.test.tsx`
- Create: `client/src/pages/penyusun/sop/detail/components/__tests__/SOPHeaderSection.test.tsx`

**Interfaces:**
- Keep internal tab id `edit`.
- Editable visible label becomes `Properti`; read-only visible label remains `Informasi`.
- Preserve all metadata keys and handlers.

- [ ] **Step 1: Write failing side-panel label test**

Mock `DetailSOPMetadataPanel`, `UmpanBalikEvaluasiPanel`, `RiwayatVersiPanel`, and `RiwayatStatusPanel` to small `<div>` probes. Render:

```tsx
<DetailSOPPenyusunSidePanel
  collapsed={false}
  onCollapsedChange={vi.fn()}
  rightPanelTab="edit"
  onTabChange={vi.fn()}
  auditEntries={[]}
  isReadOnly={false}
  detailSopId="detail-1"
  sopId="sop-1"
/>
```

Assert `Properti`, `Komentar evaluasi`, `Versi`, and `Aktivitas` are present. Render again with `isReadOnly` and assert `Informasi` replaces `Properti`.

- [ ] **Step 2: Run RED**

```bash
pnpm test -- src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunSidePanel.test.tsx
```

- [ ] **Step 3: Simplify first-tab labeling**

Remove `editTabLabel` from `DetailSOPPenyusunSidePanelProps`. Derive:

```ts
const propertyTabLabel = isReadOnly ? 'Informasi' : 'Properti'
```

Keep IDs:

```ts
'edit' | 'komentar' | 'versi' | 'aktivitas'
```

Stop passing `editTabLabel` from `DetailSOPPenyusun.tsx`.

- [ ] **Step 4: Write property-inspector regression test**

Mock `useSopEditor` with:

```ts
metadata: {
  nama: 'SOP Uji',
  judul: 'SOP Uji',
  nomorSOP: '001/SOP/2026',
  institutionLines: ['Pemprov Sumbar', 'Sekretariat Daerah'],
  lawBasis: ['PermenPANRB 35/2012'],
  lawBasisIds: ['law-1'],
  relatedSop: ['SOP Surat Masuk'],
  relatedSopDetailIds: ['sop-2'],
  warning: ['Periksa kelengkapan'],
  implementQualification: ['Memahami administrasi'],
  equipment: ['Komputer'],
  recordData: ['Buku agenda'],
},
implementers: [{ id: 'impl-1', name: 'Staf' }],
setImplementers: vi.fn(),
handleMetadataChange: vi.fn(),
isReadOnly: false,
```

Render `SOPHeaderSection` with three `vi.fn()` dialog openers. Assert:
- headings `Identitas lembaga`, `Identitas SOP`, `Dasar hukum`, `Keterkaitan dengan SOP`, `Peringatan`, `Kualifikasi pelaksanaan`, `Peralatan dan perlengkapan`, `Pencatatan dan pendataan`;
- input values `SOP Uji` and `001/SOP/2026`;
- existing law/related items;
- add buttons `Tambah dasar hukum` and `Tambah keterkaitan SOP`.

Render read-only and assert add controls are absent while values remain readable.

- [ ] **Step 5: Run RED for property inspector**

```bash
pnpm test -- src/pages/penyusun/sop/detail/components/__tests__/SOPHeaderSection.test.tsx
```

- [ ] **Step 6: Replace `MetadataFieldCard` with `InspectorSection`**

In `SOPHeaderSection.tsx`, remove decorative metadata icons and define:

```tsx
function InspectorSection({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="border-b border-border py-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}
```

Map the existing metadata groups one-for-one to `InspectorSection`. Do not delete any existing mutation callback or metadata field.

- [ ] **Step 7: Flatten panel/background ownership**

Change `DetailSOPMetadataPanel` wrapper to:

```tsx
<div className="px-3 pb-3">
  <SOPHeaderSection ... />
</div>
```

Keep `LawBasisDialog`, `RelatedPosDialog`, and `PelaksanaDialog` outside the visual inspector wrapper with their existing callbacks.

- [ ] **Step 8: Make read-only values plain content**

Change `ReadOnlyTextBlock` to:

```tsx
<div
  className={cn(
    'text-xs text-secondary-foreground',
    multiline ? 'whitespace-pre-wrap leading-relaxed' : 'leading-5',
  )}
>
  {hasValue ? value : <span className="text-muted-foreground">{placeholder}</span>}
</div>
```

Do not change editable inputs.

- [ ] **Step 9: Run GREEN**

```bash
pnpm test -- src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunSidePanel.test.tsx src/pages/penyusun/sop/detail/components/__tests__/SOPHeaderSection.test.tsx
pnpm typecheck
```

- [ ] **Step 10: Commit**

```bash
git add client/src/pages/penyusun/sop/detail/DetailSOPPenyusun.tsx client/src/pages/penyusun/sop/detail/components/DetailSopPenyusunSidePanel.tsx client/src/pages/penyusun/sop/detail/components/DetailSopMetadataPanel.tsx client/src/pages/penyusun/sop/detail/components/SOPHeaderSection.tsx client/src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunSidePanel.test.tsx client/src/pages/penyusun/sop/detail/components/__tests__/SOPHeaderSection.test.tsx
git commit -m "refactor(client): flatten SOP property inspector"
```

---

## Task 4: Standardize procedure editor fields while preserving inline editing

**Files:**
- Modify: `client/src/pages/penyusun/sop/detail/components/ProsedurEditorCells.tsx`
- Create: `client/src/pages/penyusun/sop/detail/components/__tests__/ProsedurEditorCells.test.tsx`

**Interfaces:**
- Keep all existing cell component prop signatures.
- Use existing `AutoResizeTextarea`.
- Keep `MutuWaktuCell.onChange(amount, unit)` and current encoded-value parsing.

- [ ] **Step 1: Write failing compact multiline tests**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  KegiatanCell,
  MutuKelengkapanCell,
  OutputCell,
  KeteranganCell,
  MutuWaktuCell,
} from '../ProsedurEditorCells'

it.each([
  ['Kegiatan', KegiatanCell],
  ['Kelengkapan', MutuKelengkapanCell],
  ['Output', OutputCell],
  ['Keterangan', KeteranganCell],
])('%s memakai textarea satu-baris yang dapat auto-grow', (label, Cell) => {
  const onChange = vi.fn()
  render(<Cell value="Isi pendek" onChange={onChange} />)
  const textbox = screen.getByRole('textbox', { name: label })
  expect(textbox).toHaveAttribute('rows', '1')
  expect(textbox).toHaveClass('min-h-9')
  fireEvent.change(textbox, { target: { value: 'Baris 1\nBaris 2' } })
  expect(onChange).toHaveBeenCalledWith('Baris 1\nBaris 2')
})
```

- [ ] **Step 2: Write failing compound-time test**

```tsx
it('menampilkan waktu sebagai satu compound control tanpa mengubah contract value', () => {
  const onChange = vi.fn()
  render(<MutuWaktuCell value="10 menit" onChange={onChange} />)

  expect(screen.getByTestId('procedure-time-control')).toBeInTheDocument()
  expect(screen.getByRole('spinbutton', { name: 'Jumlah waktu' })).toHaveValue(10)
  expect(screen.getByRole('combobox', { name: 'Satuan waktu' })).toHaveValue('m')

  fireEvent.change(screen.getByRole('spinbutton', { name: 'Jumlah waktu' }), {
    target: { value: '15' },
  })
  expect(onChange).toHaveBeenCalledWith('15', 'm')
})
```

- [ ] **Step 3: Run RED**

```bash
pnpm test -- src/pages/penyusun/sop/detail/components/__tests__/ProsedurEditorCells.test.tsx
```

- [ ] **Step 4: Replace multiline cells with `AutoResizeTextarea`**

For Kegiatan/Kelengkapan/Output/Keterangan use:

```tsx
<AutoResizeTextarea
  aria-label="Kegiatan"
  minRows={1}
  maxRows={5}
  className="min-h-9 px-2 py-1.5 text-[13px] leading-5"
  value={value}
  onChange={(event) => onChange(event.target.value)}
/>
```

Use the correct aria-label for each cell. Keep `maxRows={5}` for all four.

- [ ] **Step 5: Align Type and Pelaksana selects**

Preserve option/normalization logic. Use:

```text
h-9 w-full rounded-control border border-border-strong bg-surface px-2 text-[13px]
outline-none focus-visible:ring-2 focus-visible:ring-primary
```

Decision helper text stays below Type.

- [ ] **Step 6: Make time one visual field**

Use:

```tsx
<div
  data-testid="procedure-time-control"
  className="flex min-w-[11rem] items-stretch overflow-hidden rounded-control border border-border-strong bg-surface focus-within:ring-2 focus-within:ring-primary"
>
```

Keep amount input and unit select separately focusable. Remove their individual outer borders/rings; retain an internal right divider on the amount control.

- [ ] **Step 7: Run GREEN**

```bash
pnpm test -- src/pages/penyusun/sop/detail/components/__tests__/ProsedurEditorCells.test.tsx
pnpm typecheck
```

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/penyusun/sop/detail/components/ProsedurEditorCells.tsx client/src/pages/penyusun/sop/detail/components/__tests__/ProsedurEditorCells.test.tsx
git commit -m "refactor(client): compact SOP procedure fields"
```

---

## Task 5: Make the procedure table an intentional spreadsheet surface

**Files:**
- Modify: `client/src/pages/penyusun/sop/detail/components/DetailSopProsedurEditor.tsx`
- Create: `client/src/pages/penyusun/sop/detail/components/__tests__/DetailSopProsedurEditor.test.tsx`

**Interfaces:**
- Preserve `DetailSOPProsedurEditorProps`.
- Preserve all `useProsedurEditor` handlers, `DecisionStepDialog`, row menu actions, and validation-before-done behavior.

- [ ] **Step 1: Write failing spreadsheet-structure test**

Mock `useToast` and render with three valid rows plus one implementer. Assert:

```tsx
for (const heading of [
  'No',
  'Kegiatan',
  'Tipe',
  'Pelaksana',
  'Kelengkapan',
  'Waktu',
  'Output',
  'Keterangan',
  'Aksi',
]) {
  expect(screen.getByRole('columnheader', { name: heading })).toBeInTheDocument()
}
expect(screen.getByTestId('procedure-editor-scroll')).toHaveClass('overflow-x-auto')
expect(screen.getByRole('button', { name: 'Tambah langkah' })).toBeVisible()
expect(screen.getByRole('button', { name: 'Selesai edit' })).toBeVisible()
expect(screen.getByRole('button', { name: 'Aksi langkah 1' })).toBeVisible()
```

Use row data matching the real `ProsedurRow` shape from existing tests/types; do not add a new model.

- [ ] **Step 2: Run RED**

```bash
pnpm test -- src/pages/penyusun/sop/detail/components/__tests__/DetailSopProsedurEditor.test.tsx
```

- [ ] **Step 3: Set deterministic width and a discoverable scroll region**

Change desktop wrapper/table to:

```tsx
<div
  data-testid="procedure-editor-scroll"
  className="hidden overflow-x-auto overscroll-x-contain rounded-surface border border-border bg-surface [scrollbar-width:thin] md:block"
>
  <Table.Table className="min-w-[1460px] table-fixed">
```

Use header widths:

```text
No          48px
Kegiatan    260px
Tipe        140px
Pelaksana   190px
Kelengkapan 190px
Waktu       190px
Output      190px
Keterangan  220px
Aksi        48px
```

Implement with matching `w-[...] min-w-[...]` classes.

- [ ] **Step 4: Make header sticky and cell spacing compact**

Use:

```tsx
<thead className="sticky top-0 z-10 border-b border-border bg-surface-subtle">
```

Use `px-1.5 py-1.5` for editable data cells. Keep No/action centered where appropriate. Do not add heavy per-cell borders.

- [ ] **Step 5: Preserve the existing row action menu exactly**

Keep:
- `Atur cabang decision` only for decision rows;
- `Tambah langkah setelah ini`;
- `Hapus langkah` only when more than one row exists.

Do not add always-visible action icons.

- [ ] **Step 6: Keep mobile architecture, only reduce card emphasis**

Change mobile step wrapper to:

```tsx
<section key={row.id} className="rounded-surface border border-border bg-surface p-3">
```

Keep field order and per-step editing behavior unchanged.

- [ ] **Step 7: Keep footer actions but align density**

Use `size="sm" className="h-9"` for both `Tambah langkah` and `Selesai edit`. Keep callbacks unchanged. Do not add sticky footer behavior.

- [ ] **Step 8: Add validation regression**

In the same test file, render invalid rows, click `Selesai edit`, and assert `showToast` is called while `onDone` is not. Render valid rows and assert `onDone` is called once. Use existing `validateProsedurRows` expectations; do not bypass validation.

- [ ] **Step 9: Run GREEN**

```bash
pnpm test -- src/pages/penyusun/sop/detail/components/__tests__/DetailSopProsedurEditor.test.tsx src/pages/penyusun/sop/detail/components/__tests__/ProsedurEditorCells.test.tsx
pnpm typecheck
```

- [ ] **Step 10: Commit**

```bash
git add client/src/pages/penyusun/sop/detail/components/DetailSopProsedurEditor.tsx client/src/pages/penyusun/sop/detail/components/__tests__/DetailSopProsedurEditor.test.tsx
git commit -m "refactor(client): refine SOP procedure spreadsheet"
```

---

## Task 6: Quiet the preview/edit-mode toolbar without changing diagram behavior

**Files:**
- Modify: `client/src/pages/penyusun/sop/detail/components/DetailSopPenyusunMain.tsx`
- Create: `client/src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunMain.test.tsx`

**Interfaces:**
- Keep `activeTab`, `onActiveTabChange`, `isEditingSteps`, and `setIsEditingSteps` props unchanged.
- Keep `usePenyusunDiagramConfig`, idle diagram mounting, manual path state, reset handlers, and `SOPPreviewTemplate` props unchanged.

- [ ] **Step 1: Write failing pressed-state test**

Mock `useSopEditor`, `usePenyusunWorkbench`, `usePenyusunDiagramConfig`, and `SOPPreviewTemplate` so the supplied toolbar is rendered. Assert editable mode has:

```tsx
const langkah = screen.getByRole('button', { name: /Langkah|Diagram/ })
const manual = screen.getByRole('button', { name: 'Edit Manual' })
expect(langkah).toHaveAttribute('aria-pressed')
expect(manual).toHaveAttribute('aria-pressed')
```

When mocked manual mode is active, assert `Reset semua path` appears. When `isReadOnly=true`, assert edit controls are absent.

- [ ] **Step 2: Run RED**

```bash
pnpm test -- src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunMain.test.tsx
```

- [ ] **Step 3: Add explicit pressed-state semantics**

Add:

```tsx
aria-pressed={isEditingSteps}
```

to the steps-mode button and:

```tsx
aria-pressed={diagramConfig.isEditingDiagramPaths}
```

to `Edit Manual`.

- [ ] **Step 4: Flatten toolbar visuals**

Use:

```tsx
<div
  className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-control border border-border bg-surface p-1"
  role="group"
  aria-label="Kontrol dokumen SOP"
>
```

Active buttons use `bg-surface-muted text-foreground`; inactive buttons stay ghost. Remove active `shadow-surface` and nested ring treatment. Keep all click handlers and diagram state unchanged.

- [ ] **Step 5: Run GREEN**

```bash
pnpm test -- src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunMain.test.tsx
pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/penyusun/sop/detail/components/DetailSopPenyusunMain.tsx client/src/pages/penyusun/sop/detail/components/__tests__/DetailSopPenyusunMain.test.tsx
git commit -m "refactor(client): simplify SOP preview controls"
```

---

## Task 7: Add E2E regression and run the full merge gate

**Files:**
- Create: `client/e2e/detail-sop-workbench-ui.spec.ts`

**Interfaces:**
- Use existing `users`, `createAuthenticatedApiContext`, `expectBackendAvailable`, `createDraftSopFixture`, and `loginViaUi` helpers.
- E2E asserts user-visible behavior only.

- [ ] **Step 1: Create a deterministic draft SOP fixture and open the workbench**

Use:

```ts
import { expect, test } from '@playwright/test'
import { users } from './fixtures/users'
import { createAuthenticatedApiContext, expectBackendAvailable } from './support/api'
import { createDraftSopFixture } from './support/e2e-flow'
import { loginViaUi } from './support/app'

test.describe('Detail SOP workbench UI', () => {
  test.beforeEach(async ({ request }) => {
    await expectBackendAvailable(request)
  })

  test('breadcrumb, properti, dan inline editor tetap operasional', async ({ page }) => {
    const api = await createAuthenticatedApiContext(users.penyusun)
    try {
      const fixture = await createDraftSopFixture(api, 'WORKBENCH-UI')
      await loginViaUi(page, users.penyusun)
      await page.goto(`/penyusun/sop/${fixture.detailSopId}`)
```

Close the `try` with `await api.dispose()` in `finally`, following existing E2E patterns.

- [ ] **Step 2: Assert breadcrumb replaces standalone back**

```ts
await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible()
await expect(page.getByRole('link', { name: 'Manajemen SOP' })).toBeVisible()
await expect(page.getByTitle('Kembali')).toHaveCount(0)
```

- [ ] **Step 3: Assert command bar hierarchy**

```ts
await expect(page.getByText(fixture.title).first()).toBeVisible()
await expect(page.getByRole('button', { name: 'Selesai' })).toBeVisible()
```

Do not require secondary print/version items for a draft fixture because their domain conditions are intentionally false.

- [ ] **Step 4: Assert property inspector**

```ts
await expect(page.getByText('Properti')).toBeVisible()
await expect(page.getByText('Identitas SOP')).toBeVisible()
await expect(page.getByDisplayValue(fixture.title)).toBeVisible()
await expect(page.getByDisplayValue(fixture.number)).toBeVisible()
```

- [ ] **Step 5: Assert inline procedure editor remains the interaction model**

Click the workbench button whose accessible name is `Langkah`, then:

```ts
await expect(page.getByRole('columnheader', { name: 'Kegiatan' })).toBeVisible()
await expect(page.getByRole('textbox', { name: 'Kegiatan' }).first()).toBeVisible()
await expect(page.getByRole('button', { name: 'Tambah langkah' })).toBeVisible()
await expect(page.getByRole('button', { name: 'Selesai edit' })).toBeVisible()
```

Do not submit `Selesai edit` in this E2E fixture if the draft has incomplete procedure data; unit tests own validation behavior.

- [ ] **Step 6: Run focused client verification**

```bash
cd client
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

All four commands must pass.

- [ ] **Step 7: Run the new Playwright spec when local prerequisites are available**

```bash
pnpm exec playwright test e2e/detail-sop-workbench-ui.spec.ts
```

If local infrastructure is unavailable, record the exact blocker in the PR body and rely on mandatory repository CI; do not claim local E2E success.

- [ ] **Step 8: Final stale-pattern scans**

```bash
rg "backTo=|backSize=" client/src/pages client/src/components/layout
rg "MetadataFieldCard" client/src
rg "Dokumen SOP" client/src/pages/penyusun/sop/detail
rg "onWheel" client/src/pages/penyusun/sop/detail/components/DetailSopPenyusunHeader.tsx
rg "overflow-x-auto" client/src/pages/penyusun/sop/detail/components/DetailSopPenyusunHeader.tsx
```

Expected:
- no `DetailPageLayout` back props;
- no `MetadataFieldCard` helper;
- no generic dominant `Dokumen SOP` heading in the command bar;
- no wheel-remapped or horizontally scrolling command bar.

`overflow-x-auto` remains expected in `DetailSopProsedurEditor.tsx`.

- [ ] **Step 9: Request code review against the approved spec**

Review for:
- accidental API/business changes;
- lost metadata fields or handlers;
- role/permission regressions;
- autosave/live-region regressions;
- procedure validation regressions;
- mobile architecture changes beyond styling;
- new dependencies or abstractions without necessity.

Fix all critical/important findings before PR completion.

- [ ] **Step 10: Open PR**

Title:

```text
refactor(client): redesign detail SOP workbench
```

Body:

```text
Implements `.agent/specs/2026-08-14-detail-sop-workbench-ui-design.md` via `.agent/plans/2026-08-14-detail-sop-workbench-ui-implementation.md`.

- use clickable breadcrumbs as the only visible back navigation on authenticated detail workspaces;
- simplify the Penyusun SOP command bar around document identity, autosave, one primary workflow action, and secondary document actions;
- convert the SOP metadata panel from nested cards into a compact property inspector;
- preserve inline procedure editing while standardizing compact auto-growing fields, column sizing, time controls, scrolling, and table hierarchy;
- simplify preview/edit controls without changing diagram state or business workflow.
```

- [ ] **Step 11: Require full repository CI success**

Fetch the PR workflow run for the exact head SHA and require normal mandatory jobs to succeed: client quality, server quality, database migration invariants, minimal production config, critical E2E business journeys, and container builds when present in the PR workflow.

- [ ] **Step 12: Squash merge and verify**

Squash merge only after CI success and no unresolved blocker. Fetch PR metadata afterward and require:

```text
state = closed
merged = true
base = main
```

Then fetch `main` and report the resulting squash commit SHA.

---

## Acceptance checklist

- Authenticated detail pages do not render a standalone back button above the workspace.
- Every migrated detail page has a deterministic clickable ancestor breadcrumb.
- `DetailPageLayout` no longer exposes `description`, `backTo`, `backSize`, or generic local `actions` ownership.
- Penyusun SOP command bar uses the SOP identity rather than a dominant generic `Dokumen SOP` label.
- Command bar has no horizontal scrolling or vertical-wheel-to-horizontal remapping.
- Autosave remains announced via live-region semantics; saved is subtle, error exposes retry.
- Exactly one permitted workflow action is visually primary.
- Print/version actions retain existing conditions/blocking behavior and remain reachable as secondary actions.
- Revision guidance remains visible with the same domain branching.
- Editable right-panel tab is labeled `Properti`; read-only mode remains `Informasi`.
- All metadata groups/fields, add/remove dialogs, implementer behavior, and autosave handlers remain present.
- Metadata presentation no longer uses card-per-section `MetadataFieldCard` wrappers.
- Procedure editor remains an inline desktop table and preserves the existing mobile structure.
- Kegiatan, Kelengkapan, Output, and Keterangan start compact and auto-grow.
- Tipe/Pelaksana/select controls share the same resting height and focus treatment.
- Waktu remains two independently focusable controls but reads visually as one compound field.
- Procedure columns use intentional widths and the desktop editor has discoverable horizontal scrolling.
- Procedure table header remains visible while scrolling long data.
- Row menu, decision configuration, add/delete row behavior, and validation-before-done remain unchanged.
- Preview/manual-path controls expose clear pressed-state semantics and retain all existing diagram behavior.
- Client typecheck, lint, unit tests, production build, the new detail-workbench E2E, and mandatory repository CI pass before squash merge.
