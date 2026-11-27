import { Check, ChevronDown, Loader2, X, Maximize2, Minimize2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { SourceLanguage } from "@/lib/source-language";

export type Source = { label: string; src: string; language: SourceLanguage | null };

type Props = {
  demo?: "sample" | "ppv";
  sources: Source[];
  iframeSrc: string | null;
  currentSource?: Source;
  hasStream: boolean;
  streamLoaded: boolean;
  controlsVisible: boolean;
  menuOpen: boolean;
  isFullscreen: boolean;
  setMenuOpen: (open: boolean) => void;
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
  menuOpen,
  isFullscreen,
  setMenuOpen,
  setSelected,
  setStreamLoaded,
  setIsFullscreen,
  handleIframeLoad,
  toggleFullscreen,
}: Props) {
  return (
    <div className="page page--center">
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
                controlsVisible || menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <div className="flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  className={controlsVisible || menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
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
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="btn btn--secondary gap-2" aria-label="Change stream source">
                  <span className="max-w-36 truncate">{currentSource?.label ?? "Sources"}</span>
                  <ChevronDown className="size-4 opacity-80 transition-transform group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="source-menu w-80 max-w-[calc(100vw-2rem)] p-1.5"
              >
                {sources.map((source) => (
                  <DropdownMenuItem
                    key={source.src}
                    onSelect={() => { setSelected(source.src); setStreamLoaded(false); }}
                    className="source-item cursor-pointer gap-3 px-3 py-2 text-sm focus:bg-wash focus:text-ink"
                  >
                    <span className="flex-1 truncate">{source.label}</span>
                    {source.language ? (
                      <span className="shrink-0 opacity-75">{source.language.code}</span>
                    ) : null}
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      {source.src === iframeSrc ? <Check className="size-4 text-ink" /> : null}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
