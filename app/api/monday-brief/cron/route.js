import { NextResponse } from 'next/server';
import { getAllProfilesWithRoadmap } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const brands = await getAllProfilesWithRoadmap();

    if (!brands?.length) {
      console.log('Cron: no brands to process');
      return NextResponse.json({ processed: 0 });
    }

    console.log('Cron: generating briefs for', brands.length, 'brands');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://brand-shift-tpea.vercel.app';
    const results = [];

    for (let i = 0; i < brands.length; i += 5) {
      const batch = brands.slice(i, i + 5);

      const batchResults = await Promise.allSettled(
        batch.map(brand =>
          fetch(`${appUrl}/api/monday-brief/generate`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ brandName: brand.brand_name }),
          })
        )
      );

      results.push(...batchResults);

      if (i + 5 < brands.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    console.log('Cron: completed.', succeeded, 'of', brands.length, 'briefs generated');

    return NextResponse.json({ processed: brands.length, succeeded });

  } catch (err) {
    console.error('Cron error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
