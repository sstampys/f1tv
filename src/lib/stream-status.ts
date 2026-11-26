import { useSyncExternalStore } from "react";

/**
 * Whether a live stream is playing somewhere on the page.
 *
 * The stream players live on their own routes, but the navigation pill in the
 * root layout has to react to them, so this is a tiny external store rather
 * than context. The server snapshot is always `false`, so SSR (and the first
 * client paint) render the countdown label and it flips to "Live" once the
 * stream page reports playback.
 */
let playing = false;
const listeners = new Set<() => void>();

export function setStreamPlaying(value: boolean): void {
  if (value === playing) return;
  playing = value;
  listeners.forEach((listener) => listener());
}

export function subscribeStreamPlaying(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getStreamPlaying = () => playing;
export const getStreamPlayingServer = () => false;

export function useStreamPlaying(): boolean {
  return useSyncExternalStore(subscribeStreamPlaying, getStreamPlaying, getStreamPlayingServer);
}
