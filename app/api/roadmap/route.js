import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ROADMAP_PROMPT } from '@/lib/prompts';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fillPrompt(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

async function callClaude(prompt) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-0',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content.find(b => b.type === 'text')?.text || '';
}

function extractJSON(text) {
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

export async function POST(request) {
  const body = await request.json();
  const { brandName, scoreData, direction, toneDirection, targetAudience, marketFocus } = body;

  const filledPrompt = fillPrompt(ROADMAP_PROMPT, {
    brand_name:       brandName,
    score_json:       JSON.stringify(scoreData, null, 2),
    direction:        direction || 'Not specified',
    tone_direction:   toneDirection,
    target_audience:  targetAudience,
    market_focus:     marketFocus,
  });

  let text = await callClaude(filledPrompt);
  let parsed = extractJSON(text);

  if (!parsed) {
    text = await callClaude(filledPrompt);
    parsed = extractJSON(text);
  }

  if (!parsed) {
    return NextResponse.json({ error: 'Failed to parse roadmap response' }, { status: 500 });
  }

  return NextResponse.json(parsed);
}
