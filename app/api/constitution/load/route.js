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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandName = searchParams.get('brand');

    if (!brandName) {
      return NextResponse.json({ error: 'No brand name' }, { status: 400 });
    }

    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('brand_profiles')
      .select(`
        brand_name,
        owner_user_id,
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

    // Block reads across accounts. Unowned rows (pre-claim) are allowed.
    if (data?.owner_user_id && data.owner_user_id !== user.id) {
      return NextResponse.json(
        { error: 'forbidden', message: 'This brand belongs to a different account.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
