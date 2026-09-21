# Liquid-glass source picker

## What will change
- Add a reusable Apple Tahoe-style liquid-glass button in the UI folder, adapted from the supplied incomplete snippet into valid typed React.
- Restore the stream player and source picker on the live/demo screen.
- Use the glass button as the picker trigger, with a matching glass menu listing Sky Sports, Apple TV, and F1 TV Pro when available.
- Preserve Sky Sports as the default and the existing three-second auto-hide/reappear behavior.

## Verification
- Open the playable sample demo, switch between all three sources, and confirm playback changes.
- Confirm the picker hides after inactivity and returns on pointer movement or touch.
- Check desktop and mobile layouts.

## Technical details
- Reuse the existing Radix dropdown primitives and semantic theme styling.
- Keep the liquid effect lightweight and compatible with the current full-screen video; no external background image or WebGL scene is needed.
