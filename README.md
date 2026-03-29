# BrandShift — AI Brand Audit for Indian Brands

AI-powered brand audit and roadmap tool. Scrapes your website, competitors, and Instagram, then generates a Brand Relevance Score and personalised action plan.

---

## Deployment Guide

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial BrandShift build"
git remote add origin https://github.com/YOUR_USERNAME/brandshift.git
git push -u origin main
```

### 2. Connect Repo to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New → Project**
3. Import your GitHub repository
4. Framework will auto-detect as **Next.js**
5. Click **Deploy**

### 3. Add Environment Variables in Vercel Dashboard

In your project → **Settings → Environment Variables**, add:

| Key | Description |
|-----|-------------|
| `ANTHROPIC_API_KEY` | From [console.anthropic.com](https://console.anthropic.com) |
| `FIRECRAWL_API_KEY` | From [firecrawl.dev](https://firecrawl.dev) |
| `APIFY_API_TOKEN` | From [apify.com](https://apify.com) |

Then go to **Deployments** and **Redeploy** to pick up the new vars.

### 4. Connect Custom Domain (brandshift.in)

1. In Vercel → your project → **Settings → Domains**
2. Add `brandshift.in` and `www.brandshift.in`
3. Copy the DNS records Vercel gives you
4. In your domain registrar (e.g. GoDaddy, Cloudflare), add those records
5. Wait 24–48h for propagation (usually much faster)

---

## Local Development

```bash
# Install dependencies
npm install

# Add keys to .env.local (already created)
# ANTHROPIC_API_KEY=...
# FIRECRAWL_API_KEY=...
# APIFY_API_TOKEN=...

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Testing Each API Route

### 1. Test /api/scrape

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "Mamaearth",
    "websiteUrl": "https://mamaearth.in",
    "instagramHandle": "mamaearth.in",
    "comp1Name": "The Derma Co",
    "comp1Url": "https://thederma.co",
    "comp2Name": "Minimalist",
    "comp2Url": "https://beminimalist.co"
  }'
```

Expected: JSON with `scraped_homepage`, `scraped_about`, `scraped_blog`, `scraped_comp1`, `scraped_comp2`, `scraped_instagram`.

### 2. Test /api/score

```bash
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "Mamaearth",
    "industry": "D2C/Consumer",
    "brandAge": "5–15 years",
    "targetAudience": "Millennials 26–35",
    "challenge": "Younger audience does not connect with us",
    "scraped_homepage": "Natural baby and skincare products...",
    "scraped_about": "Founded in 2016...",
    "scraped_blog": "",
    "scraped_instagram": "",
    "comp1Name": "The Derma Co",
    "scraped_comp1": "Science-backed skincare...",
    "comp2Name": "Minimalist",
    "scraped_comp2": "Evidence-based formulations..."
  }'
```

Expected: JSON with `overall_score`, `dimensions`, `verdict`, `rebrand_urgency`, `evidence_quotes`.

### 3. Test /api/roadmap

```bash
curl -X POST http://localhost:3000/api/roadmap \
  -H "Content-Type: application/json" \
  -d '{
    "brandName": "Mamaearth",
    "scoreData": { "overall_score": 62, "verdict": "Solid brand with gaps..." },
    "direction": "We want to appeal more to Gen Z",
    "toneDirection": "Bold & Disruptive",
    "targetAudience": "Gen Z 18–25",
    "marketFocus": "Metro Cities Only"
  }'
```

Expected: JSON with `two_months`, `six_months`, `one_year`, `bigger_picture`.

---

## Tech Stack

- **Next.js 14** (App Router)
- **CSS Modules** (no Tailwind)
- **Firecrawl** (`@mendable/firecrawl-js`) — website scraping
- **Apify** — Instagram scraping
- **Anthropic Claude** (`claude-sonnet-4-0`) — AI scoring and roadmap
- **Vercel** — deployment
