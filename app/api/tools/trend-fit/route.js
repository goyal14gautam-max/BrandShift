import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/claudeClient';
import { getBrandProfile, updateBrandProfile } from '@/lib/supabase';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { brandName } = await request.json();
    if (!brandName) return NextResponse.json({ error: 'brandName required' }, { status: 400 });

    const profile = await getBrandProfile(brandName);
    if (!profile) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    // Return cached trends if fresh (< 7 days)
    if (profile.latest_trends && profile.trends_generated_at) {
      const daysSince = (Date.now() - new Date(profile.trends_generated_at).getTime()) / 86400000;
      if (daysSince < 7) {
        return NextResponse.json({
          trends: profile.latest_trends,
          generated_for_week: profile.trends_generated_at,
          cached: true,
        });
      }
    }

    const today = new Date();
    const month = today.toLocaleString('en-IN', { month: 'long' });
    const year = today.getFullYear();

    const prompt = `You are a trend analyst for Indian brands. Evaluate current trends for this brand.

BRAND: ${profile.brand_name}
INDUSTRY: ${profile.industry}
TARGET AUDIENCE: ${profile.target_audience || ''}
BRAND PERSONALITY: ${JSON.stringify(profile.brand_personality_words || [])}

Current date: ${month} ${year}

Indian cultural calendar context:
- IPL: March to May
- Summer: April to June
- Board exams/results: Feb to June
- Monsoon: July to September
- Onam/Ganesh Chaturthi: Aug-Sept
- Navratri/Durga Puja: October
- Diwali: October-November
- Wedding season: November-February

Identify 5 current trends in India relevant to this brand's category and audience. For each trend evaluate if this specific brand should use it.

Return ONLY this JSON, no other text:
{
  "trends": [
    {
      "name": "Trend name — max 4 words",
      "description": "One sentence describing this trend in Indian context",
      "fit": "use",
      "reason": "One specific sentence on why this fits or doesn't fit THIS brand — reference their personality or audience",
      "how_to_use": "If fit is use or test, one specific sentence on how. If avoid, empty string."
    }
  ],
  "generated_for_week": "${month} ${year}"
}

fit must be exactly one of: "use", "avoid", "test"`;

    const response = await callClaude({
      model: 'claude-sonnet-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find(b => b.type === 'text')?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]);

    // Save to DB — don't let save failure break the response
    try {
      await updateBrandProfile(brandName, {
        latest_trends: parsed.trends,
        trends_generated_at: new Date().toISOString(),
      });
    } catch (saveErr) {
      console.error('trend-fit save error (columns may not exist yet):', saveErr.message);
    }

    return NextResponse.json({
      trends: parsed.trends,
      generated_for_week: parsed.generated_for_week,
    });
  } catch (err) {
    console.error('trend-fit error:', err.message, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
