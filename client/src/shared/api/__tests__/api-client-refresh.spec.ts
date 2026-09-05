import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../api-client'

function response(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

describe('apiClient auth refresh', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shares one refresh across concurrent 401 responses and retries each request once', async () => {
    const attempts = new Map<string, number>()
    let releaseRefresh: (() => void) | undefined

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/refresh')) {
        return new Promise<Response>((resolve) => {
          releaseRefresh = () => resolve(response(200, { success: true }))
        })
      }

      const endpoint = url.slice(url.lastIndexOf('/resource-'))
      const nextAttempt = (attempts.get(endpoint) ?? 0) + 1
      attempts.set(endpoint, nextAttempt)
      return Promise.resolve(
        nextAttempt === 1
          ? response(401, { message: 'expired' })
          : response(200, { endpoint, attempt: nextAttempt }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const first = apiClient.get<{ endpoint: string; attempt: number }>('/resource-a')
    const second = apiClient.get<{ endpoint: string; attempt: number }>('/resource-b')
    const third = apiClient.get<{ endpoint: string; attempt: number }>('/resource-c')

    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'))).toHaveLength(1)
    })

    releaseRefresh?.()

    await expect(Promise.all([first, second, third])).resolves.toEqual([
      { endpoint: '/resource-a', attempt: 2 },
      { endpoint: '/resource-b', attempt: 2 },
      { endpoint: '/resource-c', attempt: 2 },
    ])
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'))).toHaveLength(1)
    expect(attempts).toEqual(
      new Map([
        ['/resource-a', 2],
        ['/resource-b', 2],
        ['/resource-c', 2],
      ]),
    )
  })
})
