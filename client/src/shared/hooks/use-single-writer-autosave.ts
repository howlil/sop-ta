import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_DEBOUNCE_MS = 800
const DEFAULT_SAVED_INDICATOR_MS = 1500

export type SingleWriterAutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface UseSingleWriterAutosaveOptions<TSnapshot, TPatch> {
  snapshot: TSnapshot
  buildPatch: (current: TSnapshot, baseline: TSnapshot) => TPatch | null
  save: (patch: TPatch) => Promise<unknown>
  enabled?: boolean
  debounceMs?: number
  savedIndicatorMs?: number
}

export interface SingleWriterAutosaveControls<TSnapshot> {
  flush: () => Promise<void>
  resetBaseline: (next: TSnapshot) => void
  status: SingleWriterAutosaveStatus
  lastError: Error | null
}

/**
 * Debounced autosave scheduler dengan satu writer aktif.
 *
 * Invariant:
 * - maksimal satu `save()` berjalan pada satu waktu;
 * - perubahan yang datang saat save aktif di-coalesce ke snapshot terbaru;
 * - setelah write selesai, scheduler langsung drain diff terbaru tanpa overlap;
 * - `flush()` menunggu writer aktif dan seluruh perubahan terbaru selesai tersimpan.
 */
export function useSingleWriterAutosave<TSnapshot, TPatch>(
  options: UseSingleWriterAutosaveOptions<TSnapshot, TPatch>,
): SingleWriterAutosaveControls<TSnapshot> {
  const {
    snapshot,
    buildPatch,
    save,
    enabled = true,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    savedIndicatorMs = DEFAULT_SAVED_INDICATOR_MS,
  } = options

  const baselineRef = useRef(snapshot)
  const latestSnapshotRef = useRef(snapshot)
  latestSnapshotRef.current = snapshot

  const buildPatchRef = useRef(buildPatch)
  buildPatchRef.current = buildPatch
  const saveRef = useRef(save)
  saveRef.current = save
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const timerRef = useRef<number | null>(null)
  const savedTimerRef = useRef<number | null>(null)
  const inFlightRef = useRef<Promise<void> | null>(null)
  const baselineGenerationRef = useRef(0)

  const [status, setStatus] = useState<SingleWriterAutosaveStatus>('idle')
  const [lastError, setLastError] = useState<Error | null>(null)

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

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
      setStatus((current) => (current === 'saved' ? 'idle' : current))
    }, savedIndicatorMs)
  }, [clearSavedTimer, savedIndicatorMs])

  const drain = useCallback((): Promise<void> => {
    if (inFlightRef.current) {
      return inFlightRef.current
    }

    let run: Promise<void>
    run = (async () => {
      while (enabledRef.current) {
        const targetSnapshot = latestSnapshotRef.current
        const patch = buildPatchRef.current(targetSnapshot, baselineRef.current)
        if (patch === null) {
          break
        }

        const generation = baselineGenerationRef.current
        clearSavedTimer()
        setStatus('saving')

        try {
          await saveRef.current(patch)
        } catch (error: unknown) {
          setLastError(error instanceof Error ? error : new Error(String(error)))
          setStatus('error')
          return
        }

        // resetBaseline() dapat terjadi ketika write lama masih berjalan. Hasil write
        // lama tidak boleh mengembalikan baseline lokal ke snapshot sebelum reset.
        if (baselineGenerationRef.current === generation) {
          baselineRef.current = targetSnapshot
        }
        setLastError(null)
      }

      if (!enabledRef.current) {
        setStatus('idle')
        return
      }

      const remainingPatch = buildPatchRef.current(
        latestSnapshotRef.current,
        baselineRef.current,
      )
      if (remainingPatch === null) {
        setStatus('saved')
        scheduleSavedFlash()
      }
    })().finally(() => {
      if (inFlightRef.current === run) {
        inFlightRef.current = null
      }
    })

    inFlightRef.current = run
    return run
  }, [clearSavedTimer, scheduleSavedFlash])

  const flush = useCallback(async () => {
    cancelTimer()
    await drain()
  }, [cancelTimer, drain])

  const resetBaseline = useCallback(
    (next: TSnapshot) => {
      cancelTimer()
      clearSavedTimer()
      baselineGenerationRef.current += 1
      baselineRef.current = next
      latestSnapshotRef.current = next
      setStatus('idle')
      setLastError(null)
    },
    [cancelTimer, clearSavedTimer],
  )

  useEffect(() => {
    if (!enabled) {
      cancelTimer()
      setStatus((current) => (current === 'saving' ? current : 'idle'))
      return
    }

    const patch = buildPatchRef.current(snapshot, baselineRef.current)
    if (patch === null) {
      cancelTimer()
      setStatus((current) => (current === 'pending' ? 'idle' : current))
      return
    }

    // Writer aktif akan membaca latestSnapshotRef lagi setelah write sekarang selesai,
    // sehingga perubahan terbaru langsung di-coalesce tanpa memulai write paralel.
    if (inFlightRef.current) {
      setStatus('saving')
      return
    }

    cancelTimer()
    setStatus('pending')
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      void drain()
    }, debounceMs)

    return cancelTimer
  }, [snapshot, enabled, debounceMs, cancelTimer, drain])

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
