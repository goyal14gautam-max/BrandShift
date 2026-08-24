import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireOwner } from '@/lib/requireOwner';

export async function POST(request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, contacted, notes } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'Lead id required' }, { status: 400 });
  }

  const updates = {};
  if (contacted !== undefined) updates.contacted = contacted;
  if (notes !== undefined) updates.notes = notes;

  const { error } = await supabaseAdmin
    .from('quick_audit_leads')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Lead update error:', error.message);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
