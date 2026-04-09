import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/claudeClient';
import { getBrandProfile, updateBrandProfile } from '@/lib/supabase';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { brandName, inputText } = await request.json();
    if (!brandName) return NextResponse.json({ error: 'brandName required' }, { status: 400 });
    if (!inputText || inputText.trim().length < 10)
      return NextResponse.json({ error: 'Text too short (min 10 characters)' }, { status: 400 });
    if (inputText.trim().length > 500)
      return NextResponse.json({ error: 'Text too long (max 500 characters)' }, { status: 400 });

    const profile = await getBrandProfile(brandName);
    if (!profile) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    // Check daily usage limit
    const today = new Date().toISOString().split('T')[0];
    const isToday = profile.voice_check_date === today;
    const currentCount = isToday ? (profile.voice_check_count || 0) : 0;

    if (currentCount >= 10) {
      return NextResponse.json({ error: 'daily_limit_reached', count: currentCount, limit: 10 }, { status: 429 });
    }

    const prompt = `You are rewriting copy for a specific Indian brand to match their brand voice.

BRAND: ${profile.brand_name}
INDUSTRY: ${profile.industry}

BRAND VOICE PROFILE:
Personality words: ${JSON.stringify(profile.brand_personality_words || [])}
Off-brand words to avoid: ${JSON.stringify(profile.brand_off_brand_words || [])}
Brand person description: ${profile.brand_person_description || ''}
Example of good brand copy: ${profile.brand_voice_examples?.[0]?.good || ''}
Example of bad brand copy: ${profile.brand_voice_examples?.[0]?.bad || ''}
Brand mission: ${profile.brand_mission || ''}
Brand owned phrases: ${JSON.stringify(profile.brand_owned_phrases || [])}
Phrases to avoid: ${JSON.stringify(profile.brand_cringe_phrases || [])}

COPY TO REWRITE:
"${inputText}"

Rewrite this copy to perfectly match the brand voice above.

Rules:
- Keep the same meaning and intent
- Match the personality words exactly
- Use language the target audience actually uses
- Never use the off-brand words
- Keep similar length — don't pad it
- Make it sound authentically Indian if that fits the brand

Return ONLY this JSON, no other text:
{
  "rewritten": "The rewritten copy",
  "voice_score": 7,
  "changes_made": ["one line describing each key change"],
  "why_better": "One sentence explaining the main improvement"
}`;

    const response = await callClaude({
      model: 'claude-sonnet-4-0',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find(b => b.type === 'text')?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 });

    const result = JSON.parse(jsonMatch[0]);

    // Update usage count
    await updateBrandProfile(brandName, {
      voice_check_count: currentCount + 1,
      voice_check_date: today,
    });

    return NextResponse.json({
      ...result,
      usage: { count: currentCount + 1, limit: 10 },
    });
  } catch (err) {
    console.error('voice-check error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
