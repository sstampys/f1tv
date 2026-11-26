import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Privacy & Legal" },
      { name: "description", content: "Privacy policy, legal information and disclaimers for F1Box." },
      { property: "og:title", content: "Privacy & Legal - F1Box" },
      { property: "og:description", content: "Privacy policy, legal information and disclaimers for F1Box." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.f1box.org/legal" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "canonical", href: "https://www.f1box.org/legal" },
    ],
  }),
  component: Legal,
});

function Legal() {
  return (
    <div className="page">
      <section className="rows">
        <div className="page-container head">
          <h1 data-reveal>Privacy &amp; Legal</h1>
          <Link to="/" className="control" data-reveal>Back to Home</Link>
        </div>
        <div className="page-container">
          <p className="mute" data-reveal>Last updated: 26 November 2026</p>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Summary</h2>
          <div className="row__body prose">
            <p data-reveal>
              F1Box has no accounts, sign-up forms, or comment features, and we don't ask you for personal
              information. We don't sell data or build profiles of visitors. Like any website, though, F1Box runs on
              third-party infrastructure that processes some technical data when you visit. This page explains what
              that is.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Information we collect</h2>
          <div className="row__body prose">
            <p data-reveal>
              F1Box itself does not collect your name, email address, location, or any other information you'd provide
              directly. We don't track your viewing habits.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Hosting and technical data</h2>
          <div className="row__body prose">
            <p data-reveal>
              F1Box is hosted on Vercel. When you visit, Vercel's servers process standard request information needed
              to deliver the site and keep it secure, including your IP address, location derived from your IP address,
              browser and device details, the pages requested, and timestamps. Vercel may keep this in server and
              request logs under its own retention practices. F1Box does not use this data to identify or profile
              individual visitors. Vercel's handling of this data is described in the Vercel Privacy Notice at{' '}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
                vercel.com/legal/privacy-policy
              </a>.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Analytics</h2>
          <div className="row__body prose">
            <p data-reveal>
              F1Box does not run any analytics tools. The only usage data is the infrastructure-level logging described
              above.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Cookies and local storage</h2>
          <div className="row__body prose">
            <p data-reveal>
              F1Box does not set cookies of its own and does not use advertising or cross-site tracking cookies. F1Box
              stores a lightweight cache of race data and a one-time navigation flag in your browser's local and
              session storage, on your device only. Streams are shown through third-party players that load inside
              F1Box. Those providers are independent and may use their own cookies or similar technologies, which F1Box
              doesn't control.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Third-party APIs and data sources</h2>
          <div className="row__body prose">
            <p data-reveal>
              Race schedules, standings, and results come from the{' '}
              <a href="https://api.jolpi.ca/ergast/f1/" target="_blank" rel="noopener noreferrer">Jolpica-F1 API</a>{' '}
              (the successor to the Ergast API). Live stream links come from{' '}
              <a href="https://ppv.st" target="_blank" rel="noopener noreferrer">ppv.st</a>. Your browser connects to
              these services directly, so they can see your IP address and standard request details as with any website
              you visit. Their handling of data is governed by their own policies.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>No content hosting</h2>
          <div className="row__body prose">
            <p data-reveal>
              F1Box is an aggregator only. We do not host or store audio, video, or media on our servers, and we do not
              control third-party stream content or metadata.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Data sharing and retention</h2>
          <div className="row__body prose">
            <p data-reveal>
              We don't sell, rent, or share personal data, because we don't hold any ourselves. Technical data
              processed by Vercel and the third-party providers above is kept according to their own policies.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Your rights</h2>
          <div className="row__body prose">
            <p data-reveal>
              Depending on where you live (for example under the GDPR or CCPA), you may have rights to access, correct,
              or delete personal data. Because F1Box doesn't hold personal data about you directly, requests about data
              processed by Vercel or the third-party providers should go to them. Contact us at{' '}
              <a href="mailto:formulaj@proton.me">formulaj@proton.me</a> and we'll help where we can.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Children</h2>
          <div className="row__body prose">
            <p data-reveal>
              F1Box is not directed at children under 13, and we don't knowingly collect information from them.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Changes</h2>
          <div className="row__body prose">
            <p data-reveal>
              We may update this page, and the "Last updated" date above will change when we do.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Disclaimer</h2>
          <div className="row__body prose">
            <p data-reveal>
              This application provides access to streams and metadata sourced from third-party providers. Users are
              responsible for ensuring their use complies with applicable laws and regulations in their jurisdiction.
            </p>
            <p data-reveal>
              F1Box is provided "as is" without any warranties or guarantees. We are not responsible for the
              availability, quality, or legality of third-party streams.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Third-Party Services</h2>
          <div className="row__body prose">
            <p data-reveal>
              The streams and data displayed in this application come from third-party providers (including the
              Jolpica-F1 API and ppv.st), and the site is hosted by Vercel. For issues related to stream availability,
              quality, or content, please contact the respective third-party provider.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Contact</h2>
          <div className="row__body prose">
            <p data-reveal>
              Questions about this page: <a href="mailto:formulaj@proton.me">formulaj@proton.me</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
