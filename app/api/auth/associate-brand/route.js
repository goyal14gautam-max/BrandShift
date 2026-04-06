import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { associateBrandWithUser } from '@/lib/supabase';

export async function POST(request) {
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
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { brandName } = await request.json();
    if (!brandName) return NextResponse.json({ error: 'brandName required' }, { status: 400 });

    const ok = await associateBrandWithUser(brandName, user.id);
    return NextResponse.json({ ok });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
