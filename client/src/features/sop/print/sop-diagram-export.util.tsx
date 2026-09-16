import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { toPng } from 'html-to-image'
import type { PenyusunWorkbenchDiagramKonfigurasi } from '@/types/dto/sop.dto'
import type { ProsedurRow } from '@/types/ui/sop'
import { waitForPaintFrames } from '@/shared/print/print-frame-wait'
import { SopDiagramExportHost } from './sop-diagram-export-host'
import {
  waitForSopDiagramPrintReady,
  type SopDiagramKind,
} from './sop-browser-print'

export interface DiagramPageSnapshot {
  kind: 'flowchart' | 'bpmn'
  pageIndex: number
  dataUrl: string
  width: number
  height: number
}

export interface SopDiagramExportInput {
  name?: string
  prosedurRows: ProsedurRow[]
  implementers: { id: string; name: string }[]
  diagramKonfigurasi?: PenyusunWorkbenchDiagramKonfigurasi
}

export type DiagramSnapshotKind = SopDiagramKind

const EXPORT_ROOT_STYLE =
  'position:fixed;left:-16000px;top:0;width:297mm;background:#fff;pointer-events:none;z-index:-1;'

const snapshotCache = new Map<string, DiagramPageSnapshot[]>()
let exportHostSequence = 0

const DEFAULT_EXPORT_TIMEOUT_MS = 15_000
const MAX_EXPORT_RETRIES = 2
const RETRY_DELAY_MS = 500

function waitForSettledPaint(frames = 4): Promise<void> {
  return waitForPaintFrames(frames)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function buildCacheKey(input: SopDiagramExportInput): string {
  return JSON.stringify({
    name: input.name,
    rows: input.prosedurRows,
    implementers: input.implementers,
    diagramKonfigurasi: input.diagramKonfigurasi,
  })
}

export function buildSopDiagramExportCacheKey(input: SopDiagramExportInput): string {
  return buildCacheKey(input)
}

async function exportPrintPageElement(
  element: HTMLElement,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const width = Math.max(Math.ceil(element.scrollWidth), Math.ceil(element.offsetWidth))
  const height = Math.max(Math.ceil(element.scrollHeight), Math.ceil(element.offsetHeight))
  if (width <= 0 || height <= 0) {
    throw new Error('Ukuran halaman diagram tidak valid untuk diekspor')
  }
  const dataUrl = await toPng(element, {
    width,
    height,
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#ffffff',
  })
  return { dataUrl, width, height }
}

async function exportPagesFromHost(
  root: ParentNode,
  hostSelector: string,
  kind: DiagramPageSnapshot['kind'],
): Promise<DiagramPageSnapshot[]> {
  const pages = root.querySelectorAll(`${hostSelector} .print-page`)
  const snapshots: DiagramPageSnapshot[] = []
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]
    if (!(page instanceof HTMLElement)) {
      continue
    }
    const { dataUrl, width, height } = await exportPrintPageElement(page)
    snapshots.push({ kind, pageIndex: index, dataUrl, width, height })
  }
  return snapshots
}

async function tryExportKindOnce(
  input: SopDiagramExportInput,
  timeoutMs: number,
  kind: DiagramSnapshotKind,
): Promise<DiagramPageSnapshot[] | null> {
  const container = document.createElement('div')
  container.setAttribute('data-sop-diagram-export-container', '')
  container.style.cssText = EXPORT_ROOT_STYLE
  document.body.appendChild(container)
  exportHostSequence += 1
  const root = createRoot(container, {
    identifierPrefix: `sop-diagram-export-${kind}-${exportHostSequence}-`,
  })
  try {
    flushSync(() => {
      root.render(<SopDiagramExportHost input={input} kinds={[kind]} />)
    })
    await waitForSettledPaint(6)

    const ready = await waitForSopDiagramPrintReady({
      scope: container,
      timeoutMs,
      requiredKinds: [kind],
    })
    if (!ready) {
      return null
    }

    await waitForSettledPaint(4)

    const exported = await exportPagesFromHost(
      container,
      `.sop-print-diagram-${kind}`,
      kind,
    )
    return exported.length > 0 ? exported : null
  } finally {
    root.unmount()
    container.remove()
  }
}

export async function exportSopDiagramSnapshots(
  input: SopDiagramExportInput,
  options: { useCache?: boolean; timeoutMs?: number; requiredKinds?: DiagramSnapshotKind[] } = {},
): Promise<DiagramPageSnapshot[]> {
  const useCache = options.useCache ?? true
  const requiredKinds = options.requiredKinds ?? []
  const hasRequiredKinds = (snapshots: DiagramPageSnapshot[]) =>
    requiredKinds.every((kind) => snapshots.some((snapshot) => snapshot.kind === kind))
  const cacheKey = buildCacheKey(input)
  if (useCache) {
    const cached = snapshotCache.get(cacheKey)
    if (cached != null && cached.length > 0 && hasRequiredKinds(cached)) {
      return cached
    }
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_EXPORT_TIMEOUT_MS

  const kindsToExport = requiredKinds.length > 0
    ? [...new Set(requiredKinds)]
    : (['flowchart', 'bpmn'] as DiagramSnapshotKind[])
  const exported: DiagramPageSnapshot[] = []

  for (const kind of kindsToExport) {
    let kindSnapshots: DiagramPageSnapshot[] | null = null
    let lastError: Error | null = null
    for (let attempt = 0; attempt <= MAX_EXPORT_RETRIES; attempt += 1) {
      if (attempt > 0) {
        await delay(RETRY_DELAY_MS)
      }
      try {
        kindSnapshots = await tryExportKindOnce(input, timeoutMs, kind)
        if (kindSnapshots != null && kindSnapshots.length > 0) {
          break
        }
        lastError = new Error(`Percobaan ke-${attempt + 1}: diagram ${kind} belum siap`)
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
      }
    }
    if (kindSnapshots == null || kindSnapshots.length === 0) {
      throw new Error(
        `Diagram ${kind} gagal dirender setelah ${MAX_EXPORT_RETRIES + 1} percobaan. ` +
        (lastError?.message ?? ''),
      )
    }
    exported.push(...kindSnapshots)
  }

  if (useCache && exported.length > 0 && hasRequiredKinds(exported)) {
    snapshotCache.set(cacheKey, exported)
  }
  return exported
}

export function clearSopDiagramSnapshotCache(): void {
  snapshotCache.clear()
}
