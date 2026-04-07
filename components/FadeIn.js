'use client';

import { useEffect, useState } from 'react';

export default function FadeIn({ children, delay = 0, duration = 400 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: `opacity ${duration}ms ease, transform ${duration}ms ease`,
    }}>
      {children}
    </div>
  );
}
