import { NextResponse } from 'next/server';
import { getSharedReport } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const report = await getSharedReport(params.token);

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, report });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
