import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
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
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find the user's primary brand
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('primary_brand')
      .eq('user_id', user.id)
      .single();

    if (!account?.primary_brand) {
      return NextResponse.json({ reports: [] });
    }

    const { data: reports } = await supabaseAdmin
      .from('shared_reports')
      .select('id, share_token, brand_name, score_data, created_at, viewed_at, view_count, is_active')
      .ilike('brand_name', account.primary_brand)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ reports: reports || [] });
  } catch (err) {
    console.error('Share list error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
