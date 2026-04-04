import { NextResponse } from 'next/server';
import { FirecrawlAppV1 as FirecrawlApp } from '@mendable/firecrawl-js';
import Anthropic from '@anthropic-ai/sdk';
import { cleanMarkdown } from '@/lib/cleaner';

// Module-level instances (Fix 1)
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
const anthropic  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Core scrape helper ─────────────────────────────────────────
async function firecrawlScrape(url, options = {}) {
  try {
    const result = await firecrawl.scrapeUrl(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      ...options,
    });
    return result?.markdown || result?.data?.markdown || '';
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
  if (homepagePrefix && content.slice(0, 200).trim() === homepagePrefix) return false;
  return true;
}

// ── About page (never returns homepage content) ────────────────
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

// ── Blog (waitFor JS rendering) ────────────────────────────────
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

// ── Instagram via Apify REST API (Fix 2) ──────────────────────
async function scrapeInstagram(handle) {
  if (!handle) return '';
  const cleanHandle = handle.replace(/^@/, '').trim();

  try {
    const token = process.env.APIFY_API_TOKEN;

    // Start run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [cleanHandle], resultsLimit: 20 }),
      }
    );
    const run = await runResponse.json();
    const runId = run?.data?.id;

    if (!runId) {
      console.error('Apify run failed to start:', run);
      return '';
    }

    console.log('Apify run started:', runId);

    // Poll for completion
    let attempts = 0;
    let status = 'RUNNING';

    while (status === 'RUNNING' && attempts < 15) {
      await new Promise(r => setTimeout(r, 8000));
      const statusData = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
      ).then(r => r.json());
      status = statusData?.data?.status;
      attempts++;
      console.log(`Instagram poll attempt ${attempts}: ${status}`);
    }

    if (status !== 'SUCCEEDED') {
      console.error('Apify run did not succeed:', status);
      return '';
    }

    // Get dataset ID then items
    const datasetId = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
    ).then(r => r.json()).then(d => d?.data?.defaultDatasetId);

    const items = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`
    ).then(r => r.json());

    if (!items?.length) return '';

    const profile = items[0];
    const posts = profile.latestPosts || profile.posts || [];

    return [
      'INSTAGRAM PROFILE:',
      `Username: ${cleanHandle}`,
      `Followers: ${profile.followersCount || 'unknown'}`,
      `Bio: ${profile.biography || 'none'}`,
      '',
      'RECENT POSTS:',
      ...posts.slice(0, 20).map((p, i) =>
        `Post ${i + 1}: "${(p.caption || p.text || '').slice(0, 200)}" | Likes: ${p.likesCount || p.likes || 0} | Comments: ${p.commentsCount || p.comments || 0}`
      ),
    ].join('\n');

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

  console.log('Firecrawl instance type:', typeof firecrawl?.scrapeUrl);
  console.log('Scrape route called with:', { websiteUrl, instagramHandle, comp1Url, comp2Url });

  const base = (websiteUrl || '').replace(/\/$/, '');

  // ── Homepage ──────────────────────────────────────────────────
  let scrapedHomepage = '';
  try {
    scrapedHomepage = await firecrawlScrape(base);
  } catch (err) {
    console.error('Homepage scrape failed:', err.message);
  }

  // ── About ─────────────────────────────────────────────────────
  let scrapedAbout = '';
  try {
    scrapedAbout = await scrapeAbout(base, scrapedHomepage);
  } catch (err) {
    console.error('About scrape failed:', err.message);
  }

  // ── Blog ──────────────────────────────────────────────────────
  let scrapedBlog = '';
  try {
    scrapedBlog = await scrapeBlog(base);
  } catch (err) {
    console.error('Blog scrape failed:', err.message);
  }

  // ── Competitors ───────────────────────────────────────────────
  let scrapedComp1 = '';
  try {
    if (comp1Url) scrapedComp1 = cleanMarkdown(await firecrawlScrape(comp1Url)).slice(0, 3000);
  } catch (err) {
    console.error('Competitor 1 scrape failed:', err.message);
  }

  let scrapedComp2 = '';
  try {
    if (comp2Url) scrapedComp2 = cleanMarkdown(await firecrawlScrape(comp2Url)).slice(0, 3000);
  } catch (err) {
    console.error('Competitor 2 scrape failed:', err.message);
  }

  // ── Instagram ─────────────────────────────────────────────────
  let scrapedInstagram = '';
  try {
    scrapedInstagram = await scrapeInstagram(instagramHandle);
  } catch (err) {
    console.error('Instagram scrape failed:', err.message);
  }

  // ── Clean + cap all sources ───────────────────────────────────
  scrapedHomepage  = cleanMarkdown(scrapedHomepage).slice(0, 4000);
  scrapedAbout     = cleanMarkdown(scrapedAbout).slice(0, 2000);
  scrapedBlog      = cleanMarkdown(scrapedBlog).slice(0, 3000);
  scrapedInstagram = cleanMarkdown(scrapedInstagram).slice(0, 3000);

  console.log('=== SCRAPE RESULTS ===');
  console.log('Website homepage:', { success: !!scrapedHomepage, length: scrapedHomepage.length, preview: scrapedHomepage.slice(0, 100) || 'EMPTY' });
  console.log('Website about:',   { success: !!scrapedAbout,    length: scrapedAbout.length,    preview: scrapedAbout.slice(0, 100)    || 'EMPTY' });
  console.log('Blog:',            { success: !!scrapedBlog,     length: scrapedBlog.length,     preview: scrapedBlog.slice(0, 100)     || 'EMPTY' });
  console.log('Instagram:',       { success: !!scrapedInstagram, length: scrapedInstagram.length, preview: scrapedInstagram.slice(0, 100) || 'EMPTY' });
  console.log('Competitor 1:',    { success: !!scrapedComp1,    length: scrapedComp1.length,    preview: scrapedComp1.slice(0, 100)    || 'EMPTY' });
  console.log('Competitor 2:',    { success: !!scrapedComp2,    length: scrapedComp2.length,    preview: scrapedComp2.slice(0, 100)    || 'EMPTY' });
  console.log('=== END SCRAPE RESULTS ===');

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
