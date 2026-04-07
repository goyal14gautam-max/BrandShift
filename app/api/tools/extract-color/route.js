import { NextResponse } from 'next/server';
import { updateBrandProfile } from '@/lib/supabase';

export const maxDuration = 30;

export async function POST(request) {
  try {
    const { websiteUrl, brandName } = await request.json();
    if (!websiteUrl) return NextResponse.json({ error: 'No URL' }, { status: 400 });

    let color = '#7C5CBF';

    try {
      // Dynamically import node-vibrant (server only)
      const Vibrant = (await import('node-vibrant')).default;
      const faviconUrl = new URL(websiteUrl).origin + '/favicon.ico';
      const palette = await Vibrant.from(faviconUrl).getPalette();
      color =
        palette.Vibrant?.hex ||
        palette.Muted?.hex ||
        palette.DarkVibrant?.hex ||
        '#7C5CBF';
    } catch {
      // Vibrant not available or favicon unreachable — use default
    }

    if (brandName) {
      try {
        await updateBrandProfile(brandName, { brand_color: color });
      } catch { /* column may not exist yet */ }
    }

    return NextResponse.json({ color });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
