import { NextResponse } from 'next/server';
import { createSharedReport } from '@/lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();

    const report = await createSharedReport({
      brandName:   body.brandName,
      industry:    body.industry,
      scoreData:   body.scoreData,
      intakeData:  body.intakeData,
      scrapedData: body.scrapedData,
      createdBy:   body.createdBy || 'results_page',
    });

    if (!report) {
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${appUrl}/report/${report.share_token}`;

    return NextResponse.json({ success: true, shareToken: report.share_token, shareUrl, report });
  } catch (err) {
    console.error('Share create error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
