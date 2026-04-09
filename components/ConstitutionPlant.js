'use client';

export default function ConstitutionPlant({ answered, total = 20 }) {
  const stage =
    answered === 0  ? 'seed' :
    answered <= 5   ? 'seed' :
    answered <= 10  ? 'sprout' :
    answered <= 15  ? 'plant' : 'tree';

  const color    = '#2EC4A0';
  const dimColor = 'rgba(46,196,160,0.3)';

  const stemY2 =
    stage === 'seed'   ? 60 :
    stage === 'sprout' ? 50 :
    stage === 'plant'  ? 40 : 30;

  return (
    <div style={{ textAlign: 'center', padding: '4px 0' }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ margin: '0 auto', display: 'block' }}>
        <ellipse cx="40" cy="72" rx="20" ry="4" fill="rgba(255,255,255,0.06)" />
        <line x1="40" y1="70" x2="40" y2={stemY2} stroke={color} strokeWidth="2" strokeLinecap="round" />

        {stage === 'seed' && (
          <ellipse cx="40" cy="58" rx="5" ry="6" fill={dimColor} stroke={color} strokeWidth="1" />
        )}

        {(stage === 'sprout' || stage === 'plant' || stage === 'tree') && (
          <>
            <path d="M40 55 Q30 45 32 38 Q36 48 40 50" fill={stage === 'sprout' ? dimColor : color} stroke={color} strokeWidth="0.5" />
            <path d="M40 55 Q50 45 48 38 Q44 48 40 50" fill={stage === 'sprout' ? dimColor : color} stroke={color} strokeWidth="0.5" />
          </>
        )}

        {(stage === 'plant' || stage === 'tree') && (
          <>
            <path d="M40 45 Q26 38 28 28 Q34 38 40 40" fill={color} stroke={color} strokeWidth="0.5" opacity="0.8" />
            <path d="M40 45 Q54 38 52 28 Q46 38 40 40" fill={color} stroke={color} strokeWidth="0.5" opacity="0.8" />
          </>
        )}

        {stage === 'tree' && (
          <>
            <circle cx="40" cy="22" r="14" fill="rgba(46,196,160,0.2)" stroke={color} strokeWidth="1" />
            <circle cx="32" cy="26" r="8"  fill="rgba(46,196,160,0.25)" stroke={color} strokeWidth="0.5" />
            <circle cx="48" cy="26" r="8"  fill="rgba(46,196,160,0.25)" stroke={color} strokeWidth="0.5" />
            {[[38,16],[44,18],[36,22],[42,24]].map(([x,y], i) => (
              <circle key={i} cx={x} cy={y} r={1.5} fill="#E8A030" opacity="0.8" />
            ))}
          </>
        )}
      </svg>

      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(46,196,160,0.7)', marginTop: 4 }}>
        {stage === 'seed'   && 'Just planted'}
        {stage === 'sprout' && 'Taking root'}
        {stage === 'plant'  && 'Growing strong'}
        {stage === 'tree'   && 'Fully grown ✓'}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
        {answered}/{total} answered
      </div>
    </div>
  );
}
