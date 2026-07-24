// Client-side entry point for privileged RPCs.
//
// These functions are no longer executable with the anon key (migration 037),
// because they trust a caller id passed in as an argument. They now run behind
// /api/rpc, which replaces that argument with the id from the session cookie.
//
// The return shape matches `supabase.rpc()` — `{ data, error }` — so call sites
// only need the function swapped, not their error handling rewritten. Note that
// identity arguments no longer need to be passed; anything sent is overwritten.

export type RpcResult<T> = {
  data: T | null
  error: { message: string } | null
}

export async function callRpc<T = any>(
  fn: string,
  args: Record<string, unknown> = {}
): Promise<RpcResult<T>> {
  try {
    const response = await fetch('/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fn, args }),
      // Session cookie must ride along for identity resolution.
      credentials: 'same-origin',
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      return {
        data: null,
        error: { message: payload?.error || `Request failed (${response.status})` },
      }
    }

    return { data: (payload?.data ?? null) as T | null, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error?.message || 'Network error' },
    }
  }
}
