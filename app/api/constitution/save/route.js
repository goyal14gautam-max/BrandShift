import { NextResponse } from 'next/server';
import { updateBrandProfile } from '@/lib/supabase';

export async function POST(request) {
  const { brandName, updates } = await request.json();
  if (!brandName) return NextResponse.json({ error: 'brandName required' }, { status: 400 });
  try {
    await updateBrandProfile(brandName, updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Constitution save error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
