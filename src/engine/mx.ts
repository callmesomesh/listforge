import type { MxResult } from './types';

/**
 * Real MX lookup via DNS-over-HTTPS (Cloudflare's public resolver, CORS-enabled,
 * no API key). This is a genuine DNS query, not a simulation — the browser asks
 * Cloudflare's resolver the same question a mail server would ask before
 * delivering to this domain. Injectable fetch so the pure segmentation logic
 * (segment.ts) can be tested without a network call; the browser default is
 * the real `fetch`.
 */
export async function lookupMx(
  domain: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = 6000,
): Promise<MxResult> {
  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`;
    const res = await fetcher(url, {
      headers: { accept: 'application/dns-json' },
      signal: controller.signal,
    });
    if (!res.ok) return { domain, status: 'lookup_failed', records: [], checkedAt };
    const data = (await res.json()) as { Answer?: Array<{ data: string }> };
    const records = (data.Answer ?? [])
      .map((a) => a.data.split(' ').slice(1).join(' ').replace(/\.$/, ''))
      .filter(Boolean);
    return { domain, status: records.length > 0 ? 'has_mx' : 'no_mx', records, checkedAt };
  } catch {
    return { domain, status: 'lookup_failed', records: [], checkedAt };
  } finally {
    clearTimeout(timer);
  }
}

/** Look up a batch, capped concurrency so a large list doesn't fire 200 requests at once. */
export async function lookupMxBatch(
  domains: string[],
  fetcher: typeof fetch = fetch,
  concurrency = 5,
): Promise<Map<string, MxResult>> {
  const results = new Map<string, MxResult>();
  let i = 0;
  async function worker() {
    while (i < domains.length) {
      const idx = i++;
      const d = domains[idx];
      results.set(d, await lookupMx(d, fetcher));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, domains.length) }, worker));
  return results;
}
