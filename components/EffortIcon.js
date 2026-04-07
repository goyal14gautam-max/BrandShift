'use client';

export default function EffortIcon({ effort, size = 32 }) {
  if (effort === 'quick') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32">
        <polygon
          points="18,2 10,18 16,18 14,30 22,14 16,14"
          fill="none"
          stroke="#E8A030"
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.6"
        />
      </svg>
    );
  }

  if (effort === 'medium') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32">
        <path
          d="M20 4 C20 4 24 8 22 12 L12 22 C10 24 8 24 6 22 C4 20 4 18 6 16 L16 6 C18 4 20 4 20 4Z"
          fill="none"
          stroke="#7C5CBF"
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.6"
        />
        <circle cx="9" cy="22" r="2" fill="#7C5CBF" opacity="0.4" />
      </svg>
    );
  }

  if (effort === 'project') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32">
        <rect x="4" y="4" width="24" height="24" rx="2"
          fill="none" stroke="#2EC4A0" strokeWidth="1.5" opacity="0.4" />
        <line x1="4" y1="12" x2="28" y2="12" stroke="#2EC4A0" strokeWidth="1" opacity="0.3" />
        <line x1="4" y1="20" x2="28" y2="20" stroke="#2EC4A0" strokeWidth="1" opacity="0.3" />
        <line x1="12" y1="4" x2="12" y2="28" stroke="#2EC4A0" strokeWidth="1" opacity="0.3" />
        <line x1="20" y1="4" x2="20" y2="28" stroke="#2EC4A0" strokeWidth="1" opacity="0.3" />
      </svg>
    );
  }

  return null;
}
