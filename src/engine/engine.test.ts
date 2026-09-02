import { describe, expect, it, vi } from 'vitest';
import { lookupMx, lookupMxBatch } from './mx';
import { segment } from './segment';
import type { DomainInput, MxResult } from './types';

function mockFetch(response: { Answer?: Array<{ data: string }> } | null, ok = true): typeof fetch {
  return vi.fn(async () => ({
    ok,
    json: async () => response,
  })) as unknown as typeof fetch;
}

describe('lookupMx', () => {
  it('parses MX answers into hostnames, stripping trailing dot and priority', async () => {
    const f = mockFetch({ Answer: [{ data: '10 mx1.example-provider.com.' }, { data: '20 mx2.example-provider.com.' }] });
    const r = await lookupMx('acme.example', f);
    expect(r.status).toBe('has_mx');
    expect(r.records).toEqual(['mx1.example-provider.com', 'mx2.example-provider.com']);
  });

  it('no Answer array means no_mx, not an error', async () => {
    const f = mockFetch({});
    const r = await lookupMx('nomail.example', f);
    expect(r.status).toBe('no_mx');
    expect(r.records).toEqual([]);
  });

  it('non-ok HTTP response is lookup_failed, not a thrown error', async () => {
    const f = mockFetch(null, false);
    const r = await lookupMx('broken.example', f);
    expect(r.status).toBe('lookup_failed');
  });

  it('a fetch that throws (network error) resolves to lookup_failed, never rejects', async () => {
    const f = vi.fn(async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    const r = await lookupMx('unreachable.example', f);
    expect(r.status).toBe('lookup_failed');
  });
});

describe('lookupMxBatch', () => {
  it('resolves every domain even with concurrency below the list size', async () => {
    const f = mockFetch({ Answer: [{ data: '10 mx.example.com.' }] });
    const domains = ['a.example', 'b.example', 'c.example', 'd.example', 'e.example', 'f.example', 'g.example'];
    const results = await lookupMxBatch(domains, f, 3);
    expect(results.size).toBe(domains.length);
    for (const d of domains) expect(results.get(d)?.status).toBe('has_mx');
  });

  it('empty domain list resolves to an empty map, no crash', async () => {
    const results = await lookupMxBatch([], mockFetch({}));
    expect(results.size).toBe(0);
  });
});

const input = (id: string, company: string, domain: string): DomainInput => ({ id, company, domain });
const mx = (domain: string, status: MxResult['status'], records: string[] = []): MxResult => ({
  domain, status, records, checkedAt: '2026-09-02T00:00:00Z',
});

describe('segment', () => {
  it('no_mx and lookup_failed are both invalid, with distinct reasons', () => {
    const inputs = [input('1', 'A', 'nomail.example'), input('2', 'B', 'broken.example')];
    const map = new Map([
      ['nomail.example', mx('nomail.example', 'no_mx')],
      ['broken.example', mx('broken.example', 'lookup_failed')],
    ]);
    const r = segment(inputs, map);
    expect(r.invalid).toHaveLength(2);
    expect(r.invalid[0].reason).toContain('cannot receive mail');
    expect(r.invalid[1].reason).toContain('DNS lookup failed');
  });

  it('a real MX from a known catch-all provider is held, not clean', () => {
    const inputs = [input('1', 'Acme', 'acme.example')];
    const map = new Map([['acme.example', mx('acme.example', 'has_mx', ['mx.zoho.com'])]]);
    const r = segment(inputs, map);
    expect(r.catchAllHold).toHaveLength(1);
    expect(r.clean).toHaveLength(0);
    expect(r.catchAllHold[0].reason).toContain('any address by default');
  });

  it('a real MX from an ordinary provider is clean', () => {
    const inputs = [input('1', 'Acme', 'acme.example')];
    const map = new Map([['acme.example', mx('acme.example', 'has_mx', ['aspmx.l.google.com'])]]);
    const r = segment(inputs, map);
    expect(r.clean).toHaveLength(1);
    expect(r.catchAllHold).toHaveLength(0);
  });

  it('a domain missing from the MX map defaults to invalid, not a crash', () => {
    const inputs = [input('1', 'Ghost', 'unmapped.example')];
    const r = segment(inputs, new Map());
    expect(r.invalid).toHaveLength(1);
  });

  it('every account lands in exactly one bucket', () => {
    const inputs = [
      input('1', 'Clean Co', 'clean.example'),
      input('2', 'Hold Co', 'hold.example'),
      input('3', 'Dead Co', 'dead.example'),
    ];
    const map = new Map([
      ['clean.example', mx('clean.example', 'has_mx', ['aspmx.l.google.com'])],
      ['hold.example', mx('hold.example', 'has_mx', ['mx.improvmx.com'])],
      ['dead.example', mx('dead.example', 'no_mx')],
    ]);
    const r = segment(inputs, map);
    expect(r.clean.length + r.catchAllHold.length + r.invalid.length).toBe(3);
    expect(r.accounts).toHaveLength(3);
  });

  it('empty input list produces an empty report, no crash', () => {
    const r = segment([], new Map());
    expect(r.accounts).toHaveLength(0);
    expect(r.clean).toHaveLength(0);
  });

  it('is deterministic for identical input', () => {
    const inputs = [input('1', 'Acme', 'acme.example')];
    const map = new Map([['acme.example', mx('acme.example', 'has_mx', ['aspmx.l.google.com'])]]);
    const a = segment(inputs, map);
    const b = segment(inputs, map);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
