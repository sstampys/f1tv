## Goal

Make the F1 embed on `/` use the Apple TV feed from ppv when available, instead of the default source.

## How ppv exposes sources

Each stream from `https://api.ppv.st/api/streams` has:
- `tag` / `source_tag` — the broadcaster label (e.g. "Peacock", "AFLE+")
- `iframe` — the embed URL for that source
- `substreams` — an array of alternate feeds, each with its own `source_tag` and `iframe`

For F1, ppv lists an Apple TV feed either as the main stream or as one of the substreams.

## Changes

Edit `src/routes/index.tsx`:

1. Update the `Stream` type to include `source_tag` and a `substreams` array of `{ source_tag, tag, iframe }`.
2. After picking the F1 stream (Motorsports / Grand Prix match, unchanged), build a candidate list = `[stream, ...stream.substreams]`.
3. Pick the first candidate whose `source_tag` or `tag` matches `/apple\s*tv|appletv|atv/i`.
4. If no Apple TV candidate exists, fall back to the current behavior (main stream's iframe).
5. Feed the resolved iframe URL into the existing `<iframe>` (same extraction via `src="..."` regex, same 60-second polling, same key-on-src reload behavior).

No UI changes — page stays fully black with just the embed.

## Verification

After the change, in the browser console on `/`:
- Confirm the network call to `api.ppv.st/api/streams` still runs once per minute.
- Inspect the mounted `<iframe>`'s `src` and confirm it corresponds to the Apple TV substream (URL / host will differ from the default source).
- If ppv has no Apple TV feed at that moment, confirm the embed still loads via the fallback source rather than going blank.
