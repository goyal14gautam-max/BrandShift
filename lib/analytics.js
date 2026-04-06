import posthog from 'posthog-js';

export function initAnalytics() {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.debug();
      }
    },
  });
}

export function trackEvent(eventName, properties = {}) {
  if (typeof window === 'undefined') return;
  try {
    posthog.capture(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  } catch (err) {
    console.error('Analytics error:', err);
  }
}

export function identifyUser(userId, properties = {}) {
  if (typeof window === 'undefined') return;
  try {
    posthog.identify(userId, properties);
  } catch (err) {
    console.error('Analytics identify:', err);
  }
}

export function trackPageView(pageName) {
  if (typeof window === 'undefined') return;
  try {
    posthog.capture('$pageview', {
      page: pageName,
      url: window.location.href,
    });
  } catch (err) {
    console.error('Analytics pageview:', err);
  }
}
