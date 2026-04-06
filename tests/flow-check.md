# BrandShift — End-to-End Flow Checklist

Run this before building dashboard UI.
All 14 steps must pass for stitching to be complete.

---

## Pre-flight

- [ ] Dev server running at http://localhost:3000
- [ ] `.env.local` has valid keys for ANTHROPIC, FIRECRAWL, APIFY, SUPABASE
- [ ] Supabase tables `brand_audits` and `brand_profiles` exist
- [ ] Browser console open (F12) to catch errors

---

## Step 1 — Intake form loads

- [ ] Go to http://localhost:3000
- [ ] Page background is dark (`#08080E`)
- [ ] BrandShift logo visible in header
- [ ] Form fields visible: Brand Name, Industry, Website URL, Instagram, Competitors, Challenge
- [ ] Submit button reads "Run Brand Audit →"

---

## Step 2 — Fill and submit form

Use this test brand:
- **Brand Name:** Zepto
- **Industry:** Tech/SaaS
- **Brand Age:** 2–5 years
- **Target Audience:** Mixed Age Groups
- **Website URL:** https://www.zepto.com/
- **Instagram Handle:** zeptonow
- **Competitor 1:** Blinkit — https://blinkit.com/
- **Competitor 2:** Swiggy Instamart — https://www.swiggy.com/instamart
- **Challenge:** Younger audience doesn't associate us with a brand, only a utility

- [ ] All fields filled
- [ ] Click "Run Brand Audit →"

---

## Step 3 — Loading screen

- [ ] Loading overlay appears immediately
- [ ] Loading message cycles: "Scraping your website…" → "Analysing competitor positioning…" → "Pulling Instagram data…" → "Generating your Brand Score…"
- [ ] Elapsed seconds counter increments
- [ ] No JS errors in console
- [ ] Wait for completion (may take 60–120 seconds)

---

## Step 4 — Score results page

- [ ] Redirects to `/results`
- [ ] Brand name "Zepto" shown in header
- [ ] Animated score ring fills to correct number
- [ ] Overall score is a non-round number (e.g. 57, not 55 or 60)
- [ ] All 5 dimension cards visible with scores and justifications
- [ ] Data confidence badge shown (HIGH / MEDIUM / LOW)
- [ ] Sources available chips shown (✓ or ✗ for each source)
- [ ] Biggest Strength and Biggest Gap boxes populated
- [ ] Evidence quotes section visible
- [ ] Constitution banner visible (if first audit): "One more step to unlock your full dashboard →"

---

## Step 5 — Supabase: brand_audits row

- [ ] Go to Supabase → Table Editor → `brand_audits`
- [ ] New row exists with `brand_name = 'Zepto'`
- [ ] `score_json` column is populated (not null)
- [ ] `overall_score` matches score shown on screen
- [ ] `scraped_instagram` column has Instagram caption data
- [ ] `created_at` is today's timestamp

---

## Step 6 — Supabase: brand_profiles row created

- [ ] Go to Supabase → Table Editor → `brand_profiles`
- [ ] New row exists with `brand_name = 'Zepto'`
- [ ] Row was auto-created (not manually inserted)

---

## Step 7 — brand_profiles row has correct fields

- [ ] `brand_name` = "Zepto"
- [ ] `latest_overall_score` = same number as score on screen
- [ ] `industry` = "Tech/SaaS"
- [ ] `instagram_handle` = "zeptonow"
- [ ] `score_history` array has 1 entry
- [ ] `website_url` = "https://www.zepto.com/"
- [ ] `constitution_completed` = false

---

## Step 8 — Submit roadmap direction

- [ ] If constitution banner is shown — skip to Step 12 first, then come back
- [ ] If roadmap form is shown:
  - Fill "Describe your goal": "Establish Zepto as a brand, not just a utility, among 18–30 year olds"
  - Select Tone: "Bold & Disruptive"
  - Select Audience: "Gen Z 18–25"
  - Select Market: "Metro Cities Only"
- [ ] Click "Generate My Brand Roadmap →"
- [ ] Loading state shows "Generating…"

---

## Step 9 — Roadmap loads

- [ ] Redirects to `/roadmap`
- [ ] "Zepto — Brand Roadmap" heading shown
- [ ] 8 week cards visible under "Next 2 Months"
- [ ] Each week card has a task and a "why"
- [ ] 6 Month Plan section visible with 4 milestones
- [ ] 1 Year Vision section visible
- [ ] The Bigger Picture section visible
- [ ] "Go to Dashboard →" button visible (orange)
- [ ] "Download Roadmap (PDF)" button visible

---

## Step 10 — Supabase: brand_profiles current_roadmap

- [ ] Go to Supabase → `brand_profiles` → Zepto row
- [ ] `current_roadmap` column is populated (not null)
- [ ] `roadmap_start_date` is today's timestamp
- [ ] `current_week` = 1
- [ ] `roadmap_direction` = the direction text you entered

---

## Step 11 — Supabase: tasks array

- [ ] `tasks` column in `brand_profiles` is populated
- [ ] Tasks array has 8 entries (one per week)
- [ ] Each task has: `week`, `task`, `why`, `status: "todo"`, `completed_at: null`

---

## Step 12 — Go to Dashboard

- [ ] Click "Go to Dashboard →" on roadmap page
- [ ] URL changes to `/dashboard`
- [ ] Page loads (even if placeholder for now)
- [ ] No 404 error

---

## Step 13 — Dashboard loads for correct brand

- [ ] Dashboard shows Zepto (or correct brand name)
- [ ] No "brand not found" or empty state errors

---

## Step 14 — localStorage check

- [ ] Open browser console (F12)
- [ ] Run: `localStorage.getItem('brandshift_active_brand')`
- [ ] Returns `"Zepto"` (or the brand name you used)
- [ ] Run: `localStorage.getItem('brandshift_intake')`
- [ ] Returns JSON with all form fields + `submittedAt` timestamp
- [ ] Run: `localStorage.getItem('brandshift_score')`
- [ ] Returns JSON with score data including `brandProfileId`

---

## Result

| Steps passed | Status |
|---|---|
| 14 / 14 | ✅ Stitching complete — build dashboard |
| 10–13 / 14 | ⚠️ Fix failing steps before dashboard |
| < 10 / 14 | ❌ Data flow broken — debug before proceeding |

---

## Common failure points

| Symptom | Likely cause |
|---|---|
| Score API returns 500 | Check ANTHROPIC_API_KEY in `.env.local` |
| Instagram shows "unavailable" | APIFY_API_TOKEN expired or rate limited |
| brand_profiles row not created | Supabase SERVICE_KEY wrong or table missing |
| tasks array empty | `flattenRoadmapToTasks` not running — check roadmap API logs |
| Dashboard 404 | `/app/dashboard/page.js` not yet created |
 