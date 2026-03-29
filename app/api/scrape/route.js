import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { ApifyClient } from 'apify-client';
import { cleanMarkdown } from '@/lib/cleaner';

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

async function scrapeWithFallback(base, paths) {
  for (const path of paths) {
    const content = await firecrawlScrape(base.replace(/\/$/, '') + path);
    if (content && content.length > 200) return content;
  }
  return '';
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
    scrapeWithFallback(base, ['/about', '/pages/about-us', '/about-us']),
    scrapeWithFallback(base, ['/blogs', '/blog']),
    comp1Url ? firecrawlScrape(comp1Url) : Promise.resolve(''),
    comp2Url ? firecrawlScrape(comp2Url) : Promise.resolve(''),
    scrapeInstagram(instagramHandle),
  ]);

  const getValue = r => (r.status === 'fulfilled' ? r.value : '');

  return NextResponse.json({
    scraped_homepage:  cleanMarkdown(getValue(homepageResult)),
    scraped_about:     cleanMarkdown(getValue(aboutResult)),
    scraped_blog:      cleanMarkdown(getValue(blogResult)),
    scraped_comp1:     cleanMarkdown(getValue(comp1Result)),
    scraped_comp2:     cleanMarkdown(getValue(comp2Result)),
    scraped_instagram: cleanMarkdown(getValue(instagramResult)),
  });
}
