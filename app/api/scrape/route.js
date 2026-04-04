import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { ApifyClient } from 'apify-client';
import Anthropic from '@anthropic-ai/sdk';
import { cleanMarkdown } from '@/lib/cleaner';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getFirecrawl() {
  return new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || 'placeholder' });
}

// ── Core scrape helper ─────────────────────────────────────────
async function firecrawlScrape(url, options = {}) {
  try {
    const fc = getFirecrawl();
    const result = await fc.scrapeUrl(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      ...options,
    });
    return result?.markdown || result?.content || '';
  } catch (err) {
    console.error(`Firecrawl scrape failed for ${url}:`, err.message);
    return '';
  }
}

// ── 404 / not-found detection ──────────────────────────────────
const NOT_FOUND_SIGNALS = ['404', 'page not found', "doesn't exist", 'does not exist', 'made an egg-sit'];

function isRealContent(content, homepagePrefix = '') {
  if (!content || content.length < 500) return false;
  const lower = content.toLowerCase();
  if (NOT_FOUND_SIGNALS.some(sig => lower.slice(0, 500).includes(sig))) return false;
  // Reject if it looks like the homepage (same first 200 chars)
  if (homepagePrefix && content.slice(0, 200).trim() === homepagePrefix) return false;
  return true;
}

// ── FIX 1 — About page (never returns homepage content) ────────
async function scrapeAbout(base, homepageContent) {
  const homepagePrefix = (homepageContent || '').slice(0, 200).trim();
  const urls = [
    base + '/pages/about-us',
    base + '/about-us',
    base + '/about',
    base + '/our-story',
    base + '/company',
  ];
  for (const url of urls) {
    const content = await firecrawlScrape(url);
    if (isRealContent(content, homepagePrefix)) return content;
  }
  return '';
}

// ── FIX 2 — Blog (waitFor JS rendering) ────────────────────────
async function scrapeBlog(base) {
  const urls = [
    base + '/blogs',
    base + '/blog',
    base + '/news',
    base + '/articles',
    base + '/insights',
  ];
  for (const url of urls) {
    const content = await firecrawlScrape(url, { waitFor: 2000 });
    if (content && content.length > 300) return content;
  }
  return '';
}

// ── FIX 3 — Instagram (profile scraper with fallback) ──────────
async function scrapeInstagram(handle) {
  if (!handle) return '';
  const cleanHandle = handle.replace(/^@/, '').trim();

  async function tryActor(actorId, input) {
    const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
    const run = await client.actor(actorId).call(input, { waitSecs: 90 });
    const dataset = await client.dataset(run.defaultDatasetId).listItems();
    return dataset.items || [];
  }

  try {
    let items = [];

    // Primary: profile scraper
    try {
      items = await tryActor('apify/instagram-profile-scraper', {
        usernames: [cleanHandle],
        resultsLimit: 20,
      });
    } catch (err) {
      console.error('Instagram profile scraper failed, trying fallback:', err.message);
      // Fallback: post scraper
      items = await tryActor('apify/instagram-scraper', {
        directUrls: [`https://www.instagram.com/${cleanHandle}/`],
        resultsType: 'posts',
        resultsLimit: 20,
      });
    }

    if (!items.length) return '';

    // Profile scraper returns profile object with latestPosts
    const profile = items[0];
    if (profile.latestPosts || profile.biography != null) {
      const posts = profile.latestPosts || [];
      return [
        'INSTAGRAM PROFILE:',
        `Username: ${cleanHandle}`,
        `Followers: ${profile.followersCount || 'unknown'}`,
        `Bio: ${profile.biography || 'none'}`,
        '',
        'RECENT POSTS (last 20):',
        ...posts.slice(0, 20).map((p, idx) =>
          `Post ${idx + 1}: "${(p.caption || '').slice(0, 200)}" | Likes: ${p.likesCount || 0} | Comments: ${p.commentsCount || 0}`
        ),
      ].join('\n');
    }

    // Fallback scraper returns post objects directly
    return items
      .slice(0, 20)
      .map((p, i) => {
        const parts = [];
        if (p.timestamp) parts.push(`[${p.timestamp}]`);
        if (p.caption)   parts.push(p.caption.slice(0, 500));
        if (p.likesCount != null)    parts.push(`Likes: ${p.likesCount}`);
        if (p.commentsCount != null) parts.push(`Comments: ${p.commentsCount}`);
        if (p.hashtags?.length)      parts.push(`Tags: ${p.hashtags.slice(0, 8).join(' ')}`);
        return parts.join(' | ');
      })
      .filter(Boolean)
      .join('\n\n');

  } catch (err) {
    console.error('Instagram scrape error:', err.message);
    return '';
  }
}

// ── Instagram signal extraction ────────────────────────────────
async function extractInstagramSignals(captions) {
  if (!captions || captions.length < 50) return '';
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-0',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are analysing Instagram captions for a brand.
Extract the following and return as JSON only, no markdown, no explanation:

{
  "tone_descriptors": ["3-5 words describing the brand voice"],
  "content_types": ["types of content found"],
  "cultural_references": ["any Indian cultural moments or trends"],
  "engagement_signals": ["high engagement posts with brief description"],
  "brand_personality": "one sentence summary"
}

Captions:
${captions}`,
      }],
    });
    const text = response.content.find(b => b.type === 'text')?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return '';
    const parsed = JSON.parse(match[0]);
    return `\n\n--- INSTAGRAM BRAND SIGNAL SUMMARY ---
Tone: ${parsed.tone_descriptors?.join(', ')}
Content Types: ${parsed.content_types?.join(', ')}
Cultural References: ${parsed.cultural_references?.join(', ') || 'None detected'}
High Engagement Posts: ${parsed.engagement_signals?.join(' | ')}
Brand Personality: ${parsed.brand_personality}
--- END SUMMARY ---`;
  } catch {
    return '';
  }
}

// ── POST handler ───────────────────────────────────────────────
export async function POST(request) {
  const body = await request.json();
  const { websiteUrl, instagramHandle, comp1Url, comp2Url } = body;

  console.log('Scrape route called with:', { websiteUrl, instagramHandle, comp1Url, comp2Url });

  const base = (websiteUrl || '').replace(/\/$/, '');

  // ── Homepage ──────────────────────────────────────────────────
  let scrapedHomepage = '';
  try {
    scrapedHomepage = await firecrawlScrape(base);
  } catch (err) {
    console.error('Homepage scrape failed:', err.message);
  }

  // ── About (FIX 1: compare against homepage) ───────────────────
  let scrapedAbout = '';
  try {
    scrapedAbout = await scrapeAbout(base, scrapedHomepage);
  } catch (err) {
    console.error('About scrape failed:', err.message);
  }

  // ── Blog (FIX 2: waitFor JS) ──────────────────────────────────
  let scrapedBlog = '';
  try {
    scrapedBlog = await scrapeBlog(base);
  } catch (err) {
    console.error('Blog scrape failed:', err.message);
  }

  // ── Competitors (FIX 4: onlyMainContent + cap) ───────────────
  let scrapedComp1 = '';
  try {
    if (comp1Url) {
      const raw = await firecrawlScrape(comp1Url);
      scrapedComp1 = cleanMarkdown(raw).slice(0, 3000);
    }
  } catch (err) {
    console.error('Competitor 1 scrape failed:', err.message);
  }

  let scrapedComp2 = '';
  try {
    if (comp2Url) {
      const raw = await firecrawlScrape(comp2Url);
      scrapedComp2 = cleanMarkdown(raw).slice(0, 3000);
    }
  } catch (err) {
    console.error('Competitor 2 scrape failed:', err.message);
  }

  // ── Instagram (FIX 3: profile scraper) ───────────────────────
  let scrapedInstagram = '';
  try {
    scrapedInstagram = await scrapeInstagram(instagramHandle);
  } catch (err) {
    console.error('Instagram scrape failed:', err.message);
  }

  // ── Clean + cap all sources (FIX 6) ──────────────────────────
  scrapedHomepage  = cleanMarkdown(scrapedHomepage).slice(0, 4000);
  scrapedAbout     = cleanMarkdown(scrapedAbout).slice(0, 2000);
  scrapedBlog      = cleanMarkdown(scrapedBlog).slice(0, 3000);
  scrapedInstagram = cleanMarkdown(scrapedInstagram).slice(0, 3000);
  // comp1 + comp2 already cleaned and capped above

  console.log('=== SCRAPE RESULTS ===');
  console.log('Website homepage:', { success: !!scrapedHomepage, length: scrapedHomepage.length, preview: scrapedHomepage.slice(0, 100) || 'EMPTY' });
  console.log('Website about:',   { success: !!scrapedAbout,    length: scrapedAbout.length,    preview: scrapedAbout.slice(0, 100)    || 'EMPTY' });
  console.log('Blog:',            { success: !!scrapedBlog,     length: scrapedBlog.length,     preview: scrapedBlog.slice(0, 100)     || 'EMPTY' });
  console.log('Instagram:',       { success: !!scrapedInstagram, length: scrapedInstagram.length, preview: scrapedInstagram.slice(0, 100) || 'EMPTY' });
  console.log('Competitor 1:',    { success: !!scrapedComp1,    length: scrapedComp1.length,    preview: scrapedComp1.slice(0, 100)    || 'EMPTY' });
  console.log('Competitor 2:',    { success: !!scrapedComp2,    length: scrapedComp2.length,    preview: scrapedComp2.slice(0, 100)    || 'EMPTY' });
  console.log('=== END SCRAPE RESULTS ===');

  // FIX 6 — content length log after caps
  console.log('=== CONTENT LENGTHS AFTER CAPS ===');
  console.log({
    homepage:  scrapedHomepage.length,
    about:     scrapedAbout.length,
    blog:      scrapedBlog.length,
    instagram: scrapedInstagram.length,
    comp1:     scrapedComp1.length,
    comp2:     scrapedComp2.length,
    total:     [scrapedHomepage, scrapedAbout, scrapedBlog, scrapedInstagram, scrapedComp1, scrapedComp2].join('').length,
  });

  const instagramSignals = await extractInstagramSignals(scrapedInstagram);

  return NextResponse.json({
    scraped_homepage:  scrapedHomepage,
    scraped_about:     scrapedAbout,
    scraped_blog:      scrapedBlog,
    scraped_comp1:     scrapedComp1,
    scraped_comp2:     scrapedComp2,
    scraped_instagram: scrapedInstagram + instagramSignals,
  });
}
