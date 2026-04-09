import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandName = searchParams.get('brand');

    if (!brandName) {
      return NextResponse.json({ error: 'No brand name' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('brand_profiles')
      .select(`
        brand_name,
        c_personality_words,
        c_off_brand_words,
        c_best_customer,
        c_refuses_to,
        c_5_year_vision,
        c_origin_story,
        c_person_description,
        c_owned_phrases,
        c_cringe_phrases,
        c_not_for,
        c_competitive_edge,
        c_mission,
        c_current_step,
        c_completed,
        c_bible_content,
        c_bible_generated_at
      `)
      .ilike('brand_name', brandName)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
