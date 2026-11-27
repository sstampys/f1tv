import { Loader2, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SourceLanguage } from "@/lib/source-language";
import { LanguageSelectorDropdown } from "@/components/ui/language-selector-dropdown";
import { type DropdownOption } from "@/components/Dropdown";

export type Source = { label: string; src: string; language: SourceLanguage | null };

type Props = {
  demo?: "sample" | "ppv";
  sources: Source[];
  iframeSrc: string | null;
  currentSource?: Source;
  hasStream: boolean;
  streamLoaded: boolean;
  controlsVisible: boolean;
  isFullscreen: boolean;
  setSelected: (src: string) => void;
  setStreamLoaded: (loaded: boolean) => void;
  setIsFullscreen: (open: boolean) => void;
  handleIframeLoad: () => void;
  toggleFullscreen: () => void;
};

/**
 * The stream page body. Loaded lazily from the home route so the countdown page
 * never downloads the player, the source dropdown or their UI dependencies.
 */
export default function StreamView({
  demo,
  sources,
  iframeSrc,
  currentSource,
  hasStream,
  streamLoaded,
  controlsVisible,
  isFullscreen,
  setSelected,
  setStreamLoaded,
  setIsFullscreen,
  handleIframeLoad,
  toggleFullscreen,
}: Props) {
  const handleSourceChange = (src: string) => {
    setSelected(src);
    setStreamLoaded(false);
  };

  const dropdownOptions: DropdownOption[] = sources.map((source) => ({
    value: source.src,
    label: source.label,
    meta: source.language?.code ?? undefined,
  }));

  return (
    <div className="page page--center page--center--below-pill">
      <section className="rows">
        {/* Stream Header */}
        <div className="page-container">
          <p className="label-line" data-reveal>Live stream{demo && " · Demo"}</p>
          <div className="facts">
            <h1 className="statement" data-reveal>{currentSource?.label || "F1 Stream"}</h1>
            {currentSource?.language && (
              <p className="mute" data-reveal>
                {currentSource.language.flag} {currentSource.language.name}
              </p>
            )}
          </div>
        </div>

        {/* Embedded Video Player */}
        <div className="page-container stream-player" data-reveal>
          {demo === "sample" ? (
            <video
              key={iframeSrc}
              className="absolute inset-0 w-full h-full object-contain"
              src={iframeSrc ?? undefined}
              autoPlay
              controls
              playsInline
              onLoadStart={() => setStreamLoaded(false)}
              onCanPlay={handleIframeLoad}
            />
          ) : (
            <iframe
              key={iframeSrc}
              src={iframeSrc ?? undefined}
              title={currentSource?.label ?? "Live stream"}
              className="absolute inset-0 w-full h-full border-0 bg-player"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={handleIframeLoad}
            />
          )}

          {/* Loading overlay */}
          {!streamLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-player-overlay z-10">
              <div className="text-center text-player-text">
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-player-text" />
                <p className="text-lg">Loading stream...</p>
              </div>
            </div>
          )}

          {/* Controls overlay */}
          {hasStream && sources.length > 1 && (
            <div
              className={`player-controls absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 px-4 pb-4 ${
                controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <div className="flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  className={controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          )}

          {/* Fullscreen overlay */}
          {isFullscreen && (
            <div className="fixed inset-0 z-50 bg-player" onClick={() => setIsFullscreen(false)}>
              <div className="absolute top-4 right-4 z-60">
                <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)} aria-label="Exit fullscreen">
                  <X className="w-6 h-6 text-player-text" />
                </Button>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                {demo === "sample" ? (
                  <video
                    key={`${iframeSrc}-fs`}
                    className="max-h-[90vh] max-w-[90vw] object-contain"
                    src={iframeSrc ?? undefined}
                    autoPlay
                    controls
                    playsInline
                  />
                ) : (
                  <iframe
                    key={`${iframeSrc}-fs`}
                    src={iframeSrc ?? undefined}
                    title={currentSource?.label ?? "Live stream"}
                    className="max-h-[90vh] max-w-[90vw] border-0 bg-player"
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Source selector, outside the player */}
        {hasStream && sources.length > 1 && (
          <div className="page-container player-controls player-controls--outside">
            <LanguageSelectorDropdown
              value={iframeSrc ?? ""}
              options={dropdownOptions}
              onChange={handleSourceChange}
              ariaLabel="Change stream source"
              align="start"
            />
          </div>
        )}

        {/* Quick links below stream */}
        <div className="page-container stream-links">
          <a href="/standings" className="link" data-reveal>
            Driver Standings
          </a>
          <a href="/schedule" className="link" data-reveal>
            Race Schedule
          </a>
          <a href="/results" className="link" data-reveal>
            Race Results
          </a>
        </div>
      </section>
    </div>
  );
}
