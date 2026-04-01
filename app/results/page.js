'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './results.module.css';

const DIM_META = {
  visual_identity:        { label: 'Visual Identity',        weight: 25 },
  tone_voice:             { label: 'Tone & Voice',           weight: 25 },
  trend_relevance:        { label: 'Trend Relevance',        weight: 20 },
  competitor_positioning: { label: 'Competitor Positioning', weight: 20 },
  audience_alignment:     { label: 'Audience Alignment',     weight: 10 },
};

function scoreColor(s) {
  if (s < 40) return 'var(--red)';
  if (s <= 65) return 'var(--amber)';
  return 'var(--green)';
}

function AnimatedRing({ score }) {
  const [displayed, setDisplayed] = useState(0);
  const [progress, setProgress]   = useState(0);
  const R   = 70;
  const circ = 2 * Math.PI * R;

  useEffect(() => {
    // Count-up
    const dur   = 1500;
    const steps = 60;
    let i = 0;
    const id = setInterval(() => {
      i++;
      const t = i / steps;
      setDisplayed(Math.round(score * t));
      setProgress(score * t);
      if (i >= steps) clearInterval(id);
    }, dur / steps);
    return () => clearInterval(id);
  }, [score]);

  const offset = circ - (progress / 100) * circ;
  const color  = scoreColor(score);

  return (
    <div className={styles.ring}>
      <svg viewBox="0 0 160 160" width="180" height="180">
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle cx="80" cy="80" r={R} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
      </svg>
      <div className={styles.ringNumber} style={{ color }}>{displayed}</div>
    </div>
  );
}

export default function Results() {
  const router = useRouter();
  const [score, setScore] = useState(null);
  const [brand, setBrand] = useState(null);

  const [direction, setDirection]     = useState('');
  const [toneDir, setToneDir]         = useState('');
  const [audience, setAudience]       = useState('');
  const [market, setMarket]           = useState('');
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState('');

  useEffect(() => {
    const s = localStorage.getItem('brandshift_score');
    const b = localStorage.getItem('brandshift_brand');
    if (s) setScore(JSON.parse(s));
    if (b) setBrand(JSON.parse(b));
  }, []);

  async function handleRoadmap(e) {
    e.preventDefault();
    setGenError('');
    setGenerating(true);
    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:      brand?.brandName || '',
          industry:       brand?.industry || '',
          scoreData:      score,
          direction,
          toneDirection:  toneDir,
          targetAudience: audience,
          marketFocus:    market,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      localStorage.setItem('brandshift_roadmap', JSON.stringify(data));
      router.push('/roadmap');
    } catch (err) {
      setGenError(err.message || 'Failed to generate roadmap.');
      setGenerating(false);
    }
  }

  if (!score) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'var(--text-muted)' }}>
        No score data found. <a href="/" style={{ color:'var(--accent)', marginLeft:'0.5rem' }}>Start an audit →</a>
      </div>
    );
  }

  const urgencyClass = {
    low:    styles.urgencyLow,
    medium: styles.urgencyMedium,
    high:   styles.urgencyHigh,
  }[score.rebrand_urgency] || styles.urgencyMedium;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>BrandShift</span>
        <span className={styles.badge}>Brand Audit Report</span>
      </header>

      <div className={styles.container}>
        {/* Brand name */}
        <div className={styles.brandTop}>
          <h1 className={styles.brandName}>{brand?.brandName || 'Your Brand'}</h1>
          {brand?.industry && <span className={styles.badge}>{brand.industry}</span>}
        </div>

        {/* Score ring */}
        <div className={styles.scoreSection}>
          <AnimatedRing score={score.overall_score} />
          <p className={styles.verdict}>{score.verdict}</p>
          <div className={styles.badgeRow}>
            <span className={`${styles.urgencyBadge} ${urgencyClass}`}>
              Rebrand Urgency: {score.rebrand_urgency?.toUpperCase()}
            </span>
            {score.data_confidence && (
              <span className={`${styles.urgencyBadge} ${styles['confidence' + score.data_confidence.charAt(0).toUpperCase() + score.data_confidence.slice(1)]}`}>
                Data: {score.data_confidence.toUpperCase()} CONFIDENCE
              </span>
            )}
          </div>
          {score.sources_available && (
            <div className={styles.sourcesRow}>
              {Object.entries(score.sources_available).map(([src, available]) => (
                <span key={src} className={`${styles.sourceChip} ${available ? styles.sourceOn : styles.sourceOff}`}>
                  {available ? '✓' : '✗'} {src}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Dimension cards */}
        <div>
          <h2 className={styles.sectionTitle}>Dimension Breakdown</h2>
          <div className={styles.dimensionGrid}>
            {Object.entries(score.dimensions || {}).map(([key, dim]) => {
              const meta = DIM_META[key] || { label: key.replace(/_/g, ' '), weight: null };
              return (
              <div key={key} className={styles.dimCard}>
                <div className={styles.dimHeader}>
                  <div className={styles.dimNameRow}>
                    <span className={styles.dimName}>{meta.label}</span>
                    {meta.weight && <span className={styles.dimWeight}>{meta.weight}%</span>}
                  </div>
                  <span className={styles.dimScore} style={{ color: scoreColor(dim.score) }}>
                    {dim.score}
                  </span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill}
                    style={{ width: `${dim.score}%`, background: scoreColor(dim.score) }} />
                </div>
                <p className={styles.dimJustification}>{dim.justification}</p>
              </div>
              );
            })}
          </div>
        </div>

        {/* Strength + Gap */}
        <div>
          <h2 className={styles.sectionTitle}>Key Findings</h2>
          <div className={styles.twoCol}>
            <div className={`${styles.highlight} ${styles.highlightGreen}`}>
              <p className={styles.highlightLabel}>Biggest Strength</p>
              <p className={styles.highlightText}>{score.biggest_strength}</p>
            </div>
            <div className={`${styles.highlight} ${styles.highlightRed}`}>
              <p className={styles.highlightLabel}>Biggest Gap</p>
              <p className={styles.highlightText}>{score.biggest_gap}</p>
            </div>
          </div>
        </div>

        {/* Evidence */}
        {score.evidence_quotes?.length > 0 && (
          <div>
            <h2 className={styles.sectionTitle}>What We Found</h2>
            <div className={styles.evidenceGrid}>
              {score.evidence_quotes.map((eq, i) => (
                <div key={i} className={styles.evidenceCard}>
                  <span className={styles.sourcePill}>{eq.source}</span>
                  <p className={styles.evidenceQuote}>"{eq.quote}"</p>
                  <p className={styles.evidenceObservation}>{eq.observation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Direction Input */}
        <div>
          <h2 className={styles.sectionTitle}>Where Do You Want to Take This Brand?</h2>
          <form className={styles.directionBox} onSubmit={handleRoadmap}>
            <div>
              <label className={styles.fieldLabel}>Describe your goal in your own words</label>
              <textarea value={direction} onChange={e => setDirection(e.target.value)}
                placeholder="e.g. We want to rebuild trust with younger consumers and expand to metro cities…" />
            </div>

            <div className={styles.selectRow}>
              <div>
                <label className={styles.fieldLabel}>Tone Direction</label>
                <select value={toneDir} onChange={e => setToneDir(e.target.value)}>
                  <option value="">Select tone</option>
                  <option>Bold &amp; Disruptive</option>
                  <option>Warm &amp; Community</option>
                  <option>Premium &amp; Refined</option>
                  <option>Fun &amp; Youthful</option>
                  <option>Minimal &amp; Clean</option>
                  <option>Bold Regional</option>
                </select>
              </div>
              <div>
                <label className={styles.fieldLabel}>Primary Audience</label>
                <select value={audience} onChange={e => setAudience(e.target.value)}>
                  <option value="">Select audience</option>
                  <option>Gen Z 18–25</option>
                  <option>Millennials 26–35</option>
                  <option>Mixed Age Groups</option>
                  <option>Regional/Tier 2–3</option>
                  <option>Premium/Luxury</option>
                </select>
              </div>
              <div>
                <label className={styles.fieldLabel}>Market Focus</label>
                <select value={market} onChange={e => setMarket(e.target.value)}>
                  <option value="">Select market</option>
                  <option>Pan-India</option>
                  <option>Metro Cities Only</option>
                  <option>Tier 2–3 Focus</option>
                  <option>Regional/State-level</option>
                </select>
              </div>
            </div>

            {genError && <p className={styles.errorMsg}>{genError}</p>}

            <button type="submit" className={styles.roadmapBtn} disabled={generating}>
              {generating ? 'Generating…' : 'Generate My Brand Roadmap →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
