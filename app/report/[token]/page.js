'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Eye, MessageSquare, TrendingUp, Target, Users } from 'lucide-react';
import styles from './report.module.css';
import { trackPageView, trackEvent } from '@/lib/analytics';

const DIM_CONFIG = [
  { key: 'visual_identity',        label: 'Visual Identity',      icon: Eye           },
  { key: 'tone_voice',             label: 'Brand Voice',          icon: MessageSquare },
  { key: 'trend_relevance',        label: 'Trend Relevance',      icon: TrendingUp    },
  { key: 'competitor_positioning', label: 'Competitive Position', icon: Target        },
  { key: 'audience_alignment',     label: 'Audience Alignment',   icon: Users         },
];

function scoreColor(s) {
  if (s >= 65) return 'var(--bs-teal)';
  if (s >= 45) return 'var(--bs-amber)';
  return 'var(--destructive)';
}

function urgencyLabel(u) {
  if (!u) return null;
  const lvl = u.toLowerCase();
  if (lvl.includes('high'))   return { label: 'Action Needed', color: 'var(--bs-orange)', bg: 'rgba(232,98,42,0.12)',  border: 'rgba(232,98,42,0.3)'  };
  if (lvl.includes('medium')) return { label: 'Monitor',       color: 'var(--bs-amber)',  bg: 'rgba(232,160,48,0.12)', border: 'rgba(232,160,48,0.3)' };
  return                             { label: 'On Track',      color: 'var(--bs-teal)',   bg: 'rgba(46,196,160,0.12)', border: 'rgba(46,196,160,0.3)' };
}

function ScoreRing({ score }) {
  const [offset, setOffset] = useState(534);
  const [displayed, setDisplayed] = useState(0);
  const circ = 534;

  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - (score / 100) * circ), 300);
    let i = 0; const steps = 60; const dur = 1500;
    const id = setInterval(() => {
      i++; setDisplayed(Math.round(score * (i / steps)));
      if (i >= steps) clearInterval(id);
    }, dur / steps);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [score, circ]);

  const color = score >= 65 ? 'var(--bs-teal)' : 'var(--bs-amber)';
  return (
    <div className={styles.ringWrap}>
      <svg viewBox="0 0 200 200" width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx="100" cy="100" r="85" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringScore}>{displayed}</span>
        <span className={styles.ringLabel}>out of 100</span>
      </div>
    </div>
  );
}

function AnimBar({ score, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 400);
    return () => clearTimeout(t);
  }, [score]);
  return (
    <div className={styles.dimBarBg}>
      <div className={styles.dimBarFill} style={{ width: `${width}%`, background: color, transition: 'width 0.8s ease' }} />
    </div>
  );
}

export default function SharedReport() {
  const router = useRouter();
  const params = useParams();
  const token  = params.token;

  const [report, setReport]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/share/${token}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) { setNotFound(true); }
        else {
          setReport(data.report);
          trackPageView('shared_report');
          trackEvent('shared_report_viewed', {
            brand_name: data.report?.brand_name,
            share_token: token,
            overall_score: data.report?.score_data?.overall_score,
          });
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <AlertCircle size={40} style={{ color: 'var(--bs-orange)', marginBottom: 16 }} />
          <h2 className={styles.notFoundHeading}>Report not found</h2>
          <p className={styles.notFoundSub}>This link may have expired or been deactivated.</p>
          <button className={styles.ctaPrimary} onClick={() => router.push('/audit')}>
            Get your free audit →
          </button>
        </div>
      </div>
    );
  }

  const scoreData  = report.score_data  || {};
  const intakeData = report.intake_data || {};
  const dims       = scoreData.dimensions || {};
  const overall    = scoreData.overall_score || 0;
  const evidence   = (scoreData.evidence_quotes || []).slice(0, 4);
  const urg        = urgencyLabel(scoreData.rebrand_urgency);

  const createdDate = report.created_at
    ? new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className={styles.page}>

      {/* ── Top bar ── */}
      <header className={styles.topBar}>
        <span className={styles.logo}>BrandShift</span>
        <div className={styles.topActions}>
          <button className={styles.topBtnSecondary} onClick={() => router.push('/audit')}>
            Get your free audit →
          </button>
          <button className={styles.topBtnPrimary} onClick={() => {
            trackEvent('shared_report_cta_clicked', { cta: 'sign_up_to_fix', brand_name: report?.brand_name });
            router.push('/signup');
          }}>
            Sign up to fix this →
          </button>
        </div>
      </header>

      {/* ── Preview banner ── */}
      <div className={styles.previewBanner}>
        <span className={styles.bannerLeft}>
          This is a brand audit prepared for <strong>{report.brand_name}</strong>
        </span>
        <span className={styles.bannerRight}>
          Prepared by BrandShift · {createdDate}
        </span>
      </div>

      <div className={styles.content}>

        {/* ── Score hero ── */}
        <section className={styles.heroSection}>
          <ScoreRing score={overall} />
          <h1 className={styles.verdict}>{scoreData.verdict || 'Brand Score Analysis'}</h1>
          {scoreData.verdict_description && (
            <p className={styles.verdictDesc}>{scoreData.verdict_description}</p>
          )}
          <div className={styles.badgeRow}>
            {scoreData.data_confidence && (
              <span className={styles.badge} style={{ background: 'rgba(124,92,191,0.12)', color: 'var(--bs-violet)', borderColor: 'rgba(124,92,191,0.25)' }}>
                {scoreData.data_confidence.charAt(0).toUpperCase() + scoreData.data_confidence.slice(1)} Confidence
              </span>
            )}
            {urg && (
              <span className={styles.badge} style={{ background: urg.bg, color: urg.color, borderColor: urg.border }}>
                {urg.label}
              </span>
            )}
          </div>
        </section>

        {/* ── Dimension breakdown ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Dimension Breakdown</h2>
          <p className={styles.sectionSub}>Your brand scored across 5 dimensions</p>
          <div className={styles.dimGrid}>
            {DIM_CONFIG.map((dim, i) => {
              const s   = dims[dim.key]?.score ?? overall;
              const col = scoreColor(s);
              const Icon = dim.icon;
              return (
                <div key={dim.key} className={styles.dimCard}>
                  <div className={styles.dimHeader}>
                    <div className={styles.dimLeft}>
                      <Icon size={14} style={{ color: 'var(--bs-violet)', flexShrink: 0 }} />
                      <span className={styles.dimName}>{dim.label}</span>
                    </div>
                    <span className={styles.dimScore} style={{ color: col }}>{s}</span>
                  </div>
                  <AnimBar score={s} color={col} />
                  {dims[dim.key]?.justification && (
                    <p className={styles.dimJust}>{dims[dim.key].justification}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Key findings ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Key Findings</h2>
          <div className={styles.findingsGrid}>
            <div className={`${styles.findingCard} ${styles.findingStrength}`}>
              <div className={styles.findingHeader}>
                <CheckCircle size={16} style={{ color: 'var(--bs-teal)' }} />
                <span className={styles.findingLabel} style={{ color: 'var(--bs-teal)' }}>Biggest Strength</span>
              </div>
              <h3 className={styles.findingTitle}>{scoreData.biggest_strength || '—'}</h3>
              {evidence[0] && <p className={styles.findingDetail}>{evidence[0].observation}</p>}
            </div>
            <div className={`${styles.findingCard} ${styles.findingGap}`}>
              <div className={styles.findingHeader}>
                <AlertCircle size={16} style={{ color: 'var(--bs-orange)' }} />
                <span className={styles.findingLabel} style={{ color: 'var(--bs-orange)' }}>Biggest Gap</span>
              </div>
              <h3 className={styles.findingTitle}>{scoreData.biggest_gap || '—'}</h3>
              {evidence[1] && <p className={styles.findingDetail}>{evidence[1].observation}</p>}
            </div>
          </div>
        </section>

        {/* ── Evidence ── */}
        {evidence.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Evidence</h2>
            <p className={styles.sectionSub}>Pulled directly from {report.brand_name}'s online presence</p>
            <div className={styles.evidenceList}>
              {evidence.map((e, i) => (
                <div key={i} className={styles.evidenceCard}>
                  <span className={styles.evidenceSource}>{e.source}</span>
                  {e.quote && <p className={styles.evidenceQuote}>"{e.quote}"</p>}
                  {e.observation && <p className={styles.evidenceObs}>{e.observation}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Bottom CTA ── */}
        <section className={styles.ctaSection}>
          <p className={styles.ctaEyebrow}>YOUR BRAND AUDIT IS READY</p>
          <h2 className={styles.ctaHeading}>Ready to fix these gaps?</h2>
          <p className={styles.ctaSub}>
            Get your personalised 8-week roadmap, weekly score tracking, and Monday briefs —
            built specifically for {report.brand_name}.
          </p>
          <div className={styles.ctaBtnRow}>
            <button
              className={styles.ctaPrimary}
              onClick={() => {
              trackEvent('shared_report_cta_clicked', { cta: 'start_for_free', brand_name: report?.brand_name, overall_score: scoreData?.overall_score });
              router.push(`/audit?brand=${encodeURIComponent(report.brand_name)}`);
            }}
            >
              Start for free →
            </button>
            <button
              className={styles.ctaSecondary}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              See how it works
            </button>
          </div>
          <p className={styles.ctaNote}>No credit card required · First audit is free</p>
        </section>

      </div>
    </div>
  );
}
