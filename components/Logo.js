'use client';

import Image from 'next/image';

const SIZES = {
  sm: { img: 30, text: '24px' },
  md: { img: 36, text: '30px' },
  lg: { img: 48, text: '42px' },
};

export default function Logo({ size = 'md', showText = true, onClick }) {
  const { img, text } = SIZES[size] || SIZES.md;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: onClick ? 'pointer' : 'default',
        textDecoration: 'none',
      }}
    >
      <Image
        src="/logo.png"
        alt="BrandShift"
        height={img}
        width={img * 1.2}
        style={{ objectFit: 'contain' }}
        priority
      />
      {showText && (
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: text,
          color: 'var(--bs-text-primary)',
          letterSpacing: '0.12em',
          fontWeight: 700,
          fontStretch: 'expanded',
          textTransform: 'uppercase',
        }}>
          BrandShift
        </span>
      )}
    </div>
  );
}
