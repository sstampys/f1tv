import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
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

      
      <main className="editorial-page legal-page">
        <header className="">
          <Link to="/" className="btn btn-wash gap-2 mb-8 inline-flex">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Back to Home
          </Link>
          <h1 className="text-ink  rise" style={{ "--i": "0" }}>
            Legal Information
          </h1>
        </header>

        <div className="space-y-12 rise" style={{ "--i": "1" }}>
          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">Privacy Policy</h2>
            <div className="space-y-4 text-ink-2 leading-relaxed">
              <p>
                <strong>Data Collection:</strong> F1Box does not collect, store, or retain any personal data from users. We do not track your viewing habits, personal information, or any identifying data.
              </p>
              <p>
                <strong>Third-Party Data:</strong> All streams and metadata displayed on this application are fetched from third-party sources. F1Box does not host, store, or control any streaming content or metadata.
              </p>
              <p>
                <strong>No Content Hosting:</strong> F1Box is a streaming aggregator application only. We do not host any audio, video, or media content on our servers.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">Disclaimer</h2>
            <div className="space-y-4 text-ink-2 leading-relaxed">
              <p>
                This application provides access to streams and metadata sourced from third-party providers. Users are responsible for ensuring their use complies with applicable laws and regulations in their jurisdiction.
              </p>
              <p>
                F1Box is provided "as is" without any warranties or guarantees. We are not responsible for the availability, quality, or legality of third-party streams.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">Third-Party Services</h2>
            <div className="space-y-4 text-ink-2 leading-relaxed">
              <p>
                The streams and data displayed in this application come from third-party providers. For issues related to stream availability, quality, or content, please contact the respective third-party service providers.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">Cookies & Analytics</h2>
            <div className="space-y-4 text-ink-2 leading-relaxed">
              <p>
                F1Box does not use cookies, analytics, or any tracking technology to monitor user activity.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">Data Sources</h2>
            <div className="space-y-4 text-ink-2 leading-relaxed">
              <p>
                Formula 1 championship data (standings, schedule, results) is sourced from the 
                <a href="https://api.jolpi.ca/ergast/f1/" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink transition-colors">
                  Jolpica-F1 API
                </a>
                (community-maintained successor to the Ergast API).
              </p>
              <p>
                Live stream links are aggregated from <a href="https://ppv.st" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink transition-colors">ppv.st</a>.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="quiet-footer">
        <div className="mx-auto">
          <p>Built with TanStack Start & Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}
