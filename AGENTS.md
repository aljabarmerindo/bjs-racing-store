# AGENTS.md

## Project Overview

Indonesian e-commerce PWA (spray paint & motorcycle parts). Astro 7 SSR + React 19 + Tailwind CSS 3 + TypeScript. Backend: Supabase (auth, Postgres, storage). Payments: Midtrans Snap + BRI QRIS. Shipping: Biteship + RajaOngkir. Deploy: Vercel serverless.

UI and comments are in **Bahasa Indonesia**.

## Commands

```bash
npm run dev          # Astro dev server on port 4321 (host 0.0.0.0)
npm run build        # astro build
npm run preview      # astro preview
```

No lint, typecheck, format, or test scripts. Use `npx astro check` for TS diagnostics. No test framework exists.

## Path Aliases

Defined in `tsconfig.json` (extends `astro/tsconfigs/strict`):
- `@/*` → `src/*`
- `@/lib/*` → `src/lib/*`
- `@/components/*` → `src/components/*`
- `@/layouts/*` → `src/layouts/*`

Always use aliases.

## Architecture

### Routing

- `src/pages/` — file-based routes. `.astro` pages, `.ts` API endpoints.
- API endpoints in `src/pages/api/` are server-side only (never sent to browser).
- Middleware (`src/middleware.js`) protects `/cart`, `/checkout`, `/akun`.
  - Unauthenticated → redirect to `/login?redirect=...`
  - Authenticated but no `customers` row → redirect to `/akun/lengkapi-profil`
- `locals.session` and `locals.supabase` are set by middleware and available in all page/API handlers.

### Supabase Clients

| Context | Client | Import |
|---------|--------|--------|
| Browser (React) | `createBrowserClient` via `@supabase/ssr` | `@/lib/supabaseBrowserClient` → `supabase` |
| Server (API, middleware) | `createServerClient` via `@supabase/ssr` | `@/lib/supabaseServer` → `supabaseServerClient(context)` |
| Admin (service role, bypasses RLS) | `createClient` via `@supabase/supabase-js` | `@/lib/supabaseServer` → `supabaseAdmin` |

**Do not** create raw `createClient()` outside `supabaseServer.ts`. Raw clients break session management.

Server-side clients require Astro `APIContext` to access cookies.

### State Management

- **Zustand** (`@/lib/store.ts`) — cart, auth, addresses, toasts. Used in React components.
- **Nanostores** (`src/stores/`) — lightweight reactive atoms. Used in `.astro` files.
- Address state is dual-managed: Zustand is source of truth for React; nanostores (`src/stores/addressStore.ts`) has simpler helpers for `.astro` files.

### Layouts & Components

- `src/layouts/MainLayout.astro` — customer shell (Header, Footer, PWA, toast, WhatsApp button, eruda debug console via CDN).
- `src/layouts/AdminLayout.astro` — admin shell.
- Components live flat in `src/components/` (mix of `.astro`, `.tsx`, `.jsx`).

### i18n

Indonesian strings in `public/locales/id/common.json`. Use `i18next` for client-side translations.

## Payment & Shipping

- Gateway switched by `PAYMENT_GATEWAY` env var (`midtrans` or `bri`). Default: `midtrans`.
- **Midtrans**: webhook at `/api/payment/webhook.ts`.
- **BRI QRIS**: config in `src/lib/bri.ts`. Requires env vars: `BRI_API_BASE_URL`, `BRI_CLIENT_ID`, `BRI_CLIENT_SECRET`, `BRI_QRIS_PARTNER_ID`, `BRI_QRIS_CHANNEL_ID`, `BRI_QRIS_MERCHANT_ID`, `BRI_QRIS_TERMINAL_ID`, `BRI_PRIVATE_KEY`, `BRI_PUBLIC_KEY`, `BRI_QRIS_CALLBACK_URL`. Callback webhook at `/api/payment/bri/callback.ts`.
- **Shipping**: Biteship (primary, webhook key/secret in `src/lib/biteship.ts`) and RajaOngkir (`src/pages/api/rajaongkir/`).

## Environment Variables

Required (see `.env.example`): `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `MIDTRANS_SERVER_KEY`, `PUBLIC_MIDTRANS_CLIENT_KEY`, `RAJAONGKIR_API_KEY`, `RAJAONGKIR_ORIGIN_ID`.

Additional in `.env`: `PAYMENT_GATEWAY`, `BITESHIP_API_KEY`, `BITESHIP_ORIGIN_*`, `BITESHIP_WEBHOOK_KEY`, `BITESHIP_WEBHOOK_SECRET`, `BRI_*` keys, notification keys (`WHATSAPP_PROVIDER`, `WABLAS_*`, `WAAPI_*`, `EMAIL_PROVIDER`, `RESEND_*`).

`SUPABASE_SERVICE_KEY` is the admin/service-role key — never expose to the browser (no `PUBLIC_` prefix).

## Database

- Migrations are raw SQL in `supabase/migrations/`. Applied manually via Supabase SQL Editor. No `supabase` CLI config.
- Schema docs: `File SUPABASE/` and `File CATATAN/` (context only; not always current).
- Key tables: `customers`, `products`, `orders`, `order_items`, `payments`, `customer_addresses`, `cart_items`, `profiles`, `wishlists`, `product_comparisons`, `loyalty_points`, `vouchers`.
- DB functions (RPC): `get_cart_items`, `upsert_cart_item`, `update_cart_item_quantity`, `clear_cart`.

## Build & Tooling

- **Cookie version conflict** — `package.json` `overrides` pins `cookie@2.x` for Astro 7 (ESM) and `cookie@1.x` for `@supabase/ssr` (CJS). Do not remove.
- **Tailwind via PostCSS** — `postcss.config.cjs` is the executable source of truth. `src/styles/global.css` has `@tailwind` directives and is imported in `MainLayout.astro`.
- **PWA** — `vite-plugin-pwa` with `registerType: 'prompt'`. Uses `useRegisterSW` from `virtual:pwa-register/react` in `UpdateNotifier.jsx`. Manifest at `public/manifest.json`. Icons in `public/icons/`.
- **Vercel image optimization** — Supabase Storage images are optimized via Vercel (configured in `astro.config.mjs`).
- **eruda** debug console is loaded in production via CDN in `MainLayout.astro` (lines 233-234) — likely a dev artifact.

## Conventions

- `.astro` files use `---` frontmatter for server logic; `<script>` tags for client JS.
- API route handlers export `ALL`, `GET`, `POST`, etc. and receive `{ request, cookies, redirect, locals }` from Astro. Use `APIRoute` type from `astro`.
- Client-side Supabase calls import `supabase` from `@/lib/supabaseBrowserClient`.
- DevContainer installs `opencode-ai`, `supabase`, `vercel`, `uipro-cli` globally on create.
