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

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Recovery: account exists but has no primary_brand — check for owned profiles
    if (account && !account.primary_brand) {
      const { data: ownedProfile } = await supabaseAdmin
        .from('brand_profiles')
        .select('brand_name')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (ownedProfile) {
        await supabaseAdmin
          .from('accounts')
          .update({ primary_brand: ownedProfile.brand_name })
          .eq('user_id', user.id);

        account.primary_brand = ownedProfile.brand_name;
        console.log('Recovered primary brand:', ownedProfile.brand_name);
      }
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      account,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
