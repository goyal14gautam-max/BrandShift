import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const origin = requestUrl.origin;

  console.log('Auth callback hit');
  console.log('Code exists:', !!code);
  console.log('Next param:', next);
  console.log('Origin:', origin);

  if (!code) {
    console.log('No code — redirecting to login');
    return NextResponse.redirect(new URL('/login?error=no_code', origin));
  }

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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log('Exchange result:', error ? error.message : 'success');
    console.log('User:', data?.user?.email);

    if (error) {
      console.error('Exchange error:', error);
      return NextResponse.redirect(new URL('/login?error=exchange_failed', origin));
    }

    if (!data.user) {
      return NextResponse.redirect(new URL('/login?error=no_user', origin));
    }

    // Get the account for this user
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('id, onboarding_completed, primary_brand')
      .eq('user_id', data.user.id)
      .single();

    console.log('Account found:', account?.id);
    console.log('Primary brand:', account?.primary_brand);

    // If account has no primary brand, claim the most recent unowned profile
    if (account && !account.primary_brand) {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      const { data: recentProfile } = await supabaseAdmin
        .from('brand_profiles')
        .select('id, brand_name')
        .is('owner_user_id', null)
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      console.log('Recent unowned profile:', recentProfile?.brand_name);

      if (recentProfile) {
        // Claim the profile
        await supabaseAdmin
          .from('brand_profiles')
          .update({ owner_user_id: data.user.id })
          .eq('id', recentProfile.id);

        // Set as primary brand on account
        await supabaseAdmin
          .from('accounts')
          .update({ primary_brand: recentProfile.brand_name })
          .eq('user_id', data.user.id);

        // Create brand membership
        await supabaseAdmin
          .from('brand_memberships')
          .upsert({
            account_id: account.id,
            brand_profile_id: recentProfile.id,
            role: 'owner',
            is_active: true,
          }, { onConflict: 'account_id,brand_profile_id' });

        console.log('Brand associated:', recentProfile.brand_name);

        // New user who just got their brand — go to dashboard
        return NextResponse.redirect(new URL('/dashboard', origin));
      }

      // New user with no brand at all — go to constitution
      if (!account.onboarding_completed) {
        return NextResponse.redirect(new URL('/constitution', origin));
      }
    }

    // Everyone else goes to dashboard
    return NextResponse.redirect(new URL('/dashboard', origin));

  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect(new URL('/login?error=callback_failed', origin));
  }
}
