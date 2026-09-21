import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Legal - F1TV" },
      { name: "description", content: "Legal information and privacy policy" },
      { property: "og:title", content: "Legal - F1TV" },
      { property: "og:description", content: "Legal information and privacy policy" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Legal,
});

function Legal() {
  return (
    <div style={{ 
      backgroundColor: "#000", 
      minHeight: "100dvh", 
      width: "100%", 
      margin: 0, 
      padding: "40px 20px",
      color: "#fff",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      lineHeight: "1.6",
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "32px" }}>Legal Information</h1>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>Privacy Policy</h2>
          <p style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: "16px" }}>
            <strong>Data Collection:</strong> F1TV does not collect, store, or retain any personal data from users. We do not track your viewing habits, personal information, or any identifying data.
          </p>
          <p style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: "16px" }}>
            <strong>Third-Party Data:</strong> All streams and metadata displayed on this application are fetched from third-party sources. F1TV does not host, store, or control any streaming content or metadata.
          </p>
          <p style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: "16px" }}>
            <strong>No Content Hosting:</strong> F1TV is a streaming aggregator application only. We do not host any audio, video, or media content on our servers.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>Disclaimer</h2>
          <p style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: "16px" }}>
            This application provides access to streams and metadata sourced from third-party providers. Users are responsible for ensuring their use complies with applicable laws and regulations in their jurisdiction.
          </p>
          <p style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: "16px" }}>
            F1TV is provided "as is" without any warranties or guarantees. We are not responsible for the availability, quality, or legality of third-party streams.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>Third-Party Services</h2>
          <p style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: "16px" }}>
            The streams and data displayed in this application come from third-party providers. For issues related to stream availability, quality, or content, please contact the respective third-party service providers.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>Cookies & Analytics</h2>
          <p style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: "16px" }}>
            F1TV does not use cookies, analytics, or any tracking technology to monitor user activity.
          </p>
        </section>

        <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid rgba(255, 255, 255, 0.2)" }}>
          <Link
            to="/"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "6px",
              color: "#fff",
              textDecoration: "none",
              transition: "background-color 300ms ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
