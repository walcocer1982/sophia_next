'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'

/**
 * Run an async operation with shared loading state and uniform error toasts.
 *
 * Replaces the repeated `setLoading(true) → try/catch/finally → toast.error`
 * shape. A server-provided message (thrown as {@link ApiError}) is shown
 * verbatim; any other failure (network, etc.) falls back to "Error de
 * conexión", preserving the previous UX.
 *
 * `key` lets a component track per-row pending state (e.g. which career row
 * is saving) with a single hook instance.
 *
 *   const { run, isPending } = useAsyncOp()
 *   await run(() => apiFetch('/api/...', { method: 'POST', json }), { key: id })
 *   <Button disabled={isPending(id)} />
 */
export function useAsyncOp() {
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const run = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      opts: { key?: string; errorMessage?: string } = {},
    ): Promise<T | undefined> => {
      setPendingKey(opts.key ?? '_')
      try {
        return await fn()
      } catch (e) {
        const message =
          e instanceof ApiError
            ? e.message
            : opts.errorMessage ?? 'Error de conexión'
        toast.error(message)
        return undefined
      } finally {
        setPendingKey(null)
      }
    },
    [],
  )

  return {
    run,
    pending: pendingKey,
    isPending: (key?: string) => pendingKey === (key ?? '_'),
  }
}
