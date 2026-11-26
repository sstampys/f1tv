import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Legal - F1Box" },
      { name: "description", content: "Legal information and privacy policy" },
      { property: "og:title", content: "Legal - F1Box" },
      { property: "og:description", content: "Legal information and privacy policy" },
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
          <h1 data-reveal>Legal Information</h1>
          <Link to="/" className="control" data-reveal>Back to Home</Link>
        </div>
        <div className="row">
          <h2 className="row__label" data-reveal>Privacy Policy</h2>
          <div className="row__body prose">
            <p data-reveal><strong>Data Collection:</strong> F1Box does not collect, store, or retain any personal data from users. We do not track your viewing habits, personal information, or any identifying data.</p>
            <p data-reveal><strong>Third-Party Data:</strong> All streams and metadata displayed on this application are fetched from third-party sources. F1Box does not host, store, or control any streaming content or metadata.</p>
            <p data-reveal><strong>No Content Hosting:</strong> F1Box is a streaming aggregator application only. We do not host any audio, video, or media content on our servers.</p>
          </div>
        </div>
        <div className="row">
          <h2 className="row__label" data-reveal>Disclaimer</h2>
          <div className="row__body prose">
            <p data-reveal>This application provides access to streams and metadata sourced from third-party providers. Users are responsible for ensuring their use complies with applicable laws and regulations in their jurisdiction.</p>
            <p data-reveal>F1Box is provided "as is" without any warranties or guarantees. We are not responsible for the availability, quality, or legality of third-party streams.</p>
          </div>
        </div>
        <div className="row">
          <h2 className="row__label" data-reveal>Third-Party Services</h2>
          <div className="row__body prose">
            <p data-reveal>The streams and data displayed in this application come from third-party providers. For issues related to stream availability, quality, or content, please contact the respective third-party service providers.</p>
          </div>
        </div>
        <div className="row">
          <h2 className="row__label" data-reveal>Cookies & Analytics</h2>
          <div className="row__body prose">
            <p data-reveal>F1Box does not use cookies, analytics, or any tracking technology to monitor user activity.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
