import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
  const { brandName, updates } = await request.json();
  if (!brandName) return NextResponse.json({ error: 'brandName required' }, { status: 400 });

  console.log('Constitution save request:', {
    brandName,
    fieldsToSave: Object.keys(updates),
    sampleValues: {
      brand_personality_words: updates.brand_personality_words,
      brand_best_customer: updates.brand_best_customer?.slice?.(0, 50),
    },
  });

  try {
    const { data, error } = await supabaseAdmin
      .from('brand_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .ilike('brand_name', brandName)
      .select();

    console.log('Constitution save result:', {
      error: error?.message,
      updatedRows: data?.length,
      matched: data?.length > 0 ? 'yes' : 'no rows matched',
    });

    if (error) throw error;
    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Constitution save error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
