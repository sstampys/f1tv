## Goal

Let you verify the source dropdown (Sky Sports default, Apple TV alternative, auto-hide with player controls) even when ppv has no live F1 stream — which is the case right now, since the API currently returns no Motorsports/F1 entries.

## How you'd use it

Open the site with `?demo=1` appended to the URL:

```text
/?demo=1
```

In the Lovable preview, add `?demo=1` to the address bar. Plain `/` keeps the normal live behavior.

## Changes in `src/routes/index.tsx`

1. Add `validateSearch` to the route so `demo` is a typed search param (defaulting to off).
2. When `demo` is on, skip the ppv fetch and use a hardcoded fake stream list with several sources:
   - `Sky Sports` — placeholder embed URL
   - `Apple TV` — different placeholder embed URL
   - one extra generic source, to confirm ordering (Sky first, Apple second, rest after)
   These run through the existing `buildSources()`, so ordering, dedupe, and labelling are exercised by the same production code.
3. Everything else unchanged: dropdown renders only with 2+ sources, defaults to the first (Sky Sports), switching remounts the iframe, and the 3-second inactivity fade still applies.

Placeholder embeds will be public test video URLs so something actually renders and you can see the frame reload when switching.

## What to check at `/?demo=1`

- Dropdown appears top-right reading "Sky Sports".
- It lists Sky Sports, Apple TV, then the extra source, in that order.
- Selecting Apple TV swaps the iframe content.
- Idle 3 seconds → dropdown fades out; mouse move, tap, or keypress brings it back.

## Notes

- The demo flag is harmless on the published site but can be removed later if you'd rather it not exist there.
