import { runPreFlightCheck } from '@/lib/preflightEngine';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { brandName, campaign } = await request.json();

    if (!brandName || !campaign) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!campaign.description || campaign.description.length < 30) {
      return NextResponse.json({ error: 'Campaign description too short \u2014 add at least 30 characters' }, { status: 400 });
    }
    if (!campaign.objective) {
      return NextResponse.json({ error: 'Campaign objective required' }, { status: 400 });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('brand_profiles')
      .select('*')
      .ilike('brand_name', brandName)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Brand profile not found' }, { status: 404 });
    }

    const result = await runPreFlightCheck(campaign, profile);

    // Save to history
    const history = profile.campaign_preflight_history || [];
    try {
      await supabaseAdmin
        .from('brand_profiles')
        .update({
          campaign_preflight_history: [
            ...history.slice(-9),
            {
              id: `pf_${Date.now()}`,
              campaignName: campaign.name,
              objective: campaign.objective,
              score: result.overallScore,
              recommendation: result.recommendation,
              scoredAt: result.scoredAt,
            },
          ],
        })
        .ilike('brand_name', brandName);
    } catch (saveErr) {
      console.error('Preflight history save error:', saveErr.message);
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('Preflight error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
