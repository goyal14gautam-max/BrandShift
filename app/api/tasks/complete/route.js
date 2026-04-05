import { NextResponse } from 'next/server';
import { getBrandProfile, updateBrandProfile } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { brandName, taskIndex, did_it, what_happened, what_differently } = await request.json();

    if (!brandName || taskIndex === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const profile = await getBrandProfile(brandName);
    if (!profile) {
      return NextResponse.json({ error: 'Brand profile not found' }, { status: 404 });
    }

    // Update the task
    const tasks = [...(profile.tasks ?? [])];
    if (tasks[taskIndex]) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        status:       'done',
        completed_at: new Date().toISOString(),
        exit_interview: {
          did_it,
          what_happened,
          what_differently,
          result_signal: did_it === 'Yes' ? 'positive' : did_it === 'Partially' ? 'neutral' : 'negative',
        },
      };
    }

    // Update streak
    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const wasYesterday = profile.last_pulse_date === yesterday;
    const newStreak = wasYesterday ? (profile.pulse_streak ?? 0) + 1 : 1;

    const updated = await updateBrandProfile(brandName, {
      tasks,
      pulse_streak:    newStreak,
      last_pulse_date: today,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('tasks/complete error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
