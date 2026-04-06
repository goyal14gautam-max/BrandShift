import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin, getAccountByUserId } from '@/lib/supabase';

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

    console.log('Associating brand:', brandName, 'with user:', user.id);

    // Find the brand profile
    const { data: profile } = await supabaseAdmin
      .from('brand_profiles')
      .select('id, brand_name, owner_user_id')
      .ilike('brand_name', brandName)
      .single();

    if (!profile) {
      console.log('Brand profile not found:', brandName);
      return NextResponse.json({ error: 'Brand profile not found' }, { status: 404 });
    }

    console.log('Profile found:', profile.id, 'Current owner:', profile.owner_user_id);

    // Get account
    const account = await getAccountByUserId(user.id);
    if (!account) {
      console.log('Account not found for:', user.id);
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    console.log('Account found:', account.id, 'Current primary_brand:', account.primary_brand);

    // Claim the profile if unowned
    if (!profile.owner_user_id) {
      await supabaseAdmin
        .from('brand_profiles')
        .update({ owner_user_id: user.id })
        .eq('id', profile.id);
    }

    // Set primary brand on account if not already set
    if (!account.primary_brand) {
      await supabaseAdmin
        .from('accounts')
        .update({ primary_brand: brandName, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      console.log('Primary brand set:', brandName);
    }

    // Create or update brand membership
    await supabaseAdmin
      .from('brand_memberships')
      .upsert({
        account_id: account.id,
        brand_profile_id: profile.id,
        role: 'owner',
        is_active: true,
      }, { onConflict: 'account_id,brand_profile_id' });

    console.log('Membership created/updated');

    return NextResponse.json({
      success: true,
      brandName,
      primaryBrand: account.primary_brand || brandName,
    });

  } catch (err) {
    console.error('associate-brand error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
