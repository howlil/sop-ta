import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSopDiagramAutosave } from '../use-sop-diagram-autosave'
import type { DiagramConfigSlice } from '@/features/sop/model/diagram-config.mapper'

const sliceA: DiagramConfigSlice = {
  layoutSeed: 1,
  pathOverrides: {
    edges: {
      'a|b|UTAMA': {
        sSide: 'bottom',
        eSide: 'top',
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 10, y: 10 },
        bendPoints: [],
      },
    },
  },
}

const savedWorkbench = {
  detail: { diagramRevision: 1 },
}

describe('useSopDiagramAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should_not_schedule_save_when_slice_equals_baseline_after_reset', async () => {
    const save = vi.fn().mockResolvedValue(savedWorkbench)
    const { result, rerender } = renderHook(
      ({ slice, enabled }: { slice: DiagramConfigSlice; enabled: boolean }) =>
        useSopDiagramAutosave({
          detailSopId: 'detail-1',
          jenis: 'FLOWCHART',
          slice,
          expectedRevision: 0,
          save,
          enabled,
          debounceMs: 800,
        }),
      { initialProps: { slice: sliceA, enabled: false } },
    )

    act(() => {
      result.current.resetBaseline(sliceA)
    })

    rerender({ slice: sliceA, enabled: true })

    await act(async () => {
      vi.advanceTimersByTime(900)
    })

    expect(save).not.toHaveBeenCalled()
  })

  it('should_send_expected_revision_when_slice_differs_from_baseline', async () => {
    const save = vi.fn().mockResolvedValue(savedWorkbench)
    const baseline: DiagramConfigSlice = { layoutSeed: 0, pathOverrides: null }
    const { result, rerender } = renderHook(
      ({ slice }: { slice: DiagramConfigSlice }) =>
        useSopDiagramAutosave({
          detailSopId: 'detail-1',
          jenis: 'FLOWCHART',
          slice,
          expectedRevision: 0,
          save,
          enabled: true,
          debounceMs: 800,
        }),
      { initialProps: { slice: baseline } },
    )

    act(() => {
      result.current.resetBaseline(baseline)
    })

    rerender({ slice: sliceA })

    await act(async () => {
      vi.advanceTimersByTime(900)
    })

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        jenis: 'FLOWCHART',
        expectedRevision: 0,
      }),
    )
  })
})
