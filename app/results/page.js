'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, Globe, Users, TrendingUp, MessageSquare, Target,
  CheckCircle, AlertCircle, Download, Share2,
} from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import styles from './results.module.css';

// ── Dimension config ──────────────────────────────────────────

const DIM_CONFIG = [
  { key: 'visual_identity',        label: 'Visual Identity',      icon: Eye,            weight: 20 },
  { key: 'digital_presence',       label: 'Digital Presence',     icon: Globe,          weight: 20 },
  { key: 'audience_alignment',     label: 'Social Performance',   icon: Users,          weight: 15 },
  { key: 'trend_relevance',        label: 'Trend Adherence',      icon: TrendingUp,     weight: 15 },
  { key: 'tone_voice',             label: 'Brand Voice',          icon: MessageSquare,  weight: 15 },
  { key: 'competitor_positioning', label: 'Competitive Position', icon: Target,         weight: 15 },
];

function scoreColor(s) {
  if (s < 45) return 'var(--destructive)';
  if (s <= 65) return 'var(--bs-amber)';
  return 'var(--bs-teal)';
}

// ── Animated Score Ring ───────────────────────────────────────

function ScoreRing({ score }) {
  const R = 85;
  const circ = 2 * Math.PI * R;
  const [offset, setOffset]       = useState(circ);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const targetOffset = circ - (score / 100) * circ;
    const timer = setTimeout(() => setOffset(targetOffset), 300);
    let frame = 0;
    const total = 60;
    const id = setInterval(() => {
      frame++;
      setDisplayed(Math.round(score * (frame / total)));
      if (frame >= total) clearInterval(id);
    }, 1500 / total);
    return () => { clearTimeout(timer); clearInterval(id); };
  }, [score, circ]);

  const color = score >= 65 ? 'var(--bs-teal)' : 'var(--bs-amber)';

  return (
    <div className={styles.ring}>
      <svg viewBox="0 0 200 200" width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx="100" cy="100" r={R} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringNumber}>{displayed}</span>
        <span className={styles.ringLabel}>out of 100</span>
      </div>
    </div>
  );
}

// ── Dimension Card ────────────────────────────────────────────

function DimCard({ dim, score, justification, weight, index }) {
  const [ref, inView] = useInView(0.1);
  const [barWidth, setBarWidth] = useState(0);
  const Icon = dim.icon;

  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => setBarWidth(score), index * 100);
      return () => clearTimeout(timer);
    }
  }, [inView, score, index]);

  const color = scoreColor(score);

  return (
    <div ref={ref} className={styles.dimCard} style={{ animationDelay: `${index * 80}ms` }}>
      <div className={styles.dimHeader}>
        <div>
          <div className={styles.dimNameRow}>
            <Icon size={16} style={{ color: 'var(--bs-violet)' }} />
            <span className={styles.dimName}>{dim.label}</span>
          </div>
          <span className={styles.dimWeight}>Weight: {weight}%</span>
        </div>
        <span className={styles.dimScore} style={{ color }}>{score}</span>
      </div>
      <div className={styles.dimBar}>
        <div className={styles.dimBarFill} style={{ width: `${barWidth}%`, background: color, transition: 'width 1s ease' }} />
      </div>
      <p className={styles.dimJustification}>{justification}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function Results() {
  const router = useRouter();
  const [scoreData, setScoreData] = useState(null);
  const [brandData, setBrandData] = useState(null);
  const [copied, setCopied]       = useState(false);

  const [findingsRef, findingsInView] = useInView(0.1);
  const [evidenceRef, evidenceInView] = useInView(0.1);
  const [ctaRef, ctaInView]           = useInView(0.1);

  useEffect(() => {
    const raw   = localStorage.getItem('brandshift_score');
    const brand = localStorage.getItem('brandshift_intake') || localStorage.getItem('brandshift_brand');
    if (!raw) { router.push('/audit'); return; }
    try {
      setScoreData(JSON.parse(raw));
      if (brand) setBrandData(JSON.parse(brand));
    } catch { router.push('/audit'); }
  }, [router]);

  if (!scoreData) return null;

  const dims    = scoreData.dimensions || {};
  const overall = scoreData.overall_score || 0;

  // Derive Digital Presence if not returned by API
  const digitalPresenceScore = dims.digital_presence?.score
    ?? Math.round(((dims.visual_identity?.score || overall) + (dims.tone_voice?.score || overall)) / 2);

  const allDims = DIM_CONFIG.map(d => {
    if (d.key === 'digital_presence') {
      return { ...d, score: digitalPresenceScore, justification: dims.digital_presence?.justification || 'Derived from homepage and content analysis.' };
    }
    const dim = dims[d.key] || {};
    return { ...d, score: dim.score || 0, justification: dim.justification || '' };
  });

  const confidence = scoreData.data_confidence || 'medium';
  const urgency    = scoreData.rebrand_urgency || 'medium';
  const evidence   = (scoreData.evidence_quotes || []).slice(0, 4);

  function scrollToCta() {
    document.getElementById('results-cta')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className={styles.page}>

      {/* Top bar */}
      <header className={styles.topBar}>
        <span className={styles.navLogo}>BrandShift</span>
        <button className={styles.topCta} onClick={scrollToCta}>Generate Roadmap</button>
      </header>

      <div className={styles.content}>

        {/* ── Section 1: Score Hero ── */}
        <section className={styles.scoreHero}>
          <ScoreRing score={overall} />
          <h1 className={styles.verdictHeading}>{scoreData.verdict_headline || scoreData.verdict?.split('.')[0] || 'Your Brand Score'}</h1>
          <p className={styles.verdictDesc}>{scoreData.verdict || ''}</p>

          <div className={styles.badgeRow}>
            <span className={`${styles.badge} ${styles[`confidence${confidence.charAt(0).toUpperCase() + confidence.slice(1)}`]}`}>
              {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
            </span>
            <span className={`${styles.badge} ${styles[`urgency${urgency.charAt(0).toUpperCase() + urgency.slice(1)}`]}`}>
              {urgency === 'high' ? 'Action Needed' : urgency === 'medium' ? 'Monitor' : 'On Track'}
            </span>
          </div>

          <div className={styles.paletteRow}>
            {['var(--bs-violet)', 'var(--bs-teal)', '#4CAF50', 'var(--bs-amber)', 'rgba(124,92,191,0.6)', 'var(--bs-orange)'].map((c, i) => (
              <div key={i} className={styles.paletteSquare} style={{ background: c }} />
            ))}
          </div>
        </section>

        {/* ── Section 2: Dimension Breakdown ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Dimension Breakdown</h2>
          <div className={styles.dimGrid}>
            {allDims.map((d, i) => (
              <DimCard key={d.key} dim={d} score={d.score} justification={d.justification} weight={d.weight} index={i} />
            ))}
          </div>
        </section>

        {/* ── Section 3: Key Findings ── */}
        <section className={styles.section} ref={findingsRef}>
          <h2 className={styles.sectionHeading}>Key Findings</h2>
          <div className={`${styles.findingsGrid} ${findingsInView ? styles.fadeIn : ''}`}>
            <div className={styles.findingCard} style={{ borderColor: 'rgba(46,196,160,0.2)' }}>
              <div className={styles.findingHeader}>
                <CheckCircle size={18} style={{ color: 'var(--bs-teal)' }} />
                <span className={styles.findingLabel} style={{ color: 'var(--bs-teal)' }}>Biggest Strength</span>
              </div>
              <h3 className={styles.findingTitle}>{scoreData.biggest_strength || 'N/A'}</h3>
              {evidence[0]?.quote && <p className={styles.findingDetail}>{evidence[0].quote}</p>}
              {evidence[0]?.source && <p className={styles.findingSource}>Sources: {evidence[0].source}</p>}
            </div>
            <div className={styles.findingCard} style={{ borderColor: 'rgba(232,98,42,0.2)' }}>
              <div className={styles.findingHeader}>
                <AlertCircle size={18} style={{ color: 'var(--bs-orange)' }} />
                <span className={styles.findingLabel} style={{ color: 'var(--bs-orange)' }}>Biggest Gap</span>
              </div>
              <h3 className={styles.findingTitle}>{scoreData.biggest_gap || 'N/A'}</h3>
              {evidence[1]?.observation && <p className={styles.findingDetail}>{evidence[1].observation}</p>}
              {evidence[1]?.source && <p className={styles.findingSource}>Sources: {evidence[1].source}</p>}
            </div>
          </div>
        </section>

        {/* ── Section 4: Evidence ── */}
        {evidence.length > 0 && (
          <section className={styles.section} ref={evidenceRef}>
            <h2 className={styles.sectionHeading}>Evidence</h2>
            {evidence.map((ev, i) => (
              <div key={i} className={`${styles.evidenceCard} ${evidenceInView ? styles.fadeIn : ''}`} style={{ animationDelay: `${i * 120}ms` }}>
                <p className={styles.evidenceSource}>{ev.source || 'Source'}</p>
                {ev.quote && <p className={styles.evidenceQuote}>&ldquo;{ev.quote}&rdquo;</p>}
                {ev.observation && <p className={styles.evidenceObs}>{ev.observation}</p>}
              </div>
            ))}
          </section>
        )}

        {/* ── Section 5: Bottom CTA ── */}
        <section id="results-cta" className={styles.ctaSection} ref={ctaRef}>
          <div className={ctaInView ? styles.fadeIn : ''}>
            <h2 className={styles.ctaHeading}>Ready to close the gaps?</h2>
            <p className={styles.ctaSub}>Generate a strategic roadmap tailored to your goals</p>
            <button className={styles.ctaBtn} onClick={() => router.push('/roadmap-setup')}>Generate Roadmap →</button>
          </div>
        </section>
      </div>

      {/* ── Floating Action Bar ── */}
      <div className={styles.floatingBar}>
        <button className={styles.floatingBtn} onClick={() => window.print()}>
          <Download size={16} />
          Save Report
        </button>
        <div className={styles.floatingDivider} />
        <button className={styles.floatingBtn} onClick={handleShare}>
          <Share2 size={16} />
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>
    </div>
  );
}
