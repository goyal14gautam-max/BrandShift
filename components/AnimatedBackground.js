'use client';

import { Player } from '@lottiefiles/react-lottie-player';
import { useRef, useState, useEffect } from 'react';

export default function AnimatedBackground({ src, opacity = 0.07, speed = 0.5, blur = false }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPrefersReduced(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  if (prefersReduced) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        borderRadius: 'inherit',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {isVisible && (
        <div style={{
          position: 'absolute',
          inset: '-20%',
          opacity,
          filter: blur ? 'blur(2px)' : 'none',
        }}>
          <Player
            autoplay
            loop
            src={src}
            speed={speed}
            style={{ width: '140%', height: '140%' }}
            rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
          />
        </div>
      )}
    </div>
  );
}
