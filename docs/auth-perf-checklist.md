# Auth page performance checklist

Quick verification that `/auth` stays instant on low-end phones (save-data,
2G, reduced-motion).

## Test mode

Open `/auth?perf=1` to show the perf overlay (TTFB / FCP / LCP / heap /
connection / video state).

Add `&simulate=2g` to force the low-data code path (background video is
skipped, poster image carries the page).

Combine with Chrome DevTools throttling for the most realistic run:

1. DevTools → Network → throttling: **Slow 4G** or custom **2G** profile
2. DevTools → Network → check **Disable cache**
3. DevTools → Rendering → **Emulate CSS prefers-reduced-motion: reduce**
4. DevTools → Network → request headers → add **Save-Data: on**
5. DevTools → Performance → CPU throttling: **4x slowdown**
6. Reload `/auth?perf=1&simulate=2g`

## Targets (mid-range Android, throttled 4x CPU, Slow 4G)

| Metric        | Good   | Needs work |
| ------------- | ------ | ---------- |
| TTFB          | <200ms | >600ms     |
| FCP           | <1.5s  | >2.5s      |
| LCP           | <2.5s  | >4s        |
| JS heap       | <40MB  | >80MB      |
| Tap-to-input  | <100ms | >300ms     |

## Manual checks

- [ ] Page renders fully **without scrolling** on 360×640 viewport.
- [ ] Sticky bottom CTA visible above the on-screen keyboard.
- [ ] Form is **usable before** the background video loads (poster shows).
- [ ] With `simulate=2g`, the overlay reports `BG video: skipped`.
- [ ] With `prefers-reduced-motion`, no looping animation plays.
- [ ] Inline validation errors appear/clear on blur + change.
- [ ] Forgot-password link reachable in one tap.
- [ ] No console errors, no failed network requests on first paint.
- [ ] Lighthouse mobile Performance score ≥ 90 on `/auth`.

## What the page does to stay fast

- Poster image (`auth-hero.jpg`) renders immediately; the MP4 only mounts
  via `requestIdleCallback` when the device is **not** on save-data, 2G,
  or `prefers-reduced-motion`.
- `<video preload="metadata">` keeps the initial network footprint small.
- Dashboard JS chunk is prefetched while the user types.
- Forms use `mode: "onTouched"` so validation work is deferred until the
  user has interacted with a field.
