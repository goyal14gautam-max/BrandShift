import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/claudeClient';
import { ROADMAP_PROMPT } from '@/lib/prompts';
import { updateBrandProfile } from '@/lib/supabase';
import { flattenRoadmapToTasks } from '@/lib/helpers';

function fillPrompt(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

async function callClaudeForRoadmap(prompt) {
  const response = await callClaude({
    model: 'claude-sonnet-4-0',
    max_tokens: 3000,
    temperature: 0.3,
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
  const { brandName, industry, scoreData, direction, toneDirection, targetAudience, marketFocus } = body;

  const filledPrompt = fillPrompt(ROADMAP_PROMPT, {
    brand_name:       brandName,
    industry:         industry || 'Not specified',
    score_json:       JSON.stringify(scoreData, null, 2),
    direction:        direction || 'Not specified',
    tone_direction:   toneDirection || 'Not specified',
    target_audience:  targetAudience || 'Not specified',
    market_focus:     marketFocus || 'Not specified',
  });

  console.log('=== ROADMAP API CALLED ===');
  console.log('Brand:', brandName, '| Industry:', industry);

  let text = await callClaudeForRoadmap(filledPrompt);
  console.log('Claude raw response length:', text.length);
  console.log('Claude raw preview:', text.slice(0, 300));

  let parsed = extractJSON(text);

  if (!parsed) {
    console.log('First parse failed, retrying...');
    text = await callClaudeForRoadmap(filledPrompt);
    parsed = extractJSON(text);
  }

  if (!parsed) {
    console.error('Roadmap parse failed after retry. Raw text:', text.slice(0, 500));
    return NextResponse.json({ error: 'Failed to parse roadmap response' }, { status: 500 });
  }

  console.log('Roadmap parsed successfully. Keys:', Object.keys(parsed));
  console.log('=== ROADMAP API DONE ===');

  try {
    const tasks = flattenRoadmapToTasks(parsed);
    await updateBrandProfile(brandName, {
      current_roadmap:    parsed,
      roadmap_start_date: new Date().toISOString(),
      current_week:       1,
      roadmap_direction:  direction || '',
      roadmap_tone:       toneDirection || '',
      tasks,
    });
    console.log('Roadmap saved with', tasks.length, 'tasks');
  } catch (err) {
    console.error('roadmap profile update failed:', err.message);
  }

  return NextResponse.json(parsed);
}
