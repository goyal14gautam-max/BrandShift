import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const FIELD_MAP = {
  personalityWords:  'c_personality_words',
  offBrandWords:     'c_off_brand_words',
  bestCustomer:      'c_best_customer',
  refusesTo:         'c_refuses_to',
  fiveYearVision:    'c_5_year_vision',
  originStory:       'c_origin_story',
  personDescription: 'c_person_description',
  ownedPhrases:      'c_owned_phrases',
  cringePhrases:     'c_cringe_phrases',
  notFor:            'c_not_for',
  competitiveEdge:   'c_competitive_edge',
  mission:           'c_mission',
};

// Mirror new c_* answer keys to the legacy brand_* columns that the scoring
// route, voice-check, content-idea, and trend-fit tools still read.
const LEGACY_MIRROR = {
  personalityWords:  'brand_personality_words',
  offBrandWords:     'brand_off_brand_words',
  bestCustomer:      'brand_best_customer',
  refusesTo:         'brand_refuses_to',
  personDescription: 'brand_person_description',
  mission:           'brand_mission',
  ownedPhrases:      'brand_owned_phrases',
  cringePhrases:     'brand_cringe_phrases',
  originStory:       'brand_origin_story',
  fiveYearVision:    'brand_5_year_association',
};

export async function POST(request) {
  try {
    const { brandName, step, answers } = await request.json();

    console.log('Constitution save called');
    console.log('Brand:', brandName);
    console.log('Step:', step);
    console.log('Answers:', JSON.stringify(answers));

    if (!brandName) {
      return NextResponse.json({ error: 'No brand name provided' }, { status: 400 });
    }

    const updateData = {
      c_current_step: step,
      updated_at: new Date().toISOString(),
    };

    Object.entries(FIELD_MAP).forEach(([formKey, dbKey]) => {
      if (answers[formKey] !== undefined) {
        updateData[dbKey] = answers[formKey];
      }
    });

    // Mirror non-empty answers to the legacy brand_* columns
    Object.entries(LEGACY_MIRROR).forEach(([formKey, legacyKey]) => {
      const val = answers[formKey];
      if (val === undefined) return;
      const hasValue = Array.isArray(val)
        ? val.length > 0
        : typeof val === 'string' && val.trim().length > 0;
      if (hasValue) {
        updateData[legacyKey] = val;
      }
    });

    console.log('Update data:', updateData);

    const { data, error } = await supabaseAdmin
      .from('brand_profiles')
      .update(updateData)
      .ilike('brand_name', brandName)
      .select('brand_name, c_current_step');

    console.log('Supabase response:', {
      data,
      error: error?.message,
      rowsUpdated: data?.length,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found. No rows matched brand: ' + brandName },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, step, rowsUpdated: data.length });
  } catch (err) {
    console.error('Constitution save error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
