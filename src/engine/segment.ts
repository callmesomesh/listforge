import { KNOWN_CATCH_ALL_MX_FRAGMENTS } from './types';
import type { DomainInput, MxResult, SegmentedAccount, SegmentReport } from './types';

/**
 * Segment accounts by verifiability, in the order a sender should trust them:
 *
 *   1. no_mx / lookup_failed  → invalid — nothing to send to, don't send
 *   2. MX host matches a known catch-all-by-default provider → hold — this
 *      domain accepts mail for ANY address, so per-mailbox verification tools
 *      cannot distinguish a real inbox from a typo. No amount of tooling
 *      fixes this; the only real test is an SMTP-level probe, which this
 *      demo does not perform (and a legitimate verifier would rate-limit).
 *   3. Otherwise → clean — has real MX and isn't a known catch-all provider.
 *
 * This mirrors the actual lesson: segment BEFORE loading into any sending
 * tool, and hold what can't be verified rather than guessing.
 */
export function segment(inputs: DomainInput[], mxByDomain: Map<string, MxResult>): SegmentReport {
  const accounts: SegmentedAccount[] = inputs.map((input) => {
    const mx = mxByDomain.get(input.domain) ?? {
      domain: input.domain,
      status: 'lookup_failed' as const,
      records: [],
      checkedAt: new Date().toISOString(),
    };
    const { verdict, reason } = classify(mx);
    return { ...input, mx, verdict, reason };
  });

  return {
    accounts,
    clean: accounts.filter((a) => a.verdict === 'clean'),
    catchAllHold: accounts.filter((a) => a.verdict === 'catch_all_hold'),
    invalid: accounts.filter((a) => a.verdict === 'invalid'),
  };
}

function classify(mx: MxResult): { verdict: SegmentedAccount['verdict']; reason: string } {
  if (mx.status === 'invalid_name') {
    return { verdict: 'invalid', reason: 'Not a valid domain name — fix the record before anything else' };
  }
  if (mx.status === 'nxdomain') {
    return { verdict: 'invalid', reason: 'Domain does not exist (NXDOMAIN) — a typo or a dead company; permanently unreachable' };
  }
  if (mx.status === 'lookup_failed') {
    return { verdict: 'invalid', reason: 'DNS lookup failed — could not reach a resolver for this domain; possibly transient, retry before writing it off' };
  }
  if (mx.status === 'no_mx') {
    return { verdict: 'invalid', reason: 'No MX record — this domain exists but cannot receive mail' };
  }
  const catchAllProvider = mx.records.find((host) =>
    KNOWN_CATCH_ALL_MX_FRAGMENTS.some((fragment) => host.toLowerCase().includes(fragment)),
  );
  if (catchAllProvider) {
    return {
      verdict: 'catch_all_hold',
      reason: `MX (${catchAllProvider}) belongs to a provider known to accept mail for any address by default — per-mailbox verification is meaningless here without an SMTP-level probe`,
    };
  }
  return { verdict: 'clean', reason: `Real MX (${mx.records[0]}) and no known catch-all pattern` };
}
