import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getAuthedUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Ensure the authenticated user is allowed to read/write the brand row.
// Returns the resolved row id on success, or a NextResponse error.
async function authorizeBrand(brandName, userId) {
  const { data: row, error } = await supabaseAdmin
    .from('brand_profiles')
    .select('id, owner_user_id')
    .ilike('brand_name', brandName)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  }
  if (!row) {
    return { error: NextResponse.json({ error: 'Profile not found: ' + brandName }, { status: 404 }) };
  }
  // Unowned rows (created via pre-auth audit) can be claimed by the current user.
  if (row.owner_user_id && row.owner_user_id !== userId) {
    return {
      error: NextResponse.json(
        { error: 'forbidden', message: 'This brand belongs to a different account.' },
        { status: 403 }
      ),
    };
  }
  return { row };
}

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

    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const auth = await authorizeBrand(brandName, user.id);
    if (auth.error) return auth.error;

    const updateData = {
      c_current_step: step,
      updated_at: new Date().toISOString(),
    };

    // If this row was created unowned (pre-auth audit), claim it for the
    // current user so future ownership checks pass.
    if (!auth.row.owner_user_id) {
      updateData.owner_user_id = user.id;
    }

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
