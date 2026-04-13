const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? 'http://localhost:4100/graphql';
const REST_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100/api';

if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && GRAPHQL_URL.includes('localhost')) {
  throw new Error('NEXT_PUBLIC_GRAPHQL_URL must be set in production');
}

export function getRestUrl() {
  return REST_URL;
}

// Simple TTL cache + in-flight deduplication for GraphQL queries
const CACHE_TTL = 30_000; // 30 seconds
const queryCache = new Map<string, { data: unknown; ts: number }>();
const inflight = new Map<string, Promise<unknown>>();

function cacheKey(query: string, variables: Record<string, unknown>): string {
  return query + '::' + JSON.stringify(variables);
}

export async function gql<T>(query: string, variables: Record<string, unknown> = {}, token?: string | null): Promise<T> {
  // Only cache queries (not mutations)
  const isMutation = query.trimStart().startsWith('mutation');
  const key = isMutation ? '' : cacheKey(query, variables);

  if (!isMutation && key) {
    const cached = queryCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.data as T;
    }

    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;
  }

  const promise = (async () => {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ query, variables })
    });
    const json = (await res.json()) as { data?: T; errors?: Array<{ message: string; extensions?: { code?: string } }> };
    const unauthorized =
      res.status === 401 ||
      json.errors?.some(
        (e) => e.extensions?.code === 'UNAUTHENTICATED' || /invalid token|unauthorized|jwt/i.test(e.message ?? '')
      );
    if (unauthorized) {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('calcula:unauthorized'));
      const err = new Error('UNAUTHORIZED') as Error & { code?: string };
      err.code = 'UNAUTHORIZED';
      throw err;
    }
    if (!res.ok || json.errors?.length) {
      throw new Error(json.errors?.[0]?.message ?? 'GraphQL request failed');
    }
    if (!json.data) throw new Error('No GraphQL data');

    if (!isMutation && key) {
      queryCache.set(key, { data: json.data, ts: Date.now() });
    }

    return json.data;
  })();

  if (!isMutation && key) {
    inflight.set(key, promise);
    promise.finally(() => inflight.delete(key));
  }

  return promise;
}

/** Invalidate all cached queries (call after mutations that change data). */
export function invalidateQueryCache() {
  queryCache.clear();
}

export async function rest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const res = await fetch(`${REST_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('calcula:unauthorized'));
    const err = new Error('UNAUTHORIZED') as Error & { code?: string };
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
