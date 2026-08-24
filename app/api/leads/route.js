import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireOwner } from '@/lib/requireOwner';

export async function GET() {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('quick_audit_leads')
    .select('id, brand_name, website_url, instagram_handle, score, source, contacted, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Leads fetch error:', error.message);
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 });
  }

  return NextResponse.json({ leads: data || [] });
}
