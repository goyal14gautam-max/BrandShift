import { NextResponse } from 'next/server';
import { getBrandProfileAdmin, updateBrandProfile } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { brandName } = await request.json();

    const profile = await getBrandProfileAdmin(brandName);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const currentWeek = profile.current_week || 1;
    const tasks       = profile.tasks || [];

    const weekTasks = tasks.filter(t => t.week === currentWeek);

    if (weekTasks.length === 0) {
      return NextResponse.json({ advanced: false, reason: 'no tasks for current week' });
    }

    const allDone = weekTasks.every(t => t.status === 'done');

    if (!allDone) {
      return NextResponse.json({ advanced: false });
    }

    const newWeek = currentWeek + 1;
    await updateBrandProfile(brandName, { current_week: newWeek });

    console.log(`Week advanced for ${brandName}: ${currentWeek} → ${newWeek}`);

    return NextResponse.json({ advanced: true, newWeek });

  } catch (err) {
    console.error('update-week error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
