import type { DomainInput, MxResult } from './types';

/**
 * Scripted scenario — deterministic MX results, not a live lookup, so the
 * three-outcome story (clean / catch-all-hold / invalid) always renders the
 * same way regardless of what real DNS happens to say today. Company names
 * are invented; domains are `.example` (IANA-reserved, never resolvable) so
 * nothing here can be mistaken for a real account or a live lookup result.
 * The separate "live check" panel on the page runs the real thing against
 * whatever domain a visitor types.
 */
export const SCENARIO_ACCOUNTS: DomainInput[] = [
  { id: 'a1', company: 'Meridian Desk Co', domain: 'meridiandesk.example' },
  { id: 'a2', company: 'Cobalt Interiors', domain: 'cobaltinteriors.example' },
  { id: 'a3', company: 'Thornfield Studio', domain: 'thornfield.example' },
  { id: 'a4', company: 'Harborline Logistics', domain: 'harborline.example' },
  { id: 'a5', company: 'Atelier Nord', domain: 'atelier-nord.example' },
  { id: 'a6', company: 'Quiet Lane Home', domain: 'quietlane.example' },
  { id: 'a7', company: 'Veldt Furnishings', domain: 'veldt.example' },
  { id: 'a8', company: 'Bramble & Oak', domain: 'brambleoak.example' },
  { id: 'a9', company: 'Hartwell Living', domain: 'hartwell.example' },
  { id: 'a10', company: 'Southdown Retail', domain: 'southdown.example' },
];

const at = '2026-09-01T08:00:00Z';

export const SCENARIO_MX = new Map<string, MxResult>([
  ['meridiandesk.example', { domain: 'meridiandesk.example', status: 'has_mx', records: ['aspmx.l.google.com'], checkedAt: at }],
  ['cobaltinteriors.example', { domain: 'cobaltinteriors.example', status: 'has_mx', records: ['smtp.secureserver.net'], checkedAt: at }],
  ['thornfield.example', { domain: 'thornfield.example', status: 'has_mx', records: ['mx.improvmx.com'], checkedAt: at }],
  ['harborline.example', { domain: 'harborline.example', status: 'has_mx', records: ['aspmx.l.google.com'], checkedAt: at }],
  ['atelier-nord.example', { domain: 'atelier-nord.example', status: 'has_mx', records: ['mx1.zoho.com'], checkedAt: at }],
  ['quietlane.example', { domain: 'quietlane.example', status: 'has_mx', records: ['mail.protection.outlook.com'], checkedAt: at }],
  ['veldt.example', { domain: 'veldt.example', status: 'no_mx', records: [], checkedAt: at }],
  ['brambleoak.example', { domain: 'brambleoak.example', status: 'has_mx', records: ['aspmx.l.google.com'], checkedAt: at }],
  ['hartwell.example', { domain: 'hartwell.example', status: 'lookup_failed', records: [], checkedAt: at }],
  ['southdown.example', { domain: 'southdown.example', status: 'has_mx', records: ['mx.forwardemail.net'], checkedAt: at }],
]);
