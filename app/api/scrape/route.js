import { NextResponse } from 'next/server';
import { FirecrawlAppV1 as FirecrawlApp } from '@mendable/firecrawl-js';
import { callClaude } from '@/lib/claudeClient';
import { cleanMarkdown } from '@/lib/cleaner';

export const maxDuration = 300;

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// ── Timeout wrapper ──────────────────────────────────────────────
function withTimeout(promise, ms, fallback = '') {
  const timeout = new Promise(resolve => setTimeout(() => resolve(fallback), ms));
  return Promise.race([promise, timeout]);
}

// ── Aggressive URL normalizer ────────────────────────────────────
function extractHomepageUrl(url) {
  if (!url || url.trim() === '') return '';
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
    const parsed = new URL(cleanUrl);
    // Always return just protocol + hostname — strip ALL paths, params, fragments
    return parsed.protocol + '//' + parsed.hostname;
  } catch {
    const match = url.match(/(?:https?:\/\/)?([^\/\?#]+)/);
    if (match) return 'https://' + match[1];
    return url;
  }
}

// ── Content validation ───────────────────────────────────────────
function isValidContent(content, minLength = 300, homepageFingerprint = '') {
  if (!content || content.length < minLength) return false;
  const lower = content.toLowerCase();
  const invalidSignals = [
    'page not found', '404', 'we are sorry but this page',
    'this page does not exist', 'page cannot be found',
    "doesn't exist", 'no longer available', 'made an egg-sit',
  ];
  if (invalidSignals.some(sig => lower.includes(sig))) return false;
  if (homepageFingerprint && content.slice(0, 200).trim() === homepageFingerprint) return false;
  return true;
}

// ── Core firecrawl helper ────────────────────────────────────────
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

// ── Firecrawl helper with screenshot ────────────────────────────
async function firecrawlScrapeWithScreenshot(url, options = {}) {
  try {
    const result = await firecrawl.scrapeUrl(url, {
      formats: ['markdown', 'screenshot'],
      onlyMainContent: true,
      ...options,
    });
    return {
      markdown:   result?.markdown   || result?.data?.markdown   || '',
      screenshot: result?.screenshot || result?.data?.screenshot || '',
    };
  } catch (err) {
    console.error(`Firecrawl scrape+screenshot failed for ${url}:`, err.message);
    return { markdown: '', screenshot: '' };
  }
}

// ── Named source scrapers ────────────────────────────────────────
async function scrapeHomepage(url) {
  if (!url) return { content: '', screenshot: '' };
  try {
    const { markdown: main, screenshot } = await firecrawlScrapeWithScreenshot(url, { onlyMainContent: true });
    if (main && main.length >= 500) {
      console.log('Homepage: onlyMainContent, length', main.length);
      return { content: cleanMarkdown(main).slice(0, 4000), screenshot };
    }
    // Too sparse — try without onlyMainContent
    const { markdown: full, screenshot: fullShot } = await firecrawlScrapeWithScreenshot(url, { onlyMainContent: false });
    const bestText = (full && full.length > (main || '').length) ? full : (main || '');
    console.log('Homepage: full page fallback, length', bestText.length);
    return { content: cleanMarkdown(bestText).slice(0, 4000), screenshot: fullShot || screenshot };
  } catch (err) {
    console.error('Homepage failed:', err.message);
    return { content: '', screenshot: '' };
  }
}

async function scrapeAbout(baseUrl, homepageFingerprint = '') {
  if (!baseUrl) return '';
  const paths = [
    '/pages/about-us', '/about-us', '/about', '/our-story', '/company',
  ];
  const base = baseUrl.replace(/\/$/, '');
  for (const path of paths) {
    try {
      const content = await firecrawlScrape(base + path);
      if (isValidContent(content, 300, homepageFingerprint)) {
        return cleanMarkdown(content).slice(0, 2000);
      }
    } catch { continue; }
  }
  return '';
}

async function scrapeBlog(baseUrl, homepageFingerprint = '') {
  if (!baseUrl) return '';
  const paths = [
    '/blogs', '/blog', '/news', '/articles', '/insights',
  ];
  const base = baseUrl.replace(/\/$/, '');
  for (const path of paths) {
    try {
      const content = await firecrawlScrape(base + path, { waitFor: 1000 });
      if (isValidContent(content, 300, homepageFingerprint)) {
        return cleanMarkdown(content).slice(0, 3000);
      }
    } catch { continue; }
  }
  console.log('Blog: no valid content found');
  return '';
}

async function scrapeCompetitor(url) {
  if (!url || url.trim() === '') return { content: '', screenshot: '' };
  // extractHomepageUrl already applied before calling this
  try {
    const { markdown, screenshot } = await firecrawlScrapeWithScreenshot(url);
    return { content: cleanMarkdown(markdown).slice(0, 3000), screenshot };
  } catch (err) {
    console.error('Competitor failed:', url, err.message);
    return { content: '', screenshot: '' };
  }
}

// ── Instagram via Apify REST API ─────────────────────────────────
async function scrapeInstagram(handle) {
  if (!handle) return '';
  const cleanHandle = handle.replace(/^@/, '').trim();
  try {
    const token = process.env.APIFY_API_TOKEN;

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
    if (!runId) { console.error('Apify run failed to start:', run); return ''; }
    console.log('Apify run started:', runId);

    let attempts = 0;
    let status = 'RUNNING';
    while (status === 'RUNNING' && attempts < 12) {
      await new Promise(r => setTimeout(r, 5000));
      const statusData = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
      ).then(r => r.json());
      status = statusData?.data?.status;
      attempts++;
      console.log(`Instagram poll attempt ${attempts}: ${status}`);
    }

    if (status !== 'SUCCEEDED') { console.error('Apify run did not succeed:', status); return ''; }

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

// ── Instagram signal extraction ──────────────────────────────────
async function extractInstagramSignals(captions) {
  if (!captions || captions.length < 50) return '';
  try {
    const response = await callClaude({
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

// ── LinkedIn scraping ────────────────────────────────────────────
async function scrapeLinkedIn(url) {
  if (!url || url.trim() === '') return '';
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
    cleanUrl = cleanUrl.replace(/\/$/, '');
    console.log('Scraping LinkedIn:', cleanUrl);

    const result = await firecrawl.scrapeUrl(cleanUrl, { formats: ['markdown'] });
    const content = result?.markdown || result?.data?.markdown || '';
    if (!content || content.length < 50) {
      console.log('LinkedIn: insufficient content');
      return '';
    }

    const cleaned = extractLinkedInData(content, cleanUrl);
    console.log('LinkedIn scraped:', { length: cleaned.length, preview: cleaned.slice(0, 100) });
    return cleaned.slice(0, 3000);
  } catch (err) {
    console.error('LinkedIn scrape failed:', err.message);
    return '';
  }
}

function extractLinkedInData(content, url) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const companySlug = url.split('/company/')[1]?.replace(/\/$/, '')?.split('/')[0] || '';
  const followerLine = lines.find(l => l.toLowerCase().includes('follower'));
  const aboutIndex = lines.findIndex(l => l.toLowerCase() === 'about' || l.toLowerCase().includes('overview'));
  const aboutText = aboutIndex >= 0
    ? lines.slice(aboutIndex + 1, aboutIndex + 6).filter(l => l.length > 20).join(' ')
    : '';
  const postLines = lines.filter(l =>
    l.length > 30 && l.length < 300 && !l.includes('http') && !l.startsWith('#') &&
    !l.toLowerCase().includes('follow') && !l.toLowerCase().includes('connect') &&
    !l.toLowerCase().includes('notification')
  ).slice(0, 5);

  const parts = ['LINKEDIN COMPANY PAGE:', `Company: ${companySlug}`, `URL: ${url}`];
  if (followerLine) parts.push(`Followers: ${followerLine}`);
  if (aboutText) parts.push('', 'ABOUT:', aboutText);
  if (postLines.length > 0) parts.push('', 'RECENT CONTENT:', ...postLines.map((l, i) => `Post ${i + 1}: ${l}`));
  return parts.join('\n');
}

function extractLinkedInFollowers(content) {
  if (!content) return null;
  const match = content.match(/(\d[\d,]+)\s*followers?/i);
  if (!match) return null;
  return parseInt(match[1].replace(/,/g, ''));
}

// ── POST handler ─────────────────────────────────────────────────
export async function POST(request) {
  try {
  const body = await request.json();
  const { websiteUrl, instagramHandle, linkedinUrl, comp1Url, comp2Url } = body;

  // Clean all URLs — strip paths/params, keep only hostname
  const cleanWebsiteUrl = extractHomepageUrl(websiteUrl || '');
  const cleanComp1Url   = extractHomepageUrl(comp1Url || '');
  const cleanComp2Url   = extractHomepageUrl(comp2Url || '');

  console.log('Scrape route called with:', { websiteUrl, instagramHandle, linkedinUrl, comp1Url, comp2Url });
  console.log('URLs after cleaning:', { cleanWebsiteUrl, cleanComp1Url, cleanComp2Url });
  console.log('Competitor URLs after cleaning:', { comp1: cleanComp1Url, comp2: cleanComp2Url });

  // ── Homepage first (fingerprint needed for about/blog) ──────────
  const homepageResult      = await withTimeout(scrapeHomepage(cleanWebsiteUrl), 15000, { content: '', screenshot: '' });
  const homepageContent     = homepageResult.content;
  const homepageScreenshot  = homepageResult.screenshot;
  const homepageFingerprint = homepageContent.slice(0, 150).trim();

  console.log('Homepage done, length:', homepageContent.length, '— starting parallel scrapes');

  // ── All remaining sources in parallel ───────────────────────────
  const [
    aboutContent,
    blogContent,
    instagramContent,
    linkedinContent,
    comp1Result,
    comp2Result,
  ] = await Promise.all([
    withTimeout(scrapeAbout(cleanWebsiteUrl, homepageFingerprint), 10000),
    withTimeout(scrapeBlog(cleanWebsiteUrl, homepageFingerprint),  10000),
    withTimeout(scrapeInstagram(instagramHandle),                   50000),
    withTimeout(scrapeLinkedIn(linkedinUrl),                         15000),
    withTimeout(scrapeCompetitor(cleanComp1Url), 10000, { content: '', screenshot: '' }),
    withTimeout(scrapeCompetitor(cleanComp2Url), 10000, { content: '', screenshot: '' }),
  ]);

  const scrapedHomepage  = homepageContent;
  const scrapedAbout     = aboutContent;
  const scrapedBlog      = blogContent;
  const scrapedComp1     = comp1Result.content;
  const scrapedComp2     = comp2Result.content;
  const scrapedInstagram = cleanMarkdown(instagramContent).slice(0, 3000);
  const scrapedLinkedIn  = linkedinContent || '';

  console.log('=== SCRAPE RESULTS ===');
  console.log('Homepage:',    { length: scrapedHomepage.length,  preview: scrapedHomepage.slice(0, 100)  || 'EMPTY' });
  console.log('About:',       { length: scrapedAbout.length,     preview: scrapedAbout.slice(0, 100)     || 'EMPTY' });
  console.log('Blog:',        { length: scrapedBlog.length,      preview: scrapedBlog.slice(0, 100)      || 'EMPTY' });
  console.log('Instagram:',   { length: scrapedInstagram.length, preview: scrapedInstagram.slice(0, 100) || 'EMPTY' });
  console.log('LinkedIn:',    { length: scrapedLinkedIn.length,  preview: scrapedLinkedIn.slice(0, 100)  || 'EMPTY' });
  console.log('Competitor 1:',{ length: scrapedComp1.length,     preview: scrapedComp1.slice(0, 100)     || 'EMPTY' });
  console.log('Competitor 2:',{ length: scrapedComp2.length,     preview: scrapedComp2.slice(0, 100)     || 'EMPTY' });
  console.log('=== END SCRAPE RESULTS ===');

  const instagramSignals = await withTimeout(extractInstagramSignals(scrapedInstagram), 8000, '');

  return NextResponse.json({
    scraped_homepage:  scrapedHomepage,
    scraped_about:     scrapedAbout,
    scraped_blog:      scrapedBlog,
    scraped_comp1:     scrapedComp1,
    scraped_comp2:     scrapedComp2,
    scraped_instagram: scrapedInstagram + instagramSignals,
    scraped_linkedin:  scrapedLinkedIn,
    screenshots: {
      homepage: homepageScreenshot,
      comp1:    comp1Result.screenshot,
      comp2:    comp2Result.screenshot,
    },
    activityData: {
      linkedinFollowers: extractLinkedInFollowers(scrapedLinkedIn),
    },
  });
  } catch (err) {
    console.error('Scrape API error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
