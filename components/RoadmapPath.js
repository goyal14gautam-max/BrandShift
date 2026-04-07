'use client';

const POSITIONS = [
  { x: 30, y: 20 }, { x: 70, y: 60 },
  { x: 30, y: 100 }, { x: 70, y: 140 },
  { x: 30, y: 180 }, { x: 70, y: 220 },
  { x: 30, y: 260 }, { x: 70, y: 300 },
];

function buildPath(positions) {
  return positions.reduce((acc, pos, i) => {
    if (i === 0) return `M ${pos.x} ${pos.y}`;
    const prev = positions[i - 1];
    const cpY = (prev.y + pos.y) / 2;
    return acc + ` Q ${prev.x} ${cpY} ${pos.x} ${pos.y}`;
  }, '');
}

const PATH_D = buildPath(POSITIONS);
const TOTAL_LEN = 400;

export default function RoadmapPath({ currentWeek, tasks = [], totalWeeks = 8 }) {
  const completedFraction = Math.max(0, (currentWeek - 1) / totalWeeks);
  const filledLen = completedFraction * TOTAL_LEN;

  return (
    <svg width="100%" viewBox="0 0 100 320" style={{ overflow: 'visible' }}>
      {/* Dashed background path */}
      <path d={PATH_D} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeDasharray="4 4" />

      {/* Completed solid path */}
      <path
        d={PATH_D}
        fill="none"
        stroke="#2EC4A0"
        strokeWidth="2"
        strokeDasharray={`${filledLen} ${TOTAL_LEN}`}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />

      {POSITIONS.map((pos, i) => {
        const week = i + 1;
        const isDone    = week < currentWeek;
        const isCurrent = week === currentWeek;

        return (
          <g key={week}>
            {isCurrent && (
              <circle cx={pos.x} cy={pos.y} r={14}
                fill="rgba(124,92,191,0.2)"
                style={{ animation: 'rp-pulse 2s ease-in-out infinite' }}
              />
            )}
            <circle
              cx={pos.x} cy={pos.y} r={10}
              fill={isDone ? '#2EC4A0' : isCurrent ? '#7C5CBF' : 'rgba(255,255,255,0.04)'}
              stroke={isDone ? '#2EC4A0' : isCurrent ? '#7C5CBF' : 'rgba(255,255,255,0.12)'}
              strokeWidth={1.5}
            />
            <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={8}
              fontFamily="var(--font-mono)"
              fill={isDone ? '#08080E' : isCurrent ? 'white' : 'rgba(255,255,255,0.3)'}>
              {isDone ? '✓' : week}
            </text>
          </g>
        );
      })}

      <style>{`
        @keyframes rp-pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}
