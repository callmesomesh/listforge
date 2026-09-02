import type { MxResult } from './types';

/**
 * Real MX lookup via DNS-over-HTTPS (Cloudflare's public resolver, CORS-enabled,
 * no API key). This is a genuine DNS query, not a simulation — the browser asks
 * Cloudflare's resolver the same question a mail server would ask before
 * delivering to this domain. Injectable fetch so the pure segmentation logic
 * (segment.ts) can be tested without a network call; the browser default is
 * the real `fetch`.
 */
/**
 * Normalize what a user typed into a queryable ASCII hostname:
 * trim, lowercase, drop a trailing dot, punycode IDNs (münchen.de →
 * xn--mnchen-3ya.de). Returns null when the input is not a plausible hostname
 * at all (spaces, @, slashes, empty labels) — that is a different fact than a
 * failed lookup, and the resolver would reject the raw query anyway.
 */
export function normalizeDomainName(raw: string): string | null {
  const trimmed = raw.trim().replace(/\.$/, '').toLowerCase();
  if (!trimmed || /[\s/@:?#\\]/.test(trimmed)) return null;
  try {
    const ascii = new URL(`http://${trimmed}`).hostname;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(ascii)) return null;
    return ascii;
  } catch {
    return null;
  }
}

export async function lookupMx(
  domain: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = 6000,
): Promise<MxResult> {
  const checkedAt = new Date().toISOString();
  const ascii = normalizeDomainName(domain);
  if (!ascii) return { domain, status: 'invalid_name', records: [], checkedAt };
  const queriedAs = ascii === domain.trim().toLowerCase() ? undefined : ascii;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(ascii)}&type=MX`;
    const res = await fetcher(url, {
      headers: { accept: 'application/dns-json' },
      signal: controller.signal,
    });
    if (!res.ok) return { domain, status: 'lookup_failed', records: [], checkedAt, queriedAs };
    const data = (await res.json()) as { Status?: number; Answer?: Array<{ data: string }> };
    // DNS RCODE 3 = NXDOMAIN: the domain does not exist. That is a different
    // fact than "exists but publishes no MX", and gets its own verdict.
    if (data.Status === 3) return { domain, status: 'nxdomain', records: [], checkedAt, queriedAs };
    if (data.Status !== undefined && data.Status !== 0) {
      return { domain, status: 'lookup_failed', records: [], checkedAt, queriedAs };
    }
    const records = (data.Answer ?? [])
      .map((a) => a.data.split(' ').slice(1).join(' ').replace(/\.$/, ''))
      .filter(Boolean);
    return { domain, status: records.length > 0 ? 'has_mx' : 'no_mx', records, checkedAt, queriedAs };
  } catch {
    return { domain, status: 'lookup_failed', records: [], checkedAt, queriedAs };
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
