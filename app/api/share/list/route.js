import { NextResponse } from 'next/server';
import { listSharedReports } from '@/lib/supabase';

export async function GET() {
  try {
    const reports = await listSharedReports();
    return NextResponse.json({ success: true, reports });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
