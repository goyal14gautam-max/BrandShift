'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, Globe, Users, TrendingUp, MessageSquare, Target,
  CheckCircle, AlertCircle, Download, Share2,
} from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import styles from './results.module.css';

// ── Dimension config ───────────────────────────────────────────
const DIM_CONFIG = [
  { key: 'visual_identity',        label: 'Visual Identity',      icon: Eye,           weight: 20 },
  { key: 'digital_presence',       label: 'Digital Presence',     icon: Globe,         weight: 20 },
  { key: 'audience_alignment',     label: 'Social Performance',   icon: Users,         weight: 15 },
  { key: 'trend_relevance',        label: 'Trend Adherence',      icon: TrendingUp,    weight: 15 },
  { key: 'tone_voice',             label: 'Brand Voice',          icon: MessageSquare, weight: 15 },
  { key: 'competitor_positioning', label: 'Competitive Position', icon: Target,        weight: 15 },
];

const PALETTE = [
  'var(--bs-violet)',
  'var(--bs-teal)',
  '#4CAF50',
  'var(--bs-amber)',
  'rgba(124,92,191,0.6)',
  'var(--bs-orange)',
];

function scoreColor(s) {
  if (s >= 65) return 'var(--bs-teal)';
  if (s >= 45) return 'var(--bs-amber)';
  return 'var(--destructive)';
}

function confidenceStyle(c) {
  if (!c) return {};
  const lvl = c.toLowerCase();
  if (lvl.includes('high'))   return { bg: 'rgba(46,196,160,0.12)',  color: 'var(--bs-teal)',     border: 'rgba(46,196,160,0.3)' };
  if (lvl.includes('medium')) return { bg: 'rgba(232,160,48,0.12)',  color: 'var(--bs-amber)',    border: 'rgba(232,160,48,0.3)' };
  return                             { bg: 'rgba(212,24,61,0.12)',   color: 'var(--destructive)', border: 'rgba(212,24,61,0.3)' };
}

function urgencyStyle(u) {
  if (!u) return {};
  const lvl = u.toLowerCase();
  if (lvl.includes('high'))   return { bg: 'rgba(232,98,42,0.12)',  color: 'var(--bs-orange)', border: 'rgba(232,98,42,0.3)',  label: 'Action Needed' };
  if (lvl.includes('medium')) return { bg: 'rgba(232,160,48,0.12)', color: 'var(--bs-amber)',  border: 'rgba(232,160,48,0.3)', label: 'Monitor' };
  return                             { bg: 'rgba(46,196,160,0.12)', color: 'var(--bs-teal)',   border: 'rgba(46,196,160,0.3)', label: 'On Track' };
}

// ── Score ring ─────────────────────────────────────────────────
function ScoreRing({ score }) {
  const [offset, setOffset]       = useState(534);
  const [displayed, setDisplayed] = useState(0);
  const circ = 534;

  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - (score / 100) * circ), 300);
    const dur = 1500, steps = 60;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(Math.round(score * (i / steps)));
      if (i >= steps) clearInterval(id);
    }, dur / steps);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [score, circ]);

  const color = score >= 65 ? 'var(--bs-teal)' : 'var(--bs-amber)';

  return (
    <div className={styles.ringWrap}>
      <svg viewBox="0 0 200 200" width="200" height="200" className={styles.ringSvg}>
        <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="100" cy="100" r="85"
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringScore}>{displayed}</span>
        <span className={styles.ringLabel}>out of 100</span>
      </div>
    </div>
  );
}

// ── Animated score bar ─────────────────────────────────────────
function AnimatedBar({ score, color, delay }) {
  const [width, setWidth] = useState(0);
  const [ref, inView] = useInView(0.2);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setWidth(score), delay || 0);
    return () => clearTimeout(t);
  }, [inView, score, delay]);

  return (
    <div className={styles.dimBar} ref={ref}>
      <div
        className={styles.dimFill}
        style={{ width: `${width}%`, background: color, transition: 'width 0.8s ease' }}
      />
    </div>
  );
}

// ── Fade-up wrapper ────────────────────────────────────────────
function FadeUp({ children, delay = 0 }) {
  const [ref, inView] = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`${styles.fadeUp} ${inView ? styles.fadeUpVisible : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────
function Toast({ visible }) {
  return <div className={`${styles.toast} ${visible ? styles.toastVisible : ''}`}>Copied!</div>;
}

// ── Main page ──────────────────────────────────────────────────
export default function Results() {
  const router = useRouter();
  const [scoreData, setScoreData] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const ctaRef = useRef(null);

  useEffect(() => {
    const raw = localStorage.getItem('brandshift_score');
    if (!raw) { router.push('/audit'); return; }
    setScoreData(JSON.parse(raw));
  }, [router]);

  if (!scoreData) return null;

  const dims   = scoreData.dimensions || {};
  const overall = scoreData.overall_score || 0;

  const dpScore = dims.visual_identity && dims.audience_alignment
    ? Math.round((dims.visual_identity.score + dims.audience_alignment.score) / 2)
    : Math.round(overall * 0.95);

  function getDimScore(key) {
    if (key === 'digital_presence') return dpScore;
    return dims[key]?.score ?? overall;
  }

  function getDimJustification(key) {
    if (key === 'digital_presence') return 'Derived from homepage architecture and digital footprint analysis.';
    return dims[key]?.justification ?? '';
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }

  const confStyle = confidenceStyle(scoreData.data_confidence);
  const urgStyle  = urgencyStyle(scoreData.rebrand_urgency);
  const evidence  = (scoreData.evidence_quotes || []).slice(0, 4);

  return (
    <div className={styles.page}>

      {/* ── Fixed top bar ── */}
      <header className={styles.topBar}>
        <span className={styles.topLogo}>BrandShift</span>
        <button
          className={styles.topCta}
          onClick={() => ctaRef.current?.scrollIntoView({ behavior: 'smooth' })}
        >
          Generate Roadmap
        </button>
      </header>

      <div className={styles.content}>

        {/* ── 1 — Score hero ── */}
        <section className={styles.heroSection}>
          <ScoreRing score={overall} />

          <h1 className={styles.verdict}>{scoreData.verdict || 'Brand Score'}</h1>
          <p className={styles.verdictBody}>
            {scoreData.verdict_description || scoreData.summary || ''}
          </p>

          <div className={styles.badgeRow}>
            {scoreData.data_confidence && (
              <span className={styles.badge} style={{ background: confStyle.bg, color: confStyle.color, borderColor: confStyle.border }}>
                {scoreData.data_confidence.charAt(0).toUpperCase() + scoreData.data_confidence.slice(1).toLowerCase()} Confidence
              </span>
            )}
            {scoreData.rebrand_urgency && (
              <span className={styles.badge} style={{ background: urgStyle.bg, color: urgStyle.color, borderColor: urgStyle.border }}>
                {urgStyle.label}
              </span>
            )}
          </div>

          <div className={styles.palette}>
            {PALETTE.map((color, i) => (
              <div key={i} className={styles.paletteSquare} style={{ background: color }} />
            ))}
          </div>
        </section>

        {/* ── 2 — Dimension breakdown ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Dimension Breakdown</h2>
          <div className={styles.dimGrid}>
            {DIM_CONFIG.map((dim, i) => {
              const s    = getDimScore(dim.key);
              const col  = scoreColor(s);
              const Icon = dim.icon;
              return (
                <FadeUp key={dim.key} delay={i * 80}>
                  <div className={styles.dimCard}>
                    <div className={styles.dimCardHeader}>
                      <div>
                        <div className={styles.dimNameRow}>
                          <Icon size={16} className={styles.dimIcon} />
                          <span className={styles.dimName}>{dim.label}</span>
                        </div>
                        <span className={styles.dimWeight}>Weight: {dim.weight}%</span>
                      </div>
                      <span className={styles.dimScore} style={{ color: col }}>{s}</span>
                    </div>
                    <AnimatedBar score={s} color={col} delay={i * 100} />
                    <p className={styles.dimJustification}>{getDimJustification(dim.key)}</p>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </section>

        {/* ── 3 — Key findings ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Key Findings</h2>
          <div className={styles.findingsGrid}>

            <FadeUp>
              <div className={`${styles.findingCard} ${styles.findingStrength}`}>
                <div className={styles.findingHeader}>
                  <CheckCircle size={18} className={styles.iconGreen} />
                  <span className={styles.findingLabelGreen}>Biggest Strength</span>
                </div>
                <h3 className={styles.findingTitle}>{scoreData.biggest_strength || '—'}</h3>
                {evidence[0] && (
                  <>
                    <p className={styles.findingDetail}>{evidence[0].observation}</p>
                    <p className={styles.findingSource}>Sources: {evidence[0].source}</p>
                  </>
                )}
              </div>
            </FadeUp>

            <FadeUp delay={80}>
              <div className={`${styles.findingCard} ${styles.findingGap}`}>
                <div className={styles.findingHeader}>
                  <AlertCircle size={18} className={styles.iconOrange} />
                  <span className={styles.findingLabelOrange}>Biggest Gap</span>
                </div>
                <h3 className={styles.findingTitle}>{scoreData.biggest_gap || '—'}</h3>
                {evidence[1] && (
                  <>
                    <p className={styles.findingDetail}>{evidence[1].observation}</p>
                    <p className={styles.findingSource}>Sources: {evidence[1].source}</p>
                  </>
                )}
              </div>
            </FadeUp>

          </div>
        </section>

        {/* ── 4 — Evidence ── */}
        {evidence.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>Evidence</h2>
            {evidence.map((ev, i) => (
              <FadeUp key={i} delay={i * 120}>
                <div className={`${styles.evidenceCard} ${ev.sentiment === 'negative' ? styles.evidenceNeg : styles.evidencePos}`}>
                  <span className={ev.sentiment === 'negative' ? styles.sentimentNeg : styles.sentimentPos}>
                    {ev.sentiment === 'negative' ? 'Deducting from score ↓' : 'Contributing to score ↑'}
                  </span>
                  <span className={styles.evidenceSource}>{ev.source}</span>
                  <p className={styles.evidenceQuote}>&ldquo;{ev.quote}&rdquo;</p>
                  <p className={styles.evidenceObservation}>{ev.observation}</p>
                </div>
              </FadeUp>
            ))}
          </section>
        )}

        {/* ── 5 — CTA ── */}
        <section className={styles.ctaSection} ref={ctaRef}>
          <h2 className={styles.ctaHeading}>Ready to close the gaps?</h2>
          <p className={styles.ctaSub}>Generate a strategic roadmap tailored to your goals</p>
          <button className={styles.ctaBtn} onClick={() => router.push('/roadmap')}>
            Generate Roadmap →
          </button>
        </section>

      </div>

      {/* ── Floating action bar ── */}
      <div className={styles.actionBar}>
        <button className={styles.actionBtn} onClick={() => window.print()}>
          <Download size={16} />
          Save Report
        </button>
        <div className={styles.actionDivider} />
        <button className={styles.actionBtn} onClick={handleShare}>
          <Share2 size={16} />
          Share
        </button>
      </div>

      <Toast visible={toastVisible} />

    </div>
  );
}
