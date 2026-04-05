'use client';

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

function buildRadarData(brandData, competitorData) {
  const dims = [
    { dimension: 'Visual Identity',   short: 'Visual',      key: 'visual_identity' },
    { dimension: 'Brand Voice',       short: 'Voice',       key: 'tone_voice' },
    { dimension: 'Trend Relevance',   short: 'Trends',      key: 'trend_relevance' },
    { dimension: 'Competitor Gap',    short: 'Positioning', key: 'competitor_positioning' },
    { dimension: 'Audience Fit',      short: 'Audience',    key: 'audience_alignment' },
  ];

  return dims.map(d => ({
    dimension: d.dimension,
    short:     d.short,
    brand:     brandData?.[d.key]?.score ?? 0,
    competitor: competitorData?.[d.key] ?? null,
    fullMark:  100,
  }));
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const entry  = payload[0]?.payload;
  const brand  = payload.find(p => p.dataKey === 'brand');
  const comp   = payload.find(p => p.dataKey === 'competitor');
  const gap    = brand && comp ? brand.value - comp.value : null;

  return (
    <div style={{
      background: '#15152A',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '12px 16px',
      minWidth: 160,
    }}>
      <p style={{ fontFamily: 'sans-serif', fontSize: 12, color: '#8A87A8', marginBottom: 8 }}>
        {entry?.dimension}
      </p>
      {brand && (
        <p style={{ fontFamily: 'monospace', fontSize: 16, color: '#7C5CBF', marginBottom: 4 }}>
          {brand.name}: {brand.value}
        </p>
      )}
      {comp && (
        <p style={{ fontFamily: 'monospace', fontSize: 14, color: '#E8622A', marginBottom: 4 }}>
          {comp.name}: {comp.value}
        </p>
      )}
      {gap !== null && (
        <p style={{ fontFamily: 'monospace', fontSize: 12, color: gap >= 0 ? '#2EC4A0' : '#E8622A' }}>
          Gap: {gap >= 0 ? '+' : ''}{gap}
        </p>
      )}
    </div>
  );
}

function CustomLegend({ brandName, competitorName }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="24" height="2">
          <line x1="0" y1="1" x2="24" y2="1" stroke="#7C5CBF" strokeWidth="2" />
        </svg>
        <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: '#8A87A8' }}>{brandName}</span>
      </div>
      {competitorName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="24" height="2">
            <line x1="0" y1="1" x2="24" y2="1" stroke="#E8622A" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
          <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: '#8A87A8' }}>{competitorName}</span>
        </div>
      )}
    </div>
  );
}

export default function BrandRadarChart({
  brandData,
  brandName,
  competitorName,
  competitorData,
  dataConfidence,
}) {
  const data = buildRadarData(brandData, competitorData);
  const hasCompetitor = competitorName && competitorData;

  const confidenceLower = (dataConfidence || '').toLowerCase();
  let confidenceNote = null;
  if (confidenceLower.includes('medium')) {
    confidenceNote = 'Chart accuracy improves with more data sources. Connect Instagram for a more complete picture.';
  } else if (confidenceLower.includes('low')) {
    confidenceNote = 'Chart accuracy improves with more data sources. Re-run audit with website URL and Instagram handle for accurate scores.';
  }

  return (
    <div>
      {/* Desktop: 420px, Mobile: 300px via CSS */}
      <div className="radarWrap">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis
              dataKey="short"
              tick={{ fill: '#8A87A8', fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tickCount={5}
              tick={{ fill: '#4A4868', fontSize: 10 }}
              axisLine={false}
            />

            <Radar
              name={brandName}
              dataKey="brand"
              stroke="#7C5CBF"
              fill="#7C5CBF"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationBegin={300}
              animationDuration={1200}
              animationEasing="ease-out"
            />

            {hasCompetitor && (
              <Radar
                name={competitorName}
                dataKey="competitor"
                stroke="#E8622A"
                fill="#E8622A"
                fillOpacity={0.08}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={true}
                animationBegin={300}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            )}

            <Tooltip content={<CustomTooltip />} />
            <Legend content={() => <CustomLegend brandName={brandName} competitorName={hasCompetitor ? competitorName : null} />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {confidenceNote && (
        <p style={{
          fontFamily: 'sans-serif',
          fontSize: 12,
          color: '#4A4868',
          textAlign: 'center',
          marginTop: 16,
        }}>
          {confidenceNote}
        </p>
      )}

      <style jsx>{`
        .radarWrap {
          width: 100%;
          height: 420px;
        }
        @media (max-width: 768px) {
          .radarWrap {
            height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
