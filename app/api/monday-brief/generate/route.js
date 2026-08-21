import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/claudeClient';
import { getBrandProfileAdmin, updateBrandProfile } from '@/lib/supabase';
import { MONDAY_BRIEF_SYSTEM_PROMPT, buildMondayBriefPrompt } from '@/lib/prompts';

export async function POST(request) {
  try {
    const { brandName } = await request.json();

    const profile = await getBrandProfileAdmin(brandName);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Last 5 completed tasks for context
    const completedTasks = (profile.tasks || [])
      .filter(t => t.status === 'done')
      .slice(-5);

    // Score trend
    const scoreHistory = profile.score_history || [];
    const recentScores = scoreHistory.slice(-4).map(s => s.overall_score);
    const scoreTrend =
      recentScores.length > 1
        ? recentScores[recentScores.length - 1] > recentScores[0]
          ? 'improving'
          : 'declining'
        : 'stable';

    const briefPrompt = buildMondayBriefPrompt({
      profile,
      completedTasks,
      scoreTrend,
      recentScores,
    });

    const response = await callClaude({
      model:      'claude-sonnet-5',
      max_tokens: 1000,
      system:     MONDAY_BRIEF_SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: briefPrompt }],
    });

    const rawText = response.content.find(b => b.type === 'text')?.text || '';

    let briefData;
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      briefData = match ? JSON.parse(match[0]) : null;
    } catch {
      console.error('Monday brief JSON parse failed');
      return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
    }

    if (!briefData) {
      return NextResponse.json({ error: 'No brief generated' }, { status: 500 });
    }

    const brief = {
      ...briefData,
      date:        new Date().toISOString(),
      was_opened:  false,
      week_number: profile.current_week || 1,
    };

    const existingBriefs = profile.monday_briefs || [];
    const updatedBriefs  = [...existingBriefs.slice(-11), brief];

    await updateBrandProfile(brandName, { monday_briefs: updatedBriefs });

    console.log('Monday brief generated for:', brandName);

    return NextResponse.json({ success: true, brief });

  } catch (err) {
    console.error('Monday brief error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
