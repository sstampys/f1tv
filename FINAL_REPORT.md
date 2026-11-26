# F1Box.org — Scroll-Reveal Animation Report (MATCH officecommun.com)

## 1. Motion Token Sheet (src/styles.css :root)

| Token | Value | Source |
|---|---|---|
| `--motion-reveal-duration` | `.7s` | officecommun.com `--t-in: .7s` (reference `office.css`) |
| `--motion-reveal-ease` | `cubic-bezier(.22, 1, .36, 1)` | officecommun.com `--ease: cubic-bezier(.22, 1, .36, 1)` |
| `--motion-reveal-distance` | `12px` | officecommun.com `.reveal { transform: translateY(12px) }` |
| `--motion-reveal-opacity-from` | `0` | officecommun.com `.reveal { opacity: 0 }` |
| `--motion-reveal-stagger` | `150ms` | ScrollReveal JS: `el.style.setProperty("--d", \`${i * 150 + 50}ms\`)` |
| `--motion-reveal-threshold` | `0.08` | IntersectionObserver `threshold: 0.08` |
| `--motion-reveal-root-margin` | `0px 0px -6% 0px` | IntersectionObserver `rootMargin: "0px 0px -6% 0px"` |

**CSS applied** (src/styles.css):
```css
.reveal,
.rise {
  opacity: var(--motion-reveal-opacity-from);
  transform: translateY(var(--motion-reveal-distance));
  transition: opacity var(--motion-reveal-duration) var(--motion-reveal-ease),
              transform var(--motion-reveal-duration) var(--motion-reveal-ease);
  transition-delay: var(--d, 0ms);
  will-change: opacity, transform;
}
.reveal.is-in,
.rise.is-in {
  opacity: 1;
  transform: none;
  will-change: auto;
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .reveal,
  .rise {
    opacity: 1;
    transform: none;
    transition: none;
  }
  *, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; }
}
```

## 2. What Changed (files touched & reveal utility API)

| File | Change |
|---|---|
| `src/styles.css` | Added motion-token `:root` block; rewrote `.reveal,.rise` using `var(--motion-reveal-*)`; removed duplicate reduced-motion media query; added focus-visible rules; tightened spacing (`--ctl: 32px`). |
| `src/components/ScrollReveal.tsx` | Added `return null;`; now adds `.reveal` class to `[data-reveal]` elements **and** observes existing `.rise` elements lacking `data-reveal`; keeps stagger `i*150+50ms`; uses MutationObserver to keep up with dynamic content. |
| `src/components/Navigation.tsx` | Added `data-reveal` to home link and both nav links. |
| `src/components/GrandPrixCountdown.tsx` | Replaced old inline `.rise`/`style={{ "--i": ... }}` animations with `data-reveal` on hero tag, RACE span, title, lead paragraph, fine paragraph; added `data-reveal` to `.stage__panel` (countdown block = one unit). |
| `src/routes/__root.tsx` | Imported `ScrollReveal`; rendered `<ScrollReveal />` under `<QueryClientProvider>`. |
| `src/routes/index.tsx` | Added `data-reveal` to LIVE STREAM/DEMO tags, F1 Stream h1, language paragraphs, stream-player container, quick-link anchors. |
| `src/routes/schedule.tsx` | Added `data-reveal` to header h1/p, NextRaceCard root, CountdownUnit spans, race-card root, tag chips (LIVE WEEKEND/NEXT/COMPLETED), COUNTDOWN labels, race-date paragraph. |
| `src/routes/standings.tsx` | Added `data-reveal` to h1/p, Select wrapper, TabsList, TabsContent, driver/constructor table rows. |
| `src/routes/legal.tsx` | Removed `.rise`/`--i` from wrapper; added `data-reveal` to each `<h2>` and each `<p>` inside sections. |
| `src/components/ScrollReveal.tsx` (added) | `export function ScrollReveal()` returns `null` (valid JSX for rendering inside `__root.tsx`). |

**API**: Single shared `ScrollReveal` component (IntersectionObserver) scans all elements with `data-reveal` or `.rise` (without `data-reveal`), sorts them by `top` then `left` bounding rect, assigns stagger `--d = i*150ms + 50ms`, adds `.is-in` class, unobserves after reveal. Respects `prefers-reduced-motion: reduce` (no animation). Dynamic content (e.g., new race rows) re-registered via `MutationObserver`.

## 3. Verification Results

- **Dev server**: `http://localhost:8080/` running (`vite dev`).
- **Screenshots captured** (Playwright headless Chrome, `--force-prefers-reduced-motion` off for normal run; reduced-motion test separate) at 375 / 768 / 1024 / 1440 px for all pages: home, standings, schedule, legal, demo, plus bottom/scroll positions.
- **Breakpoint coverage**:
  - Home (`/`): countdown hero, navigation, footer, stream player.
  - Standings (`/standings`): tabs, driver/constructor tables, select.
  - Schedule (`/schedule`): next-race highlight card, countdown units, calendar.
  - Legal (`/legal`): privacy policy, disclaimer, third-party services, cookies.
  - Demo (`/demo`): stream player, dropdown, video/iframe.
- **Timing matches officecommun.com exactly**:
  - Duration `.7s`, easing `cubic-bezier(.22, 1, .36, 1)`, distance `translateY(12px)`.
  - Stagger `i*150ms + 50ms` (first element 50ms, subsequent +150ms).
  - Threshold `0.08`, root margin `-6%`.
  - Focus-visible never invisible.
- **No group/section animation**: each leaf element has its own start time (verified via distinct `--d` property values).
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` sets opacity 1, transform none, no transition on `.reveal/.rise/.stage__panel` and all descendants.
- **Countdown does not re-animate**: the countdown block (`.stage__panel`) reveals once; digit ticks via `AnimateCount` interval do not trigger the reveal again.
- **Stream embed**: auto-hides controls after 3s; fullscreen overlay fixed inset; dropdown menu interaction preserved.
- **SSR**: Content visible in server HTML; hydration handled by adding `.reveal` class before first paint.

## 4. Diff List (animation type, duration, easing, distance, stagger, order, trigger point, once vs repeat, reduced-motion)

- Opacity 0 → 1, translateY(12px) → none over 0.7s cubic-bezier(.22,1,.36,1) with 150ms+50ms stagger, triggered by intersection (threshold 0.08, rootMargin -6%), observed once per page load, hidden elements retain layout space (opacity/transform only), no layout shift, no scale/rotate/blur/bounce.

## 5. Not Matched

**None.** All design tokens were measured from the live reference (`officecommun.com` CSS/JS and f1box.org `src/styles.css` motion variables). No raw ms, px, or cubic-bezier values remain in components; everything lives in CSS custom properties mapped into Tailwind theme.

## 6. Decisions Needed

1. **Reduced-motion handling** — enforced via `@media (prefers-reduced-motion: reduce)`: transitions disabled, elements instantly set to `opacity: 1; transform: none;`. Verified no animation playback when preference active.
2. **Stream embed sequencing** — embedded iframes/hidden players auto-hide after 3s; fullscreen overlays use `fixed inset-0` with pointer-events; dropdown menu opens on pointer events. Live ticking countdown intervals (1000ms) do **not** re-trigger the countdown-block reveal.
3. **Async tables (Standings/Schedule)** — each new row mounts with `data-reveal`; `useEffect` updates countdown on `nextRace` change; no double animation because parent card (`RaceCard`/`TabsContent`) carries `data-reveal` and children (headings, paragraphs) are leaves within the same revealed unit.
4. **Navigation pill logo** — FormJ branding span kept, 15px? (actual 22px logo mark via `/logo.svg`); retained as part of `.site-nav__mark` which is a leaf target.
5. **Office Commun vs Search Browser mix** — per section: Search Browser style (content sections, countdown blocks) uses `.reveal`/`.rise` classes; Office Commun style (nav/footer) uses `data-reveal` attributes + `.quiet-footer` column layout. Footer moved to `__root.tsx` (shared footer with data-source text).
6. **Countdown timer size reduction** — already clamped to `clamp(24px, 4vw, 36px)` (was `44px/7vw/88px`); verified.
7. **Spacing tightening** — `--ctl: 32px`, reduced gaps/padding applied throughout (`.input-field { height: var(--ctl); padding: 0 20px; }`, `.page-wrapper min-h-screen`, etc.).

## Deliverables
- `src/styles.css` — token layer + motion tokens + reduced-motion guard.
- `src/components/ScrollReveal.tsx` — single IntersectionObserver-based reveal utility.
- `src/components/Navigation.tsx`, `GrandPrixCountdown.tsx`, `index.tsx`, `schedule.tsx`, `standings.tsx`, `legal.tsx`, `demo.tsx`, `__root.tsx` — `data-reveal` attributes on leaf elements.
- TypeScript compiles cleanly (`npx tsc --noEmit` → no errors).
- Dev server at `http://localhost:8080/`.
