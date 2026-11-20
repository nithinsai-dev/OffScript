# OFFSCRIPT

**#beoffscript** · A campus fest and event pass website

OFFSCRIPT is a front-end for a college fest: browse events, filter and search them, open a full event page, and grab a "pass". Every event is presented as a ticket, and the whole site is built around that idea.

It was built for a front-end hackathon. The organizers provided the backend API, so everything here is the client: data fetching, validation, routing, UI, motion and performance.

## **Live link:** [Watch on YouTube](https://youtu.be/oRnp25AlaB0)

## Highlights

- **Ticket design language.** Real ticket silhouettes with inward-cut notches, perforation lines, stubs, barcodes and "ADMIT ONE" marks. Chamfered buttons, hard offset shadows and stamps. No rounded pills.
- **Landing page.** Typed `#beoffscript` hero line, a procedural canvas paint splash (click to splash), a ticket-style stats strip whose barcode is built from real event data (one bar per event), a marquee, featured passes, a countdown, a "Why OFFSCRIPT" section, sponsors and a lineup.
- **Events directory (`/events`).** All events in a grid with search and filters for category, mode, price and status. Filters are synced to the URL, so any filtered view can be shared or reloaded. Progressive rendering plus skeleton, empty and offline states.
- **Event page (`/events/$eventId`).** Banner and title reveal, a sticky info ticket (price, seats, flip countdown, register), a "Who can participate" sticky note, and a "What's inside" bento of flip cards (overview, highlights, what to expect, prerequisites, rules, schedule). "Open full" expands a card into a full panel with prizes, schedule timeline, FAQ accordion and a gallery lightbox. Previous and next event navigation and a "More events" rail.
- **Graceful registration.** Register buttons open a real link when a registration URL is configured. Until then they show a friendly "registrations aren't open yet" notice instead of a dead page.
- **Motion with restraint.** One shared timing file, a route transition curtain, entry and exit animations on the event page, and a custom desktop cursor. Everything respects reduced motion and a lite mode for weak devices.

---

## Tech stack

| Area      | Choice                                                          |
| --------- | --------------------------------------------------------------- |
| Build     | Vite                                                            |
| UI        | React 18, TypeScript (strict)                                   |
| Styling   | Tailwind CSS (no UI kit)                                        |
| Routing   | TanStack Router (typed routes, URL-synced search params)        |
| Data      | TanStack Query                                                  |
| Animation | GSAP + ScrollTrigger, Framer Motion, Lenis (smooth scroll)      |
| Graphics  | Canvas 2D for the hero splash (no WebGL, no extra dependencies) |
| Hosting   | Vercel (SPA fallback in `vercel.json`)                          |

No component libraries, no emojis, and only three colors.

---

## Getting started

```bash
# 1. Install
npm install

# 2. Develop (http://localhost:5173)
npm run dev

# 3. Production build and preview (http://localhost:4173)
npm run build
npm run preview
```

Always judge performance on the production preview (`npm run build && npm run preview`), not on the dev server. The dev server serves unbundled, unminified code and gives misleading numbers.

### Configuration

Registration is configured in `src/lib/config.ts` through `REGISTRATION_URL_BASE`.

- If it is a valid `http(s)` URL, every Register / Get Pass button becomes a real link (opened in a new tab).
- If it is empty or still the placeholder, the buttons open the "Registrations aren't open yet" notice.

Setting the real URL is the only change needed to switch the whole site to live registration.

---

## Data and API

The organizers provide the backend (CORS open, no auth).

| Endpoint                    | Returns                                     |
| --------------------------- | ------------------------------------------- |
| `GET /api/test/events`      | `{ events: [...] }` with 30 event summaries |
| `GET /api/test/events/{id}` | `{ event: {...} }` with full details        |

Notes on how the client handles it:

- A normalizer unwraps the response whether it arrives as `event`, `data` or a raw object.
- Only `id` and `name` are required during validation. Every other field is optional and unknown fields are allowed, so a sparse or changing API does not break the UI.
- Venue exists only in the detail response, so list views never show a venue.
- Amounts are formatted as rupees with `en-IN` grouping. Dates and times use `Intl` with the event's own `+05:30` offset.
- A typed `ApiError` drives separate loading, error, offline and empty states.

---

## Design system

**Palette (dark theme, three colors only):**

| Name | Hex       | Use                 |
| ---- | --------- | ------------------- |
| Ink  | `#111210` | Backgrounds         |
| Bone | `#EDEBE0` | Text and lines      |
| Volt | `#D4FF3F` | Accents and actions |

Shades come from opacity changes, not extra hues (errors included).

**Type:** a bold display grotesk for headings, a monospace accent for tiny labels and numbers, sentence-case body text.

**Shapes:** ticket silhouettes with concave notches, perforations, stubs and barcodes; chamfered buttons; hard Volt offset shadows.

---

## Motion and performance

- **Single timing source.** `src/lib/motion.ts` holds all durations through `MOTION_SCALE`, so the pace of the whole site can be tuned in one place.
- **Wait for the curtain.** Entry animations wait for the intro or route curtain to clear (`src/lib/pageReady.ts`), so nothing plays while it is hidden behind an overlay.
- **Lite / full governor.** The site checks touch input, CPU, data-saver and reduced-motion preferences and sets `data-perf` on `<html>`. Lite mode skips the custom cursor, ink trail, interactive grid and heavy effects.
- **Weight control.** Code splitting by route, lazy-loaded images, deferred non-critical JavaScript, and the splash engine loaded as a separate lazy chunk. On touch devices the hero shows a static splash and loads the interactive version only on first tap.
- **Accessibility.** Reduced motion respected, keyboard-reachable controls, focus management and scroll locking in dialogs and panels, labelled landmarks.

---

## Project layout (key files)

```
src/
  lib/
    config.ts          # registration URL and app config
    motion.ts          # all timings (MOTION_SCALE)
    pageReady.ts       # waits for intro/curtain before entry animations
    registration.ts    # decides link vs "not open yet" notice
    splash/            # canvas splash engine (lazy chunk)
  components/
    RegistrationNotice.tsx
vercel.json            # SPA rewrite so deep links and reloads work
```

The full tree has more routes and components; this table lists the files you will most likely want to tweak.

---

## Deployment

The app is a client-side SPA, so the host must serve `index.html` for unknown paths. Without that, reloading `/events` or `/events/{id}` returns a 404. The included `vercel.json` rewrites every path to `index.html` and sets long cache headers on hashed `/assets` files.

---

## Known limitations

- Registration links depend on the organizers supplying the real URL; until then the "not open yet" notice is shown.
- The mobile Lighthouse score is bounded by the animation libraries and fonts; the lite mode and lazy chunks exist to keep it in a healthy range.

---

## Credits

Designed and built by **Nithin**. Event data and API provided by the hackathon organizers.
