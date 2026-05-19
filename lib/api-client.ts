/**
 * Thin client-side fetch wrapper.
 *
 * Collapses the `fetch → res.ok ? res.json() : parse error → toast` boilerplate
 * that was copy-pasted across ~25 components. On a non-2xx response it throws
 * an {@link ApiError} carrying the server's `{ error }` message so callers
 * (or {@link useAsyncOp}) can surface it directly.
 */

/** Error carrying a server-provided message (distinct from network failures). */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options: (Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit }) = {},
): Promise<T> {
  const { json, ...init } = options
  const res = await fetch(url, {
    ...init,
    headers:
      json !== undefined
        ? { 'Content-Type': 'application/json', ...init.headers }
        : init.headers,
    body: json !== undefined ? JSON.stringify(json) : init.body,
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error || `Error ${res.status}`
    throw new ApiError(message, res.status)
  }

  return data as T
}
