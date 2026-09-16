import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PenyusunWorkbenchData, UpdateSopDiagramDto } from '@/types/dto/sop.dto'
import type { DiagramConfigSlice, JenisDiagramClient } from '@/features/sop/model/diagram-config.mapper'
import { diagramSliceToPatchPayload, diagramSlicesEqual } from '@/features/sop/model/diagram-config.mapper'

const DEFAULT_DEBOUNCE_MS = 800
const SAVED_INDICATOR_MS = 1500

export type SopDiagramAutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface UseSopDiagramAutosaveOptions {
  detailSopId: string | undefined
  jenis: JenisDiagramClient
  slice: DiagramConfigSlice
  expectedRevision: number
  save: (payload: UpdateSopDiagramDto) => Promise<PenyusunWorkbenchData>
  enabled?: boolean
  debounceMs?: number
}

export interface SopDiagramAutosaveControls {
  flush: () => Promise<void>
  resetBaseline: (next: DiagramConfigSlice) => void
  status: SopDiagramAutosaveStatus
  lastError: Error | null
}

export function useSopDiagramAutosave(
  options: UseSopDiagramAutosaveOptions,
): SopDiagramAutosaveControls {
  const {
    detailSopId,
    jenis,
    slice,
    expectedRevision,
    save,
    enabled = true,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = options
  const baselineRef = useRef<DiagramConfigSlice>(slice)
  const latestSliceRef = useRef<DiagramConfigSlice>(slice)
  const timerRef = useRef<number | null>(null)
  const savedTimerRef = useRef<number | null>(null)
  const inFlightRef = useRef<Promise<void> | null>(null)
  const saveRef = useRef(save)
  saveRef.current = save
  const revisionRef = useRef(expectedRevision)
  useEffect(() => {
    revisionRef.current = expectedRevision
  }, [detailSopId, expectedRevision])

  const [status, setStatus] = useState<SopDiagramAutosaveStatus>('idle')
  const [lastError, setLastError] = useState<Error | null>(null)

  const clearSavedTimer = useCallback(() => {
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current)
      savedTimerRef.current = null
    }
  }, [])

  const scheduleSavedFlash = useCallback(() => {
    clearSavedTimer()
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null
      setStatus((prev) => (prev === 'saved' ? 'idle' : prev))
    }, SAVED_INDICATOR_MS)
  }, [clearSavedTimer])

  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const detailSopIdRef = useRef(detailSopId)
  detailSopIdRef.current = detailSopId
  const jenisRef = useRef(jenis)
  jenisRef.current = jenis

  const performSave = useCallback(async (): Promise<void> => {
    if (!enabledRef.current || !detailSopIdRef.current) return
    if (diagramSlicesEqual(latestSliceRef.current, baselineRef.current)) return
    const targetSlice = latestSliceRef.current
    clearSavedTimer()
    setStatus('saving')
    const payload: UpdateSopDiagramDto = {
      ...diagramSliceToPatchPayload(jenisRef.current, targetSlice),
      expectedRevision: revisionRef.current,
    }
    const promise = saveRef
      .current(payload)
      .then((data) => {
        revisionRef.current = data.detail.diagramRevision
        baselineRef.current = targetSlice
        setLastError(null)
        setStatus('saved')
        scheduleSavedFlash()
      })
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err))
        setLastError(error)
        setStatus('error')
      })
      .finally(() => {
        if (inFlightRef.current === promise) {
          inFlightRef.current = null
        }
      })
    inFlightRef.current = promise
    await promise
  }, [clearSavedTimer, scheduleSavedFlash])

  const performSaveRef = useRef(performSave)
  performSaveRef.current = performSave

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const flush = useCallback(async () => {
    cancelTimer()
    if (inFlightRef.current) {
      await inFlightRef.current
    }
    await performSave()
  }, [cancelTimer, performSave])

  const resetBaseline = useCallback(
    (next: DiagramConfigSlice) => {
      cancelTimer()
      baselineRef.current = next
      latestSliceRef.current = next
      clearSavedTimer()
      setStatus('idle')
      setLastError(null)
    },
    [cancelTimer, clearSavedTimer],
  )

  useEffect(() => {
    latestSliceRef.current = slice
    if (!enabled || !detailSopId) return
    if (diagramSlicesEqual(slice, baselineRef.current)) {
      setStatus((prev) => (prev === 'pending' ? 'idle' : prev))
      return
    }
    cancelTimer()
    setStatus((prev) => (prev === 'saving' ? prev : 'pending'))
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      void performSaveRef.current()
    }, debounceMs)
    return () => {
      cancelTimer()
    }
  }, [slice, enabled, detailSopId, debounceMs, cancelTimer])

  useEffect(() => {
    return () => {
      cancelTimer()
      clearSavedTimer()
    }
  }, [cancelTimer, clearSavedTimer])

  return useMemo(
    () => ({ flush, resetBaseline, status, lastError }),
    [flush, resetBaseline, status, lastError],
  )
}
