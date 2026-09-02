export interface DomainInput {
  id: string;
  company: string;
  domain: string;
}

export type MxStatus = 'has_mx' | 'no_mx' | 'nxdomain' | 'invalid_name' | 'lookup_failed';

export interface MxResult {
  domain: string;
  status: MxStatus;
  records: string[]; // raw MX exchange hostnames, empty if none
  checkedAt: string;
  /** ASCII (punycode) form actually queried, when it differs from the input. */
  queriedAs?: string;
}

export type Verdict = 'clean' | 'catch_all_hold' | 'invalid';

export interface SegmentedAccount extends DomainInput {
  mx: MxResult;
  verdict: Verdict;
  reason: string;
}

export interface SegmentReport {
  accounts: SegmentedAccount[];
  clean: SegmentedAccount[];
  catchAllHold: SegmentedAccount[];
  invalid: SegmentedAccount[];
}

/** Provider hostname fragments known to run catch-all-by-default on shared MX. */
export const KNOWN_CATCH_ALL_MX_FRAGMENTS = [
  'improvmx.com',
  'forwardemail.net',
  'zoho.com', // Zoho free-tier MX commonly runs catch-all
];
