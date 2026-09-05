import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSingleWriterAutosave } from '../use-single-writer-autosave'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('useSingleWriterAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('serializes writes and coalesces edits made while a write is active', async () => {
    const writes: Array<ReturnType<typeof deferred>> = []
    const save = vi.fn((patch: { value: number }) => {
      const pending = deferred()
      writes.push(pending)
      return pending.promise.then(() => patch)
    })

    const { result, rerender } = renderHook(
      ({ value }) =>
        useSingleWriterAutosave({
          snapshot: { value },
          buildPatch: (current, baseline) =>
            current.value === baseline.value ? null : { value: current.value },
          save,
          debounceMs: 10,
          savedIndicatorMs: 1000,
        }),
      { initialProps: { value: 0 } },
    )

    rerender({ value: 1 })
    await act(async () => {
      vi.advanceTimersByTime(10)
      await Promise.resolve()
    })

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenNthCalledWith(1, { value: 1 })
    expect(result.current.status).toBe('saving')

    rerender({ value: 2 })
    rerender({ value: 3 })
    await act(async () => {
      vi.advanceTimersByTime(100)
      await Promise.resolve()
    })

    // Tidak boleh ada write paralel selama write pertama belum selesai.
    expect(save).toHaveBeenCalledTimes(1)

    await act(async () => {
      writes[0].resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    // Setelah write pertama selesai, hanya snapshot terbaru yang ditulis.
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenNthCalledWith(2, { value: 3 })

    await act(async () => {
      writes[1].resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('saved')
  })

  it('flush waits for the active write and drains the latest dirty snapshot', async () => {
    const writes: Array<ReturnType<typeof deferred>> = []
    const save = vi.fn((patch: { value: number }) => {
      const pending = deferred()
      writes.push(pending)
      return pending.promise.then(() => patch)
    })

    const { result, rerender } = renderHook(
      ({ value }) =>
        useSingleWriterAutosave({
          snapshot: { value },
          buildPatch: (current, baseline) =>
            current.value === baseline.value ? null : { value: current.value },
          save,
          debounceMs: 10,
        }),
      { initialProps: { value: 0 } },
    )

    rerender({ value: 1 })
    await act(async () => {
      vi.advanceTimersByTime(10)
      await Promise.resolve()
    })
    rerender({ value: 2 })

    let flushed = false
    let flushPromise!: Promise<void>
    act(() => {
      flushPromise = result.current.flush().then(() => {
        flushed = true
      })
    })

    expect(flushed).toBe(false)
    expect(save).toHaveBeenCalledTimes(1)

    await act(async () => {
      writes[0].resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenNthCalledWith(2, { value: 2 })
    expect(flushed).toBe(false)

    await act(async () => {
      writes[1].resolve()
      await flushPromise
    })

    expect(flushed).toBe(true)
    expect(result.current.status).toBe('saved')
  })
})
