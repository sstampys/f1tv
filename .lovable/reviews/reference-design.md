# Reference design audit

Inspected live on 26 November 2026 using Chromium computed styles and CSSOM: Search `/`, `/arc`, `/faq`, `/changelog`, `/measured`, `/sponsors`, `/ios`; Office Commun `/`, `/services`, `/about`, `/contact`, `/projects/figr`.

## Findings and reference choices

The references are related, but **not identical**. Search uses white (#ffffff), #171717 ink, 16px/1.55 on the homepage, a 64px full-width sticky header (56px below 720px), and a 1280px outer maximum. Its information pages use 15px/24px and a 680px content maximum. Office Commun uses #fcfcfc paper, #000 ink, 15px/24px text, a centered fixed pill navigation, and a 664px editorial grid (96px label + 40px gutter + 528px body). Both use Inter, regular 400 and emphasis 500, restrained underlines, 24px desktop margins, 999px control radii, and cubic-bezier(.22,1,.36,1).

Neither reference has the large statement headline described in the uploaded brief: their current homepage h1 is body-size. The implementation follows measured styles, not that description. Office Commun's computed letter spacing is .005em (and its wordmark -.01em); this project's zero-letter-spacing constraint takes precedence.

Shared treatment defaults to Office Commun, pending the user's preference. Legal follows Search's compact 680px information layout. Tables use Search FAQ's plain ruled pairs; calendar entries use Office Commun's editorial label/body rows. Video remains the app's own media, not a copied reference asset. No reference logos, imagery, copy, favicon, or OG art are copied.

## Token provenance

Office Commun: paper #fcfcfc; ink #000; mute rgba(0,0,0,.45); field #f4f4f2; soft #f0f0ee; hover #e8e8e6; primary #262626, hover #000; nav border #eeeeed; field hover #eaeae8, focus #d2d2d0; media rgba(0,0,0,.04); 15px text, 24px line height; spacing 8/16/24/32/48/64/120px; 32px controls; 999px pill, 12px field, 4px media radius; 96/40/528px columns; 96px top room, 80px below 760px; margins 24px, 16px below 760px; .15s UI, .7s entrance. Media hover scale 1.03 over .9s.

Search: paper #fff; ink #171717; secondary rgba(23,23,23,.5); faint rgba(23,23,23,.36); hair rgba(23,23,23,.09); wash #f3f3f2; hover #f5f5f5; pill #ececec; 680px info maximum; 1280px media maximum; information pairs 11px 16px 11px 0 padding; 48px section separation; 24px/40px footer padding. Homepage uses 16px/24.8px; information pages 15px/24px. Search primary controls 44px, 38px in navigation; its panel radius is 18px and screenshot radius 14px. Screenshot-only shadows do not apply to this app's unframed data.

## Existing app audit

Content routes: index (countdown/live player), standings (season selector, driver/constructor tabs and tables), schedule (season selector, next race, upcoming/past race toggle), demo (sample/PPV source selection), legal (existing policies). Shared root navigation and error/not-found pages. Server endpoint `/api/embed` is unchanged.

Active presentation: GrandPrixCountdown, Navigation, AnimateCount, Button, Select, Tabs, DropdownMenu, LiquidGlassButton. `src/styles.css` is the global stylesheet; route-local classes and inline team/round colors are replaced with neutral reference treatment. Existing unused shadcn, Spline, starfield, spotlight, and backup components are not part of the rendered site and are not removed.

## Compatibility differences

There is no countdown, championship table, calendar, or broadcast-source picker on the references. Their visual grammar is applied to these existing functions, not a pixel-identical content/layout clone. AnimateCount motion and fixed digit cells remain per existing project requirements. Reference font replaces SF Pro for this restyle only; original local fonts and CDN fallback declarations remain available. Color-scheme preference does not trigger a dark theme on either reference; this site likewise remains light.

Verification results will be appended after checking the live pages.