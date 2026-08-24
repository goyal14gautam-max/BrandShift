import { FirecrawlAppV1 as FirecrawlApp } from '@mendable/firecrawl-js';
import { callClaudeJSON } from '@/lib/claudeClient';
import { buildQuickAuditPrompt } from '@/lib/prompts';
import { supabaseAdmin } from '@/lib/supabase';

export const maxDuration = 45;

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(request) {
  try {
    const { brandName, websiteUrl, instagramHandle, source } = await request.json();

    if (!brandName || !websiteUrl) {
      return Response.json(
        { error: 'Brand name and website required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    console.log('Quick audit request:', { brandName, websiteUrl, instagramHandle, source: source || 'unknown' });

    // Scrape homepage and Instagram in parallel, each with its own timeout
    const [homepageResult, instaResult] = await Promise.allSettled([
      withTimeout(scrapeHomepage(websiteUrl), 10000, ''),
      instagramHandle ? withTimeout(scrapeInstagramQuick(instagramHandle), 20000, '') : Promise.resolve(''),
    ]);

    const homepageContent = homepageResult.status === 'fulfilled' ? homepageResult.value.slice(0, 3000) : '';
    const instagramContent = instaResult.status === 'fulfilled' ? instaResult.value : '';

    console.log('Quick audit scraped:', { homepage: homepageContent.length, instagram: instagramContent.length });

    const prompt = buildQuickAuditPrompt({
      brandName,
      websiteUrl,
      instagramHandle,
      homepageContent,
      instagramContent,
    });

    let result;
    try {
      result = await callClaudeJSON({
        model: 'claude-sonnet-5',
        max_tokens: 400,
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: prompt }],
      });
    } catch (err) {
      console.error('Quick audit Claude error:', err.message);
      return Response.json(
        { error: 'Analysis failed. Try again.' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Best-effort lead save — never fail the audit response if this fails.
    // supabase-js resolves with { error } instead of throwing, so check it explicitly.
    try {
      const { error: dbError } = await supabaseAdmin.from('quick_audit_leads').insert({
        brand_name: brandName,
        website_url: websiteUrl,
        instagram_handle: instagramHandle || '',
        score: result.score,
        source: source || 'unknown',
        result_data: result,
      });
      if (dbError) {
        console.error('Lead save failed:', dbError.message);
      } else {
        console.log('Lead saved:', brandName);
      }
    } catch (dbErr) {
      console.error('Lead save failed:', dbErr.message);
    }

    return Response.json({ success: true, result }, { headers: CORS_HEADERS });

  } catch (err) {
    console.error('Quick audit error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS_HEADERS });
  }
}

function withTimeout(promise, ms, fallback) {
  const timeout = new Promise(resolve => setTimeout(() => resolve(fallback), ms));
  return Promise.race([promise, timeout]);
}

async function scrapeHomepage(url) {
  let target = url.trim();
  if (!target.startsWith('http')) target = 'https://' + target;
  try {
    const result = await firecrawl.scrapeUrl(target, {
      formats: ['markdown'],
      onlyMainContent: true,
    });
    return result?.markdown || result?.data?.markdown || '';
  } catch (err) {
    console.error('Quick audit homepage scrape failed:', err.message);
    return '';
  }
}

// Lightweight Instagram scrape for the quick-audit budget — same Apify flow as
// app/api/scrape/route.js's scrapeInstagram(), but far fewer polls/posts since
// this endpoint targets a ~20s Instagram budget instead of a ~60s one.
async function scrapeInstagramQuick(handle) {
  if (!handle) return '';
  const cleanHandle = handle.replace(/^@/, '').trim();
  const token = process.env.APIFY_API_TOKEN;

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [cleanHandle], resultsLimit: 6 }),
      }
    );
    const run = await runRes.json();
    const runId = run?.data?.id;
    if (!runId) return '';

    let status = 'RUNNING';
    let attempts = 0;
    while (status === 'RUNNING' && attempts < 4) {
      await new Promise(r => setTimeout(r, 4000));
      const s = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`).then(r => r.json());
      status = s?.data?.status;
      attempts++;
    }
    if (status !== 'SUCCEEDED') return '';

    const runData = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`).then(r => r.json());
    const datasetId = runData?.data?.defaultDatasetId;
    if (!datasetId) return '';

    const items = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`).then(r => r.json());
    if (!items?.length) return '';

    const profile = items[0];
    const posts = profile.latestPosts || profile.posts || [];

    return [
      `Followers: ${profile.followersCount || 'unknown'}`,
      `Bio: ${profile.biography || ''}`,
      'Recent posts:',
      ...posts.slice(0, 5).map((p, i) => `${i + 1}. "${(p.caption || p.text || '').slice(0, 150)}"`),
    ].join('\n');

  } catch (err) {
    console.error('Quick Instagram scrape error:', err.message);
    return '';
  }
}
