'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

export default function Tooltip({ content, width = 220 }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <Info
        size={12}
        style={{ color: 'var(--bs-text-tertiary)', cursor: 'help', marginLeft: 4, flexShrink: 0 }}
      />
      {visible && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bs-card-light)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontFamily: 'var(--font-ui)',
            fontSize: '12px',
            color: 'var(--bs-text-secondary)',
            lineHeight: 1.5,
            width: `${width}px`,
            zIndex: 100,
            pointerEvents: 'none',
            whiteSpace: 'normal',
            textAlign: 'left',
          }}
        >
          {content}
          {/* Border triangle */}
          <span style={{
            position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(255,255,255,0.15)',
          }} />
          {/* Fill triangle */}
          <span style={{
            position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
            borderTop: '4px solid var(--bs-card-light)',
          }} />
        </span>
      )}
    </span>
  );
}
