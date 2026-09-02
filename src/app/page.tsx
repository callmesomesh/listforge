import ListForgeDemo from '@/components/ListForgeDemo';

export default function Page() {
  return (
    <div className="shell">
      <header className="masthead">
        <p className="wordmark">
          list<span>forge</span>
        </p>
        <span className="masthead-what">segment before you load, not after</span>
        <span className="provenance">interactive demo · live DNS + synthetic scenario</span>
      </header>

      <section className="intro">
        <h1>
          A list looks clean until you check which domains can actually receive mail — and which
          ones will swallow anything without telling you.
        </h1>
        <p>
          The first panel runs a real DNS lookup against any domain you type. The second replays a
          scripted scenario showing how a real account list gets segmented into clean, held, and
          invalid before it ever reaches a sending tool.
        </p>
      </section>

      <ListForgeDemo />

      <article className="story">
        <p className="kicker">The business story</p>
        <h2>Why this system exists</h2>
        <p>
          Loading a raw account list straight into a sending tool and letting its built-in
          verifier sort it out is how deliverability dies quietly. Two failure modes hide inside
          &quot;verified&quot; lists: domains with no mail exchange at all (typos, dead companies),
          and domains that run catch-all — they accept mail for literally any address, so a
          per-mailbox verifier reports every guess as valid. On a real 147-contact India list I
          worked, 41 contacts — 28% — turned out to be catch-all domains once checked this way.
        </p>

        <h3>What I actually built and ran</h3>
        <p>
          A segment-before-load discipline applied to every outbound list, across markets: check
          MX before anything else, flag known catch-all-by-default providers, and hold that cohort
          out of the send rather than trusting a verification tool that cannot actually tell a real
          inbox from a typo on those domains. The clean cohort ships first; the held cohort gets a
          human decision, not a guess.
        </p>

        <h3>The judgment calls</h3>
        <ul>
          <li>
            <strong>Segment before loading, every time, no exceptions.</strong> The discipline only
            works if it&apos;s the first gate, not a cleanup pass after a bounce spike.
          </li>
          <li>
            <strong>Catch-all is a hold, not a guess.</strong> No verification tool at any price can
            distinguish a real inbox from a typo on a domain that accepts everything — the honest
            answer is &quot;hold for a human,&quot; not a confidence score.
          </li>
          <li>
            <strong>&quot;Invalid&quot; needs a reason, not just a flag.</strong> No-MX and
            DNS-lookup-failure look identical in a spreadsheet but mean different things — one is
            permanent, the other might be transient.
          </li>
        </ul>

        <h3>What went wrong before this was standard practice</h3>
        <p>
          Before this became a mandatory first gate, verified-seeming lists shipped with catch-all
          domains blended in, inflating apparent list quality while quietly capping deliverability
          — a sending tool has no way to tell you it just spent a send on a domain that would have
          accepted the wrong address just as happily.
        </p>

        <h3>What I&apos;d change today</h3>
        <p>
          The catch-all provider list here is a short, known-pattern set. A production version
          should also flag domains whose MX changed recently (a signal a company just moved
          providers and old contacts may bounce) and track false-positive/negative rates against
          real send outcomes over time.
        </p>
      </article>

      <aside className="disclosure">
        <strong>Original vs. reconstruction</strong>
        <p>
          The segment-before-loading discipline and the 41-of-147 catch-all finding are real work I
          (Somesh Samanta) did across multiple outbound markets. This demo is a clean-room,
          generalized reconstruction: the scripted scenario uses entirely invented companies on
          non-resolvable <code className="mono">.example</code> domains. The MX-check panel above it
          is not a simulation — it performs a genuine DNS-over-HTTPS query against whatever domain
          you enter, reading only public DNS infrastructure records. No prospect or employer data
          appears anywhere in this repo.
        </p>
      </aside>

      <footer className="footer">
        <span>Somesh Samanta — GTM &amp; growth systems</span>
        <a href="https://github.com/callmesomesh/listforge">source + tests on GitHub</a>
        <a href="https://funnel-doctor-demo.vercel.app">Funnel Doctor →</a>
        <a href="https://daily-pulse-demo.vercel.app">Daily Pulse →</a>
        <a href="https://somesh-systems.vercel.app">all systems →</a>
      </footer>
    </div>
  );
}
