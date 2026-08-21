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

    const month = new Date().toLocaleString('en-IN', { month: 'long' });
    const todayFull = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    const currentTask = profile.tasks?.find(t => t.week === profile.current_week && t.status === 'todo')?.task || '';
    const roadmapTheme = profile.current_roadmap?.two_months?.theme || '';

    const prompt = `Generate one specific content idea for this Indian brand.

Brand: ${profile.brand_name}
Industry: ${profile.industry}
Target audience: ${profile.target_audience || ''}
Brand personality: ${JSON.stringify(profile.brand_personality_words || [])}
Brand mission: ${profile.brand_mission || ''}
Current roadmap theme: ${roadmapTheme}
Current week focus: ${currentTask}
Today's date: ${todayFull}

Indian cultural context this week (use if relevant to this brand):
- IPL season (March-May)
- Summer heat (April-June)
- Board exam results (May-June)
- Monsoon (July-September)
- Festive prep (September onwards)
- Current month: ${month}

Generate ONE specific, actionable content idea that:
1. Matches this brand's voice exactly
2. References a current Indian cultural moment if relevant
3. Specifies the format (Reel, Carousel, Story, Post)
4. Is ready to brief a content creator with

Return ONLY this JSON, no other text:
{
  "idea": "The specific content idea in 2-3 sentences. Be specific — include the hook, the content, and the angle.",
  "format": "Reel",
  "theme": "Educational",
  "why": "One sentence on why this works for this brand right now",
  "hook": "The opening line or visual hook to grab attention"
}`;

    const response = await callClaude({
      model: 'claude-sonnet-5',
      max_tokens: 500,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find(b => b.type === 'text')?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 });

    const idea = JSON.parse(jsonMatch[0]);
    idea.generated_at = new Date().toISOString();

    try {
      await updateBrandProfile(brandName, { latest_content_idea: idea });
    } catch (saveErr) {
      console.error('content-idea save error (column may not exist yet):', saveErr.message);
    }

    return NextResponse.json({ idea });
  } catch (err) {
    console.error('content-idea error:', err.message, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
