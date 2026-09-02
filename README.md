# ListForge

**Live demo: https://listforge-demo-someshs-projects-04586766.vercel.app** *(interactive, real DNS lookups, no signup)*

An ABM list-hygiene tool: type any domain and get its genuine MX records back from a live
DNS-over-HTTPS query, then watch a scripted list of 10 accounts split into the only three
buckets that matter before a send — the ones you can mail, the ones nobody can verify, and
the ones that were never deliverable.

## What business problem this solves

Outbound teams load a list first and discover it's rotten from the bounce report. By then the
sending domain has already taken the damage, and reputation is far slower to rebuild than a
list is to clean. Most of the rot isn't typos — it's domains with no mail server at all, and
catch-all domains that accept mail for every address ever invented, so a verification tool
returns a confident "valid" for an inbox that does not exist.

Segmenting before the load costs an afternoon. Segmenting after costs the domain.

## Original experience vs. this reconstruction

I (Somesh Samanta) built this discipline running real outbound across several markets: MX
checks, catch-all detection and provider validity applied to the list *before* anything was
loaded into a sending tool, with the unverifiable cohort held back rather than gambled on. On
one India list, 41 of 147 contacts sat on catch-all domains — 28% that no verification vendor
at any price could confirm, and that would have been sent blind under the usual workflow. The
clean cohort went first; the catch-alls waited for a different treatment.

**This repo is a clean-room, generalized reconstruction.** The scripted scenario uses invented
companies on `.example` domains (IANA-reserved, never resolvable), so nothing in it can be
mistaken for a real account. The live panel queries only public DNS infrastructure records —
the same MX lookup any mail server performs before delivery. No employer data, contact data,
or identifiers appear anywhere in this repo.

## The two halves

**Live MX lookup.** Type a domain. The browser asks Cloudflare's public DoH resolver
(`cloudflare-dns.com/dns-query`, CORS-enabled, no API key) for MX records and shows what comes
back. This is a real query, not a simulation — try `google.com`, your own domain, or something
that doesn't exist.

**Scripted scenario.** 10 accounts with fixed MX results, so the three-outcome story renders
identically for every visitor rather than depending on what DNS happens to say today.

## The segmentation logic

Three outcomes, evaluated in the order a sender should trust them:

1. **Invalid (2 of 10)** — `no_mx` or a failed lookup. No mail server exists, or none could be
   reached. There is nothing to send to. Remove, don't retry.
2. **Catch-all — hold (3 of 10)** — MX belongs to a provider that accepts mail for *any*
   address by default. Per-mailbox verification is meaningless here: the provider says yes to
   everything, so a "valid" result carries no information. Hold the cohort; treat it
   differently.
3. **Clean (5 of 10)** — real MX, no known catch-all pattern. This is what loads into the
   sending tool, and it goes first.

Every verdict carries the record that produced it, so the call is auditable rather than a
label to trust.

## Run it

```bash
npm install
npm test        # 13 engine tests: MX parsing, the three verdicts, batch concurrency, determinism
npm run dev
```

No credentials, no accounts. The only network call is the DNS query you trigger yourself.

## Limitations (honest ones)

- **Catch-all can only be truly proven by an SMTP probe** — connecting to the mail server and
  testing whether it accepts a deliberately fake address. This demo does not do that, and a
  legitimate verifier rate-limits it heavily. MX-based detection infers the likely case from
  the provider; it does not prove it.
- **The known-catch-all provider list is short** — a handful of hostname fragments. Production
  needs a maintained provider table plus the SMTP probe above, and it still won't catch a
  self-hosted server configured catch-all.
- MX presence proves a domain can receive mail. It says nothing about whether the specific
  mailbox exists, which is the separate problem verification vendors sell into.
- Role addresses, disposable domains, spam traps and suppression history are all real parts of
  hygiene that this demo leaves out.

## For a real implementation

A list-hygiene pass on your outbound before it touches a sending tool: MX and provider
segmentation, catch-all cohorting, a clean-first send order, and a written rule for what gets
held rather than guessed. I've run this across markets where the unverifiable share was near a
third of the list. If your bounce rate is teaching you things your pre-send process should
have, this is what I do.

— Somesh Samanta · someshsamanta6@gmail.com
