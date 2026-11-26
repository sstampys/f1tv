import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Legal - F1Box" },
      { name: "description", content: "Legal information and privacy policy" },
      { property: "og:title", content: "Legal - F1Box" },
      { property: "og:description", content: "Legal information and privacy policy" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Legal,
});

function Legal() {
  return (
    <div className="min-h-screen bg-ground">
      <section className="editorial-page legal-page">
        <header className="">
          <div className="page-container">
            <Link to="/" className="btn btn--secondary gap-2" style={{ marginBottom: 'var(--s8)' }} data-reveal>
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              Back to Home
            </Link>
            <h1 className="text-ink rise" style={{ "--i": "0" }} data-reveal>
              Legal Information
            </h1>
          </div>
        </header>

        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s15)' }}>
          <section>
            <h2 className="text-ink" style={{ fontSize: 'var(--t)', lineHeight: 'var(--lh)', fontWeight: 500, marginBottom: 'var(--s4)' }} data-reveal>
              Privacy Policy
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)', color: 'var(--ink-2)', lineHeight: 'var(--lh)' }}>
              <p data-reveal>
                <strong>Data Collection:</strong> F1Box does not collect, store, or retain any personal data from users. We do not track your viewing habits, personal information, or any identifying data.
              </p>
              <p data-reveal>
                <strong>Third-Party Data:</strong> All streams and metadata displayed on this application are fetched from third-party sources. F1Box does not host, store, or control any streaming content or metadata.
              </p>
              <p data-reveal>
                <strong>No Content Hosting:</strong> F1Box is a streaming aggregator application only. We do not host any audio, video, or media content on our servers.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-ink" style={{ fontSize: 'var(--t)', lineHeight: 'var(--lh)', fontWeight: 500, marginBottom: 'var(--s4)' }} data-reveal>
              Disclaimer
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)', color: 'var(--ink-2)', lineHeight: 'var(--lh)' }}>
              <p data-reveal>
                This application provides access to streams and metadata sourced from third-party providers. Users are responsible for ensuring their use complies with applicable laws and regulations in their jurisdiction.
              </p>
              <p data-reveal>
                F1Box is provided "as is" without any warranties or guarantees. We are not responsible for the availability, quality, or legality of third-party streams.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-ink" style={{ fontSize: 'var(--t)', lineHeight: 'var(--lh)', fontWeight: 500, marginBottom: 'var(--s4)' }} data-reveal>
              Third-Party Services
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)', color: 'var(--ink-2)', lineHeight: 'var(--lh)' }}>
              <p data-reveal>
                The streams and data displayed in this application come from third-party providers. For issues related to stream availability, quality, or content, please contact the respective third-party service providers.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-ink" style={{ fontSize: 'var(--t)', lineHeight: 'var(--lh)', fontWeight: 500, marginBottom: 'var(--s4)' }} data-reveal>
              Cookies & Analytics
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)', color: 'var(--ink-2)', lineHeight: 'var(--lh)' }}>
              <p data-reveal>
                F1Box does not use cookies, analytics, or any tracking technology to monitor user activity.
              </p>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}