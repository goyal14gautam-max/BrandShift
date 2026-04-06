'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';

export default function AnalyticsProvider({ children }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  return children;
}
