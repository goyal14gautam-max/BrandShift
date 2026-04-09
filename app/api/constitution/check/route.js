import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const brandName = searchParams.get('brand');

  if (!brandName) {
    return NextResponse.json({ error: 'No brand name' });
  }

  const { data, error } = await supabaseAdmin
    .from('brand_profiles')
    .select(`
      brand_name,
      brand_personality_words,
      brand_off_brand_words,
      brand_best_customer,
      brand_refuses_to,
      brand_5_year_association,
      brand_origin_story,
      brand_person_description,
      brand_mission,
      constitution_completed,
      updated_at
    `)
    .ilike('brand_name', brandName)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, brandName });
  }

  const fields = {
    brand_personality_words: data?.brand_personality_words,
    brand_off_brand_words:   data?.brand_off_brand_words,
    brand_best_customer:     data?.brand_best_customer,
    brand_refuses_to:        data?.brand_refuses_to,
    brand_5_year_association: data?.brand_5_year_association,
    brand_origin_story:      data?.brand_origin_story,
    brand_person_description: data?.brand_person_description,
    brand_mission:           data?.brand_mission,
  };

  const answeredCount = Object.entries(fields).filter(([, val]) => {
    if (Array.isArray(val)) return val.length > 0;
    return val && val.toString().trim().length > 3;
  }).length;

  return NextResponse.json({
    brandName,
    exists: !!data,
    answeredCount,
    fields,
    constitution_completed: data?.constitution_completed,
    last_updated: data?.updated_at,
  });
}
