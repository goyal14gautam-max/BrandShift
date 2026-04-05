import { NextResponse } from 'next/server';
import { getBrandProfile } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandName = searchParams.get('brandName');

    if (!brandName) {
      return NextResponse.json({ error: 'no_brand' }, { status: 400 });
    }

    const data = await getBrandProfile(brandName);

    if (!data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Profile fetch error:', err.message);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
