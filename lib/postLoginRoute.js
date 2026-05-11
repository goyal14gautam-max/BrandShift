/**
 * Single source of truth for post-auth routing.
 * Every auth event (callback, login submit, landing-page "Go to Dashboard")
 * must use this function. No other redirect logic anywhere.
 */
export function getPostLoginDestination(account, profile) {
  // New user — no brand yet
  if (!account?.primary_brand) {
    return '/audit';
  }

  // Has brand but no roadmap — send to results where they can generate one
  if (!profile?.current_roadmap) {
    return '/results';
  }

  // Has roadmap — go to dashboard
  return '/dashboard';
}
