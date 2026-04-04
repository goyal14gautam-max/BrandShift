/**
 * Converts the two_months.actions array from a roadmap into
 * a flat tasks array for brand_profiles.tasks
 */
export function flattenRoadmapToTasks(roadmap) {
  const actions = roadmap?.two_months?.actions ?? [];
  return actions.map(action => ({
    week:          action.week,
    task:          action.task,
    effort:        action.effort || 'medium',
    why:           action.why,
    status:        'todo',
    completed_at:  null,
    exit_interview: null,
  }));
}
