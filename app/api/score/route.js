import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SCORING_SYSTEM_PROMPT, SCORING_USER_PROMPT } from '@/lib/prompts';
import { saveAudit } from '@/lib/supabase';

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
    console.error('Supabase save failed:', err.message);
  }

  return NextResponse.json(parsed);
}
