import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { ApifyClient } from 'apify-client';
import Anthropic from '@anthropic-ai/sdk';
import { cleanMarkdown } from '@/lib/cleaner';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getFirecrawl() {
  return new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || 'placeholder' });
}

function getApify() {
  return new ApifyClient({ token: process.env.APIFY_API_TOKEN || '' });
}

async function firecrawlScrape(url) {
  try {
    const fc = getFirecrawl();
    const result = await fc.v1.scrapeUrl(url, { formats: ['markdown'] });
    return result?.markdown || result?.content || '';
  } catch {
    return '';
  }
}

const NOT_FOUND_SIGNALS = [
  '404',
  'page not found',
  "doesn't exist",
  'does not exist',
  'made an egg-sit',
];

function isRealContent(content) {
  if (!content || content.length < 300) return false;
  const lower = content.toLowerCase();
  return !NOT_FOUND_SIGNALS.some(sig => lower.includes(sig));
}

async function scrapeWithFallback(base, paths) {
  for (const path of paths) {
    const content = await firecrawlScrape(base.replace(/\/$/, '') + path);
    if (isRealContent(content)) return content;
  }
  return '';
}

async function extractInstagramSignals(captions) {
  if (!captions || captions.length < 50) return '';
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-0',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are analysing Instagram captions for a brand.
Extract the following from these captions and return as JSON only, no markdown, no explanation:

{
  "tone_descriptors": ["3-5 words describing the brand voice e.g. casual, witty, Gen Z"],
  "content_types": ["types of content found e.g. UGC prompts, meme culture, product"],
  "cultural_references": ["any Indian cultural moments, trends, or references spotted"],
  "engagement_signals": ["high engagement posts with brief description"],
  "brand_personality": "one sentence summary of what this brand sounds like"
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

async function scrapeInstagram(handle) {
  if (!handle) return '';
  const cleanHandle = handle.replace(/^@/, '').trim();
  try {
    const apify = getApify();

    // Start the run without waiting (waitSecs: 0)
    const run = await apify.actor('apify/instagram-scraper').call(
      {
        directUrls: [`https://www.instagram.com/${cleanHandle}/`],
        resultsType: 'posts',
        resultsLimit: 20,
      },
      { waitSecs: 0 }
    );

    const runId = run.id;
    const maxWait = 3 * 60 * 1000; // 3 minutes
    const interval = 8000;         // poll every 8s
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      await new Promise(r => setTimeout(r, interval));
      const status = await getApify().run(runId).get();

      if (status.status === 'SUCCEEDED') {
        const dataset = await getApify().dataset(status.defaultDatasetId).listItems({ limit: 20 });
        if (!dataset.items.length) return 'No Instagram posts found';

        return dataset.items
          .map(p => {
            const parts = [];
            if (p.timestamp) parts.push(`[${p.timestamp}]`);
            if (p.caption)   parts.push(p.caption.slice(0, 500));
            if (p.likesCount != null) parts.push(`Likes: ${p.likesCount}`);
            if (p.commentsCount != null) parts.push(`Comments: ${p.commentsCount}`);
            if (p.hashtags?.length) parts.push(`Tags: ${p.hashtags.slice(0, 8).join(' ')}`);
            return parts.join(' | ');
          })
          .filter(Boolean)
          .join('\n\n');
      }

      if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status.status)) {
        return 'Instagram data unavailable';
      }
    }
    return 'Instagram data unavailable (timeout)';
  } catch {
    return 'Instagram data unavailable';
  }
}

export async function POST(request) {
  const body = await request.json();
  const { websiteUrl, instagramHandle, comp1Url, comp2Url } = body;

  const base = websiteUrl?.replace(/\/$/, '') || '';

  const [
    homepageResult,
    aboutResult,
    blogResult,
    comp1Result,
    comp2Result,
    instagramResult,
  ] = await Promise.allSettled([
    firecrawlScrape(base),
    scrapeWithFallback(base, ['/about', '/about-us', '/pages/about-us', '/pages/about', '/company', '/our-story', '/who-we-are']),
    scrapeWithFallback(base, ['/blog', '/blogs', '/news', '/articles', '/newsroom', '/press', '/media']),
    comp1Url ? firecrawlScrape(comp1Url) : Promise.resolve(''),
    comp2Url ? firecrawlScrape(comp2Url) : Promise.resolve(''),
    scrapeInstagram(instagramHandle),
  ]);

  const getValue = r => (r.status === 'fulfilled' ? r.value : '');

  const cleanedInstagram = cleanMarkdown(getValue(instagramResult));
  const instagramSignals = await extractInstagramSignals(cleanedInstagram);

  return NextResponse.json({
    scraped_homepage:  cleanMarkdown(getValue(homepageResult)),
    scraped_about:     cleanMarkdown(getValue(aboutResult)),
    scraped_blog:      cleanMarkdown(getValue(blogResult)),
    scraped_comp1:     cleanMarkdown(getValue(comp1Result)),
    scraped_comp2:     cleanMarkdown(getValue(comp2Result)),
    scraped_instagram: cleanedInstagram + instagramSignals,
  });
}
