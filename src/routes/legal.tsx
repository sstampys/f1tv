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
              F1Box has no accounts, sign-up forms, or comment features and doesn't ask you for personal information;
              we don't sell data or build profiles of visitors. Like any website, though, it runs on third-party
              infrastructure that processes some technical data when you visit. F1Box itself doesn't collect your name,
              email address, location, or anything else you'd provide directly, and doesn't track your viewing habits.
              This page explains the rest.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Hosting, analytics and storage</h2>
          <div className="row__body prose">
            <p data-reveal>
              F1Box is hosted on Vercel, which delivers the site's files to your browser. When you visit, Vercel's
              servers process standard request information needed to deliver the site and keep it secure, including
              your IP address, location derived from your IP address, browser and device details, the files requested,
              and timestamps. Vercel may keep this in logs under its own retention practices, described in the Vercel
              Privacy Notice (
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
                vercel.com/legal/privacy-policy
              </a>
              ). F1Box's own servers do not request race data or streams on your behalf, and F1Box does not use this
              technical data to identify or profile visitors.
            </p>
            <p data-reveal>
              F1Box uses Vercel Web Analytics to collect anonymized, aggregated visitor analytics. This service does
              not use cookies or cross-site tracking. It provides us with high-level metrics such as page views,
              visitor regions (country/city), device types, and referrer sources, which help us understand site
              traffic and improve the experience. No personal identifiers are collected, and the data cannot be
              linked to individual visitors. The analytics script is loaded from Vercel's infrastructure and its
              data processing is governed by the Vercel Privacy Notice (
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
                vercel.com/legal/privacy-policy
              </a>
              ).
            </p>
            <p data-reveal>
              Beyond Vercel Web Analytics, F1Box does not run any other analytics tools. The only other usage data
              is the infrastructure-level logging by Vercel described above.
            </p>
            <p data-reveal>
              F1Box does not set cookies of its own and does not use advertising or cross-site tracking cookies. To
              load faster, F1Box saves copies of recently loaded race data — schedule, standings and results — in your
              browser's local storage on your own device, under keys beginning f1box:. This is public
              Formula&nbsp;1 data, it stays on your device, it is never sent to F1Box, and you can remove it at any
              time by clearing this site's data in your browser settings. F1Box also keeps a one-time navigation flag
              in session storage, and saves your theme choice (light or dark) in your browser's local storage on your
              own device; it is never sent to us. Stream players that load inside F1Box are operated by third parties and may use their
              own cookies or similar technologies, which F1Box doesn't control.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Third-party services and data</h2>
          <div className="row__body prose">
            <p data-reveal>
              Race schedules, standings and results are loaded by your browser directly from the{' '}
              <a href="https://api.jolpi.ca/ergast/f1/" target="_blank" rel="noopener noreferrer">Jolpica-F1 API</a>{' '}
              (api.jolpi.ca), and live stream links directly from{' '}
              <a href="https://ppv.st" target="_blank" rel="noopener noreferrer">ppv.st</a> (api.ppv.st). Because your
              browser contacts these services directly, they can see your IP address, browser details and the request
              itself, as with any website you visit. These requests do not pass through F1Box's servers and F1Box does
              not receive a copy. Each provider's handling of data is governed by its own policies.
            </p>
            <p data-reveal>
              F1Box is an aggregator only: we do not host or store audio, video, or media on our servers, and we do not
              control third-party stream content or metadata. When a stream is shown, the player is served by a third
              party whose domain varies per stream and which may load its own content, ads and cookies that F1Box does
              not control.
            </p>
            <p data-reveal>
              We don't sell, rent, or share personal data because we don't hold any ourselves; technical data processed
              by Vercel and the providers above is kept according to their own policies. For issues related to stream
              availability, quality or content, please contact the respective third-party provider.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Your rights, children and changes</h2>
          <div className="row__body prose">
            <p data-reveal>
              Depending on where you live (for example under the GDPR or CCPA), you may have rights to access, correct,
              or delete personal data. Because F1Box doesn't hold personal data about you directly, requests about data
              processed by Vercel or the third-party providers should go to them; contact us at{' '}
              <a href="mailto:formulaj@proton.me">formulaj@proton.me</a> and we'll help where we can.
            </p>
            <p data-reveal>
              F1Box is not directed at children under 13, and we don't knowingly collect information from them. We may
              update this page, and the "Last updated" date above will change when we do.
            </p>
          </div>
        </div>

        <div className="row">
          <h2 className="row__label" data-reveal>Disclaimer</h2>
          <div className="row__body prose">
            <p data-reveal>
              This application provides access to streams and metadata sourced from third-party providers, and users
              are responsible for ensuring their use complies with applicable laws and regulations in their
              jurisdiction. F1Box is provided "as is" without any warranties or guarantees, and we are not responsible
              for the availability, quality, or legality of third-party streams.
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
