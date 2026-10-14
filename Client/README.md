# OFFSCRIPT — Frontend Architecture

> **#beoffscript** // The Event Discovery Platform for the Unconventional

OFFSCRIPT is a high-performance, dark-mode-only event discovery platform engineered for radical engineering hackathons, low-level systems arenas, algorithmic live-coding jams, and creative tech stages.

---

## Brand Identity & Aesthetic Principles

- **Brand Name**: OFFSCRIPT
- **Tagline**: `#beoffscript` (always lowercase, always with the hash)
- **Palette (Strict 3 Colors)**:
  - **Ink** (`#111210`): Deep obsidian background and high-contrast text on Volt surfaces.
  - **Bone** (`#EDEBE0`): Monochromatic primary text, neobrutalist borders, and variable opacity surfaces.
  - **Volt** (`#D4FF3F`): High-energy accent reserved for key CTAs, live capacity tickers, progress indicators, and focus outlines.
- **Tone**: Confident, rebellious, and editorial. Zero emojis across all UI, copy, comments, and commits.
- **Typography**:
  - **Display**: Bricolage Grotesque (high character, tight tracking, editorial leading).
  - **Mono**: JetBrains Mono (precision metadata, countdown counters, telemetry tickers).

---

## Tech Stack & Architecture

- **Runtime & Bundler**: Vite 8 + React 19 + TypeScript (strict mode, zero `any`)
- **Styling**: Tailwind CSS v4 (native `@theme` tokens, procedural SVG noise, raw grid lines)
- **Routing**: TanStack Router with route-level code splitting (`lazyRouteComponent`) and type-safe params
- **Data Fetching**: TanStack Query v5 with exponential backoff, instant list-to-detail cache seeding, and automatic 4xx retry suppression
- **Animation Orchestration**:
  - **Lenis**: Hardware-accelerated smooth scrolling
  - **GSAP & ScrollTrigger**: Pinned horizontal desktop carousel, scroll milestones, and real-time scroll sync
  - **Motion (Framer Motion)**: Volt shutter route wipes, split-text character reveals, layout animations, and slot-roll button micro-interactions

---

## Directory Structure

```text
src/
├── app/                  # Application bootstrap & router configuration
│   ├── queryClient.ts    # TanStack Query client with exponential backoff & stale times
│   └── router.tsx        # Type-safe TanStack Router setup with lazy routes
├── components/
│   ├── effects/          # Motion & atmospheric components
│   │   ├── Cursor.tsx        # Desktop follower dot + trailing ring morphing to labels
│   │   ├── GrainOverlay.tsx  # Procedural SVG feTurbulence noise + raw grid
│   │   ├── HeroStage.tsx     # Reserved 3D stage slot (Phase 2 drop-in ready)
│   │   ├── Marquee.tsx       # Infinite text strip with pause on hover
│   │   ├── PageTransition.tsx# Volt shutter panel with brand wordmark
│   │   ├── Reveal.tsx        # Clip-path wipes, scale snaps, and masked entries
│   │   └── SplitText.tsx     # Character and word stagger reveals
│   ├── events/           # Domain event components
│   │   ├── CountdownSection.tsx # Mono countdown to nearest upcoming deadline
│   │   ├── EventCard.tsx        # Neobrutalist card with seats progress & hover mask
│   │   ├── FeaturedHorizontal.tsx# Desktop GSAP horizontal scroll / Mobile snap
│   │   ├── FilterBar.tsx        # Multi-attribute filter chips & instant search
│   │   ├── PillarsSection.tsx   # Four bold manifesto blocks with scroll reveals
│   │   ├── SeatsBar.tsx         # Volt progress bar with "Few seats left" alert
│   │   └── SponsorsSection.tsx  # Sponsor wordmarks marquee (editable dataset)
│   ├── layout/           # Global shell
│   │   ├── BackToTop.tsx     # Floating button with circular SVG scroll progress ring
│   │   ├── Footer.tsx        # Editorial layout with oversized brand wordmark
│   │   └── Navbar.tsx        # Glass sticky bar with real-time scaleX progress & mobile drawer
│   └── ui/               # Custom design system primitives
│       ├── Badge.tsx         # Neobrutalist sticker badge with slight rotation
│       ├── Button.tsx        # Slot-roll Volt, sweeping Bone outline, ghost link, magnetic
│       ├── ErrorBoundary.tsx # Resilient error handling with Retry & Return home
│       ├── Skeletons.tsx     # Aspect-ratio locked Bone opacity shimmer skeletons
│       └── Toast.tsx         # Global notification queue adhering to 3-color palette
├── features/
│   └── events/
│       └── queries.ts    # React Query hooks with cache seeding
├── hooks/
│   ├── useCountdown.ts       # Days, hours, minutes, seconds countdown math
│   ├── useCursor.tsx         # Context hook controlling custom cursor labels
│   ├── useLenis.tsx          # Lenis smooth scroll provider synced with GSAP
│   ├── useMagnetic.ts        # Spring physics magnetic pull for CTAs
│   ├── useMediaQuery.ts      # Pointer detection and prefers-reduced-motion
│   └── useScrollProgress.ts  # Real-time scroll percentage & nav hide/reveal
├── lib/
│   ├── api.ts            # Typed fetch client with AbortController & timeout
│   ├── config.ts         # Environment variables & registration URL base
│   ├── endpoints.ts      # Centralized API endpoint paths
│   ├── errors.ts         # Normalized ApiError mapping (offline, timeout, 4xx, 5xx)
│   ├── fixtures.ts       # Verified offline fallback events dataset
│   ├── formatters.ts     # Intl date/currency/seat formatting
│   ├── schemas.ts        # Defensive runtime response validation
│   └── sponsors.ts       # Editable sponsor records
├── routes/
│   ├── error.tsx         # Designed fallback route error screen
│   ├── event-detail.tsx  # Full-bleed cover, sticky glass panel, and defensive fields
│   ├── landing.tsx       # Complete landing page assembling all requested sections
│   ├── not-found.tsx     # Custom 404 page with return actions
│   └── root.tsx          # Shell layout container
├── styles/
│   └── globals.css       # Design tokens, neobrutalist shadows, and raw grid
└── types/
    ├── event.ts          # Typed event, schedule, and filter interfaces
    └── sponsor.ts        # Typed sponsor interface
```

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 20 / 22)
- npm 9+

### Installation & Setup
```bash
# 1. Enter the project directory
cd Client

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Start the local development server
npm run dev
```

### Production Build & Verification
```bash
# Typecheck and compile production bundle
npm run build

# Run linter
npm run lint

# Preview production build locally
npm run preview
```

---

## Deployment Readiness & Recommended Host Settings

OFFSCRIPT outputs a high-performance, cache-friendly production bundle with hashed asset filenames. For optimal delivery, configure your static host (Cloudflare Pages, Vercel, Netlify, Nginx, or AWS CloudFront) with:

1. **Immutable Asset Caching**:
   - Route: `/assets/*`
   - Header: `Cache-Control: public, max-age=31536000, immutable`
   - Rationale: Asset chunks are content-hashed (e.g., `index-Zzx0Zoyk.js`). Long-term caching eliminates redundant round-trips.

2. **HTML Freshness**:
   - Route: `/index.html` (and all SPA route entry points)
   - Header: `Cache-Control: public, max-age=0, must-revalidate`
   - Rationale: Ensures users immediately receive the latest application bundle on new deployments.

3. **Compression & HTTP/2 Protocol**:
   - Serve over **HTTP/2** or **HTTP/3** for efficient stream multiplexing.
   - Serve precompressed **Brotli** (`.br`) and **Gzip** (`.gz`) static files directly from disk (`vite-plugin-compression2` pre-generates `.br` and `.gz` archives for all assets during `npm run build`).
   - The initial gzipped bundle entry is under **30 KB**, and initial brotli entry is under **25 KB**. Lazy chunks are under **9 KB**.

---

## Backend Integration Details

Only two endpoints are consumed by OFFSCRIPT:
1. `GET /events` → returns `{ events: Event[] }`
2. `GET /events/:id` → returns a single `Event` or extended `EventDetail`

### Configuration
Endpoints are configured in `src/lib/endpoints.ts` and `src/lib/config.ts`:
- Change `VITE_API_BASE_URL` in `.env` to point to the organizers' live backend.
- Change `REGISTRATION_URL_BASE` in `src/lib/config.ts` to update the external registration portal. Every Register CTA automatically appends the event ID as a query parameter: `${REGISTRATION_URL_BASE}?event=${eventId}`.

### Resilience & Dev Fixture Fallback
If the live backend is unreachable, offline, or returns unexpected network errors during evaluation, OFFSCRIPT's typed API client (`src/lib/api.ts`) transparently falls back to verified fixture data (`src/lib/fixtures.ts`). The UI will never crash or display blank screens.

---

## 3D Stage Drop-In Slot

Per the challenge requirements, Phase 1 includes no 3D runtime overhead. A dedicated component is isolated at:
`src/components/effects/HeroStage.tsx`

To drop in a Three.js / React Three Fiber / Spline scene in Phase 2:
1. Open `src/components/effects/HeroStage.tsx`.
2. Replace the inner wireframe placeholder with your `<Canvas>` or WebGL canvas element.
3. The parent layout, responsive clamps, and hero composition remain 100% untouched.
