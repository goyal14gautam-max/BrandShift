# BRANDSHIFT.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository. The repo at `CLAUDE.md` / `claude.md` belongs to a different project (Prajna) and should be ignored — those files were dropped here by mistake. Treat **this** file as the source of truth.

## What this app is

BrandShift — AI brand audit and roadmap tool for Indian consumer brands. The user enters their brand (website, Instagram, LinkedIn, 2 competitors), the app scrapes those sources, Claude scores the brand across 5 dimensions, and the user gets a personalised 8-week roadmap plus an ongoing dashboard with daily tasks, a Monday brief, a brand constitution flow, and tools (voice check, content ideas, trend fit, preflight).

## Commands

```bash
npm run dev    # http://localhost:3000
npm run build
npm run start
npm run lint
```

No test runner is configured. Manual API testing examples are in `README.md`.

## Stack

- **Next.js 14 App Router** — JavaScript (not TypeScript), CSS Modules (no Tailwind)
- **Supabase** — Postgres + Auth + SSR cookies. Single project on `fgujotnczwejuortvxne.supabase.co`
- **Anthropic Claude** — `claude-sonnet-4-0` for scoring and roadmap, via `@anthropic-ai/sdk`
- **Firecrawl** (`@mendable/firecrawl-js`) — website/blog scraping
- **Apify REST API** — Instagram (`apify~instagram-profile-scraper`) and LinkedIn company pages (`curious_coder~linkedin-company-profile-scraper`)
- **Recharts** — score history charts; **Lucide-react** — icons (note: `Linkedin` icon is missing in v1.7 — use the inline SVG in `EvidenceSection.js`)
- **PostHog** — analytics via `@/lib/analytics`
- **Vercel** — deployment; `maxDuration` is set to 300s on `/api/scrape` and 60s on `/api/score`

## High-level flow

1. `/audit` — wizard collects brand name, industry, target audience, website, Instagram handle, LinkedIn URL, 2 competitors, challenge. Saved to `localStorage.brandshift_intake`.
2. `/loading` — calls `/api/scrape` (parallel scrapes), then `/api/score`. Saves `brandshift_score`, `brandshift_scraped`, `brandshift_active_brand`. Redirects to `/results`.
3. `/results` — score hero, radar chart, dimension breakdown, evidence tabs (Website / Instagram / LinkedIn / Competitors), maturity path. CTA → roadmap setup.
4. `/roadmap` (inside `(dashboard)` group) — collects direction + tone, calls `/api/roadmap`, saves roadmap to `brand_profiles.current_roadmap` and `localStorage.brandshift_roadmap`.
5. `/dashboard` — daily focus task, streak, score history, Monday brief, content idea, trends, constitution plant, tools row. Source of truth is `useDashboard()` hook → `/api/profile`.

## Routing rules (post-auth)

- The `/auth/callback` route decides where to send the user after OAuth/email login: `/roadmap` if the brand profile has no `current_roadmap`, otherwise `/dashboard`.
- The landing page and email-password login also route to `/roadmap` when no roadmap exists.
- `/dashboard` itself redirects to `/roadmap` if both `profile.current_roadmap` and `localStorage.brandshift_roadmap` are missing.
- Do not point users at `/dashboard` directly from new entry points without that guard.

## Key files

- `app/api/scrape/route.js` — parallel scrape of homepage / about / blog / Instagram (Apify) / LinkedIn (Apify with Firecrawl `/about` fallback) / 2 competitors. Each call wrapped in `withTimeout`. Logs every source.
- `app/api/score/route.js` — fills `SCORING_USER_PROMPT`, retries JSON parsing once, scores competitor as a separate Claude call, saves to `brand_audits` + `brand_profiles.score_history`.
- `app/api/roadmap/route.js` — generates 2-month / 6-month / 1-year roadmap from score + direction.
- `app/api/constitution/{save,load,generate}/route.js` — 4-step wizard persists answers under `c_*` columns; generate calls Claude to produce a Brand Bible saved to `c_bible_content`.
- `lib/prompts.js` — `SCORING_SYSTEM_PROMPT`, `SCORING_USER_PROMPT` (template with `{brand_name}` placeholders), `ROADMAP_PROMPT`, `MONDAY_BRIEF_SYSTEM_PROMPT`. The scoring prompt has channel-weight detection (SOCIAL-FIRST / CONTENT-FIRST / LINKEDIN-PRIMARY / BALANCED) and dimension-by-dimension scoring rules. Update prompts here, not inline in routes.
- `lib/claudeClient.js` — `callClaude` (retries on 429/529), `extractJSON` (handles markdown fences, trailing commas, control chars), `callClaudeJSON` (combines them). Use these instead of calling the Anthropic SDK directly.
- `lib/supabase.js` — `supabaseAdmin` (service-key, server-only), CRUD helpers for `brand_profiles`, `accounts`, score history, monday briefs. Always `.ilike('brand_name', name)` for brand lookups (case-insensitive).
- `lib/supabase-browser.js` — `createSupabaseBrowserClient()` for client-side auth.
- `hooks/useAuth.js` — provides `user`, `account`, `isLoading`, `signOut` via `AuthProvider` mounted in root layout.
- `hooks/useDashboard.js` — single source of truth for the dashboard. Resolves brand name (account.primary_brand → localStorage), fetches `/api/profile`, derives `todayTask`, `streak`, `constitutionProgress`, `latestScore`, etc. Exposes `refreshProfile()` for force-reload after writes.
- `components/EvidenceSection.js` — tabbed evidence viewer. LinkedIn tab only renders when `scraped_linkedin` has >50 chars and is not a "Sign in" wall.
- `components/BrandRadarChart.js`, `components/RoadmapPath.js`, `components/ConstitutionPlant.js`, `components/Tooltip.js`, `components/Sidebar.js`, `components/Logo.js` — main visual components.

## Supabase schema (do not recreate)

Tables in use: `accounts`, `brand_profiles`, `brand_audits`, `brand_memberships`, `task_history`, `shared_reports`.

The `brand_profiles` row holds essentially everything per brand: latest score, `score_history` (jsonb array, dedup by calendar day), `tasks` (jsonb array of roadmap tasks), `current_week`, `current_roadmap` (jsonb), `pulse_streak`, `pulse_history`, `monday_briefs`, content-tool caches (`latest_content_idea`, `latest_trends`), and the constitution columns prefixed `c_*` (`c_personality_words`, `c_off_brand_words`, `c_best_customer`, `c_current_step`, `c_completed`, `c_bible_content`, …). When a new constitution or other field is added, run the matching `ALTER TABLE ADD COLUMN IF NOT EXISTS` in Supabase before deploying — silent save failures usually mean the column is missing.

`owner_user_id` on `brand_profiles` links to `auth.users`. Brands are claimed during auth callback: if an account has no `primary_brand`, the callback picks the most recent unowned profile created in the last 2 hours and attaches it.

## Conventions and gotchas

- **Brand name lookups are case-insensitive** — use `.ilike('brand_name', name)`, not `.eq`.
- **All API routes return `NextResponse.json({ error }, { status })` on failure** — never throw out of a handler.
- **CSS uses tokens from `app/globals.css`** — `var(--bs-base)`, `var(--bs-card-dark)`, `var(--bs-violet)`, `var(--bs-orange)`, `var(--bs-teal)`, `var(--bs-amber)`, `var(--bs-text-primary/secondary/tertiary)`, plus font vars `var(--font-headline)` (Instrument Serif), `var(--font-ui)` (Inter), `var(--font-mono)` (JetBrains Mono), `var(--font-accent)` (Cormorant Garamond). Avoid hardcoded hex except for brand colours of external products (e.g. LinkedIn `#0A66C2`).
- **`lucide-react` is pinned at v1.7** — many newer icon names (e.g. `Linkedin`) don't exist. Check `Object.keys(require('lucide-react'))` before importing a new icon, or use an inline SVG.
- **localStorage keys in active use**: `brandshift_intake`, `brandshift_score`, `brandshift_scraped`, `brandshift_brand`, `brandshift_active_brand`, `brandshift_roadmap`, `brandshift_constitution_progress`, `brandshift_constitution_done`.
- **`useDashboard.constitutionProgress`** counts answered fields by checking text length >3 chars and array length >0. Don't change the threshold without checking the empty-state plant stage in `components/ConstitutionPlant.js`.
- **Scrape timeouts**: homepage 15s, about/blog/competitors 10s, Instagram 50s, LinkedIn 15s. Increasing any of these on Vercel free tier risks hitting the 300s `maxDuration`.
- **Apify polling**: both Instagram and LinkedIn scrapers start a run, then poll `actor-runs/{id}` every 4-5s for up to 8-12 attempts. LinkedIn falls back to Firecrawl on `/about` page if Apify fails.
- **The Anthropic model id is `claude-sonnet-4-0`** — that is the literal string the SDK accepts in this codebase, not a placeholder. Do not "fix" it to a dated id without confirming.

## What not to do

- Don't add new top-level files named `CLAUDE.md`, `claude.md`, or anything that would mask the Prajna files — keep this project's instructions in `BRANDSHIFT.md`.
- Don't introduce TypeScript, Tailwind, or a test framework without asking.
- Don't replace `supabaseAdmin` calls with `supabaseBrowserClient` in API routes — the routes rely on the service key to bypass RLS.
- Don't store new brand-scoped data in localStorage only; persist to `brand_profiles` so it survives device changes.
- Don't bypass `lib/claudeClient.js` — direct `anthropic.messages.create` calls skip the 429/529 retry logic.
