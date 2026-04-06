import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

    // Check if new user needs onboarding
    const { data: account } = await supabase
      .from('accounts')
      .select('onboarding_completed, primary_brand')
      .eq('user_id', data.user.id)
      .single();

    console.log('Account:', account);

    // New user with no brand — go to constitution
    if (account && !account.onboarding_completed && !account.primary_brand) {
      return NextResponse.redirect(new URL('/constitution', origin));
    }

    // Everyone else goes to dashboard
    return NextResponse.redirect(new URL('/dashboard', origin));

  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect(new URL('/login?error=callback_failed', origin));
  }
}
