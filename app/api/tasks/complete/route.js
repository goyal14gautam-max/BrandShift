import { NextResponse } from 'next/server';
import { getBrandProfileAdmin, updateBrandProfile, saveTaskHistory } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { brandName, taskId, taskIndex, did_it, what_happened, what_differently } =
      await request.json();

    const profile = await getBrandProfileAdmin(brandName);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const updatedTasks = [...(profile.tasks || [])];
    const taskIdx = taskIndex ?? updatedTasks.findIndex(t => t.id === taskId);

    if (taskIdx === -1 || taskIdx >= updatedTasks.length) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const resultSignal =
      did_it === 'Yes'       ? 'positive' :
      did_it === 'Partially' ? 'neutral'  : 'negative';

    updatedTasks[taskIdx] = {
      ...updatedTasks[taskIdx],
      status:       'done',
      completed_at: new Date().toISOString(),
      exit_interview: {
        did_it,
        what_happened:    what_happened    || '',
        what_differently: what_differently || '',
        result_signal:    resultSignal,
        recorded_at:      new Date().toISOString(),
      },
    };

    // Calculate streak
    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastPulse = profile.last_pulse_date;
    let newStreak   = profile.pulse_streak || 0;

    if (lastPulse === yesterday || lastPulse === today) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }

    await updateBrandProfile(brandName, {
      tasks:           updatedTasks,
      pulse_streak:    newStreak,
      last_pulse_date: today,
    });

    await saveTaskHistory({
      brand_name:       brandName,
      task_id:          updatedTasks[taskIdx].id,
      task_text:        updatedTasks[taskIdx].task,
      week:             updatedTasks[taskIdx].week,
      effort:           updatedTasks[taskIdx].effort,
      did_it,
      what_happened:    what_happened    || '',
      what_differently: what_differently || '',
      result_signal:    resultSignal,
      completed_at:     new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      newStreak,
      updatedTask: updatedTasks[taskIdx],
    });

  } catch (err) {
    console.error('Task complete error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
