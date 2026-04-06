import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;
import { SCORING_SYSTEM_PROMPT, SCORING_USER_PROMPT } from '@/lib/prompts';
import { saveAudit, getBrandProfile, createBrandProfile, saveScoreToHistory } from '@/lib/supabase';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fillPrompt(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

async function callClaude(prompt) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-0',
    max_tokens: 3000,
    system: SCORING_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content.find(b => b.type === 'text')?.text || '';
}

function tagEvidenceSentiment(quotes) {
  if (!Array.isArray(quotes)) return quotes;
  const positiveWords = [
    'strong', 'good', 'great', 'excellent', 'consistent', 'effective',
    'high', 'above', 'well', 'clear', 'distinctive',
  ];
  const negativeWords = [
    'weak', 'poor', 'lack', 'missing', 'generic', 'inconsistent', 'low',
    'below', 'unclear', 'absent', 'fails', 'drops', 'hurts', 'gap', 'problem',
  ];
  return quotes.map(q => {
    const text = ((q.observation || '') + ' ' + (q.quote || '')).toLowerCase();
    const posScore = positiveWords.filter(w => text.includes(w)).length;
    const negScore = negativeWords.filter(w => text.includes(w)).length;
    return { ...q, sentiment: negScore > posScore ? 'negative' : 'positive' };
  });
}

function extractJSON(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {}
  // Try extracting JSON block
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }
  return null;
}

export async function POST(request) {
  try {
  const body = await request.json();
  const {
    brandName, industry, brandAge, targetAudience, challenge,
    scraped_homepage, scraped_about, scraped_blog, scraped_instagram,
    comp1Name, scraped_comp1, comp2Name, scraped_comp2,
  } = body;

  const filledPrompt = fillPrompt(SCORING_USER_PROMPT, {
    brand_name: brandName,
    industry,
    brand_age: brandAge,
    target_audience: targetAudience,
    challenge,
    scraped_homepage: scraped_homepage || 'No data',
    scraped_about:    scraped_about    || 'No data',
    scraped_blog:     scraped_blog     || 'No data',
    scraped_instagram: scraped_instagram || 'No data',
    comp1_name:  comp1Name  || 'Competitor 1',
    scraped_comp1: scraped_comp1 || 'No data',
    comp2_name:  comp2Name  || 'Competitor 2',
    scraped_comp2: scraped_comp2 || 'No data',
  });

  let text = await callClaude(filledPrompt);
  let parsed = extractJSON(text);

  // Retry once if parsing failed
  if (!parsed) {
    text = await callClaude(filledPrompt);
    parsed = extractJSON(text);
  }

  if (!parsed) {
    return NextResponse.json({ error: 'Failed to parse score response' }, { status: 500 });
  }

  try {
    await saveAudit({
      brandName, industry, brandAge, targetAudience, challenge,
      websiteUrl: body.websiteUrl || '',
      instagramHandle: body.instagramHandle || '',
      scraped_homepage, scraped_about, scraped_blog, scraped_instagram,
      scraped_comp1, scraped_comp2,
      scoreData: parsed,
    });
  } catch (err) {
    console.error('saveAudit failed:', err.message);
  }

  let brandProfileId = null;
  try {
    const existing = await getBrandProfile(brandName);
    if (!existing) {
      brandProfileId = await createBrandProfile({
        brandName,
        industry,
        brandAge,
        targetAudience,
        websiteUrl:      body.websiteUrl      || '',
        instagramHandle: body.instagramHandle || '',
        marketFocus:     body.marketFocus     || '',
        competitors: [
          { name: body.comp1Name || '', url: body.comp1Url || '' },
          { name: body.comp2Name || '', url: body.comp2Url || '' },
        ].filter(c => c.name || c.url),
      });
    } else {
      brandProfileId = existing.id;
    }
    await saveScoreToHistory(brandName, parsed);
  } catch (err) {
    console.error('brand_profiles save failed:', err.message);
  }

  if (parsed.evidence_quotes) {
    parsed.evidence_quotes = tagEvidenceSentiment(parsed.evidence_quotes);
  }

  // ── Competitor dimension scoring (optional) ───────────────────
  if (comp1Name && scraped_comp1) {
    try {
      const competitorPrompt = `You are scoring a competitor brand for comparison purposes only.

Competitor name: ${comp1Name}
Competitor scraped content:
${scraped_comp1.slice(0, 2000)}

Main brand being compared against: ${brandName}
Main brand scores for reference:
${JSON.stringify(parsed.dimensions)}

Score the competitor on the same 5 dimensions. Be consistent with how you scored the main brand. Use the same scale.

Return ONLY this JSON, no other text:
{
  "visual_identity": number,
  "tone_voice": number,
  "trend_relevance": number,
  "competitor_positioning": number,
  "audience_alignment": number
}`;

      const compRes = await anthropic.messages.create({
        model: 'claude-sonnet-4-0',
        max_tokens: 300,
        messages: [{ role: 'user', content: competitorPrompt }],
      });
      const compText = compRes.content.find(b => b.type === 'text')?.text || '';
      const compParsed = extractJSON(compText);
      if (compParsed) {
        parsed.competitor_scores = { name: comp1Name, dimensions: compParsed };
      }
    } catch (err) {
      console.error('Competitor scoring failed (non-critical):', err.message);
    }
  }

  return NextResponse.json({ ...parsed, brandProfileId });
  } catch (err) {
    console.error('Score API error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
