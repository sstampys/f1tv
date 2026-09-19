# Floating Paths Background

## Changes
- Add the supplied reusable floating-paths component under the UI components folder.
- Install the `motion` package and use its React animation API.
- Replace the full-screen shader on the countdown page with two layered floating-path backgrounds for visual depth.
- Keep the centered countdown and live-stream player behavior unchanged.

## Technical details
- Render the SVG paths as a fixed, non-interactive background beneath the countdown.
- Use theme-aware foreground strokes so the paths remain visible on the black page.
- Respect reduced-motion preferences through the animation library.
- Remove the old shader import from the page without deleting unrelated UI files.
