'use client';

import { useMemo, useState } from 'react';
import { lookupMx } from '@/engine/mx';
import { segment } from '@/engine/segment';
import { SCENARIO_ACCOUNTS, SCENARIO_MX } from '@/engine/dataset';
import type { MxResult } from '@/engine/types';

const VERDICT_LABEL: Record<string, string> = {
  clean: 'Clean',
  catch_all_hold: 'Hold',
  invalid: 'Invalid',
};

export default function ListForgeDemo() {
  const report = useMemo(() => segment(SCENARIO_ACCOUNTS, SCENARIO_MX), []);

  const [liveDomain, setLiveDomain] = useState('');
  const [liveResult, setLiveResult] = useState<MxResult | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const runLiveCheck = async () => {
    const domain = liveDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain) return;
    setLiveLoading(true);
    setLiveError(null);
    setLiveResult(null);
    try {
      const r = await lookupMx(domain);
      setLiveResult(r);
    } catch {
      setLiveError('Lookup failed unexpectedly.');
    } finally {
      setLiveLoading(false);
    }
  };

  return (
    <div className="main-col">
      <section className="panel" aria-label="Live MX check">
        <div className="panel-head">
          <h2>Try it on a real domain</h2>
          <span className="count">live DNS-over-HTTPS lookup, not simulated</span>
        </div>
        <div className="funnel-panel">
          <div className="live-check">
            <input
              type="text"
              placeholder="e.g. your-company.com"
              value={liveDomain}
              onChange={(e) => setLiveDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runLiveCheck()}
              aria-label="Domain to check"
            />
            <button className="btn btn-primary" onClick={runLiveCheck} disabled={liveLoading || !liveDomain.trim()}>
              {liveLoading ? 'checking…' : 'check MX →'}
            </button>
          </div>
          {liveError && <div className="live-result">{liveError}</div>}
          {liveResult && (
            <div className={`live-result${liveLoading ? ' pending' : ''}`}>
              <strong>{liveResult.domain}</strong>
              {liveResult.queriedAs && <> (queried as <code className="mono">{liveResult.queriedAs}</code>)</>}
              {' — '}
              {liveResult.status === 'has_mx' && (
                <>
                  has_mx: {liveResult.records.join(', ')}
                  <div className="rec">
                    This domain can receive mail. Clean vs. held would depend on whether the MX
                    belongs to a known catch-all provider — see the scripted scenario below for
                    that check in action.
                  </div>
                </>
              )}
              {liveResult.status === 'no_mx' && (
                <>
                  no_mx — this domain exists but publishes no mail exchange record
                  <div className="rec">It cannot receive email. Never load this into a sender.</div>
                </>
              )}
              {liveResult.status === 'nxdomain' && (
                <>
                  nxdomain — this domain does not exist
                  <div className="rec">
                    The resolver returned NXDOMAIN: nothing is registered here. A typo or a dead
                    company — permanently unreachable, which is a different fact than a domain
                    with no mail setup.
                  </div>
                </>
              )}
              {liveResult.status === 'invalid_name' && (
                <>
                  invalid_name — not a plausible domain name
                  <div className="rec">This input can&apos;t be queried as a hostname. Check for typos, spaces, or a full email address where a domain should be.</div>
                </>
              )}
              {liveResult.status === 'lookup_failed' && (
                <>
                  lookup_failed
                  <div className="rec">The resolver couldn&apos;t be reached or returned an error — possibly transient. Retry before writing the domain off.</div>
                </>
              )}
            </div>
          )}
          {!liveResult && !liveError && (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Type any domain — <code className="mono">stripe.com</code>,{' '}
              <code className="mono">your-company.com</code>, a typo you&apos;re curious about — and
              this fires a real DNS query to Cloudflare&apos;s public resolver from your browser.
              No data leaves this page except the domain name itself.
            </p>
          )}
        </div>
      </section>

      <section className="panel" aria-label="Scripted segmentation scenario">
        <div className="panel-head">
          <h2>Segment before loading — scripted scenario</h2>
          <span className="count">10 accounts · synthetic, deterministic</span>
        </div>
        <div className="funnel-panel">
          <div className="cohort-summary">
            <div className="cohort-card clean">
              <div className="cohort-count">{report.clean.length}</div>
              <div className="cohort-label">Clean — send now</div>
            </div>
            <div className="cohort-card hold">
              <div className="cohort-count">{report.catchAllHold.length}</div>
              <div className="cohort-label">Catch-all — hold</div>
            </div>
            <div className="cohort-card invalid">
              <div className="cohort-count">{report.invalid.length}</div>
              <div className="cohort-label">Invalid — drop</div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="accounts">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Domain</th>
                  <th>MX</th>
                  <th>Verdict</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                {report.accounts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.company}</td>
                    <td className="domain-cell">{a.domain}</td>
                    <td className="domain-cell">{a.mx.records[0] ?? '—'}</td>
                    <td>
                      <span className={`verdict-pill ${a.verdict}`}>{VERDICT_LABEL[a.verdict]}</span>
                    </td>
                    <td className="reason-cell">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
