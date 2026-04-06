/**
 * Converts the two_months.actions array from a roadmap into
 * a flat tasks array for brand_profiles.tasks
 */
export function flattenRoadmapToTasks(roadmap) {
  const actions = roadmap?.two_months?.actions ?? [];
  const now = Date.now();
  return actions.map((action, index) => ({
    id:             `task_${now}_${index}`,
    week:           action.week,
    task:           action.task,
    effort:         action.effort || 'quick',
    why:            action.why,
    status:         'todo',
    created_at:     new Date().toISOString(),
    completed_at:   null,
    exit_interview: null,
    result_signal:  null,
  }));
}
