'use client';

import Image from 'next/image';

const SIZES = {
  sm: { img: 20, text: '16px' },
  md: { img: 24, text: '20px' },
  lg: { img: 32, text: '28px' },
};

export default function Logo({ size = 'md', showText = true, onClick }) {
  const { img, text } = SIZES[size] || SIZES.md;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
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
          fontFamily: 'var(--font-headline)',
          fontSize: text,
          color: 'var(--bs-text-primary)',
          letterSpacing: '-0.3px',
          fontWeight: 400,
        }}>
          BrandShift
        </span>
      )}
    </div>
  );
}
