'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, Globe, Users, TrendingUp, MessageSquare, Target,
  CheckCircle, AlertCircle, Download, Share2, Check,
  ChevronDown, ChevronUp, FileText, ArrowUp, AtSign,
} from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import BrandRadarChart from '@/components/BrandRadarChart';
import Tooltip from '@/components/Tooltip';
import EvidenceSection from '@/components/EvidenceSection';
import styles from './results.module.css';
import { trackPageView, trackEvent } from '@/lib/analytics';

// ── Dimension config (5 real dims) ─────────────────────────────
const DIM_CONFIG = [
  { key: 'visual_identity',        label: 'Visual Identity',      icon: Eye,           weight: 25 },
  { key: 'tone_voice',             label: 'Brand Voice',          icon: MessageSquare, weight: 25 },
  { key: 'trend_relevance',        label: 'Trend Relevance',      icon: TrendingUp,    weight: 20 },
  { key: 'competitor_positioning', label: 'Competitive Position', icon: Target,        weight: 20 },
  { key: 'audience_alignment',     label: 'Audience Alignment',   icon: Users,         weight: 10 },
];

const KELLER_LEVELS = [
  { level: 1, name: 'People know you exist',              desc: 'Building basic awareness' },
  { level: 2, name: 'People know what you stand for',     desc: 'Defined brand meaning' },
  { level: 3, name: 'People have a reason to choose you', desc: 'Strong brand judgements' },
  { level: 4, name: 'People are loyal advocates',         desc: 'Deep brand resonance' },
];

const FRAMEWORK_TOOLTIPS = {
  visual_identity:        'Based on brand recall research — brands with distinctive visual assets need 40% less advertising spend to achieve the same awareness.',
  tone_voice:             'Your brand voice is how customers describe your personality. Consistent voice builds trust 3x faster than inconsistent messaging.',
  trend_relevance:        'Measures how many different moments and occasions your brand shows up for. More occasions = more buying opportunities.',
  competitor_positioning: 'How clearly you stand out from competitors in your customer\'s mind. If customers can\'t explain why they\'d choose you over a competitor, this score is low.',
  audience_alignment:     'How well everything you put out — website, social, content — is aimed at the same specific person. Mixed signals confuse customers.',
};

const KELLER_TOOLTIP = 'This measures how deeply customers connect with your brand — from basic awareness all the way to loyal advocacy. Most Indian D2C brands are at Level 2.';

const DIM_LABELS = {
  visual_identity:        'Visual Identity',
  tone_voice:             'Brand Voice',
  trend_relevance:        'Trend Relevance',
  competitor_positioning: 'Competitor Gap',
  audience_alignment:     'Audience Fit',
};

// ── Helpers ────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 65) return 'var(--bs-teal)';
  if (s >= 45) return 'var(--bs-amber)';
  return 'var(--destructive)';
}

function urgencyStyle(u) {
  if (!u) return {};
  const lvl = u.toLowerCase();
  if (lvl.includes('high'))   return { bg: 'rgba(232,98,42,0.12)',  color: 'var(--bs-orange)', border: 'rgba(232,98,42,0.3)',  label: 'Action Needed' };
  if (lvl.includes('medium')) return { bg: 'rgba(232,160,48,0.12)', color: 'var(--bs-amber)',  border: 'rgba(232,160,48,0.3)', label: 'Monitor' };
  return                             { bg: 'rgba(46,196,160,0.12)', color: 'var(--bs-teal)',   border: 'rgba(46,196,160,0.3)', label: 'On Track' };
}

function calcSimulation(dims, overall) {
  const weights = {
    visual_identity: 0.25, tone_voice: 0.25,
    trend_relevance: 0.20, competitor_positioning: 0.20, audience_alignment: 0.10,
  };
  if (!dims) return { simulated: Math.min(overall + 12, 100), improvement: 12 };
  const scores = Object.entries(weights).map(([k, w]) => ({ k, score: dims[k]?.score ?? overall, w }));
  const bottom2 = [...scores].sort((a, b) => a.score - b.score).slice(0, 2).map(d => d.k);
  const simTotal = Math.round(
    scores.map(d => ({ s: bottom2.includes(d.k) ? Math.max(d.score, 70) : d.score, w: d.w }))
          .reduce((acc, d) => acc + d.s * d.w, 0)
  );
  const improvement = Math.max(simTotal - overall, 1);
  return { simulated: Math.min(overall + improvement, 100), improvement };
}

function truncate(text, maxLen = 180) {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen).trimEnd() + '…';
}

function getTwoSentences(text) {
  if (!text) return '';
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(0, 2).join(' ').trim() || text;
}

// ── Sub-components ─────────────────────────────────────────────
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
      <svg viewBox="0 0 200 200" width="160" height="160" className={styles.ringSvg}>
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
      <div className={styles.dimFill} style={{ width: `${width}%`, background: color, transition: 'width 0.8s ease' }} />
    </div>
  );
}

function FadeUp({ children, delay = 0 }) {
  const [ref, inView] = useInView(0.1);
  return (
    <div ref={ref} className={`${styles.fadeUp} ${inView ? styles.fadeUpVisible : ''}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function Toast({ visible }) {
  return <div className={`${styles.toast} ${visible ? styles.toastVisible : ''}`}>Copied!</div>;
}

// ── Main page ──────────────────────────────────────────────────
export default function Results() {
  const router = useRouter();
  const [scoreData, setScoreData]   = useState(null);
  const [intakeData, setIntakeData] = useState({});
  const [scrapedData, setScrapedData] = useState(null);
  const [toastVisible, setToastVisible]   = useState(false);
  const [expandedDim, setExpandedDim]     = useState(null);
  const [shareLoading, setShareLoading]   = useState(false);
  const [shareModalUrl, setShareModalUrl] = useState('');
  const [shareCopied, setShareCopied]     = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('brandshift_score');
    if (!raw) { router.push('/audit'); return; }
    const score = JSON.parse(raw);
    setScoreData(score);
    const intake = localStorage.getItem('brandshift_intake');
    const intakeParsed = intake ? JSON.parse(intake) : {};
    if (intake) setIntakeData(intakeParsed);
    const scraped = localStorage.getItem('brandshift_scraped');
    if (scraped) setScrapedData(JSON.parse(scraped));
    trackPageView('results_page');
    trackEvent('results_viewed', {
      brand_name: intakeParsed?.brandName,
      overall_score: score?.overall_score,
      rebrand_urgency: score?.rebrand_urgency,
    });
  }, [router]);

  if (!scoreData) return null;

  const dims    = scoreData.dimensions || {};
  const overall = scoreData.overall_score || 0;
  const sourceAvail = scoreData.sources_available || {};
  const cw = scoreData.channel_weights || { instagram: 30, website: 30, competitor: 25, blog: 15 };
  const kellerLevel = scoreData.keller_level || null;
  const kellerInfo  = kellerLevel ? KELLER_LEVELS[kellerLevel - 1] : null;
  const evidence    = (scoreData.evidence_quotes || []).slice(0, 6);
  const urgStyle    = urgencyStyle(scoreData.rebrand_urgency);
  const sim         = calcSimulation(dims, overall);

  const sourcesCount = [sourceAvail.homepage, sourceAvail.instagram, sourceAvail.competitors, sourceAvail.blog]
    .filter(Boolean).length;

  const brandTypeLabel =
    scoreData.brand_type === 'social-first'   ? 'Social First' :
    scoreData.brand_type === 'content-first'  ? 'Content First' : 'Balanced';

  const highestDimScore = Math.max(...DIM_CONFIG.map(d => dims[d.key]?.score || overall));
  const sortedByScore   = [...DIM_CONFIG].sort((a, b) => (dims[a.key]?.score ?? overall) - (dims[b.key]?.score ?? overall));
  const lowestDim       = sortedByScore[0];
  const bottom2Dims     = sortedByScore.slice(0, 2);
  const gap1Name        = DIM_LABELS[bottom2Dims[0]?.key] || '';
  const gap2Name        = DIM_LABELS[bottom2Dims[1]?.key] || '';
  const nextLevelAction = dims[lowestDim?.key]?.improvement_action || '';

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }

  async function handleShareReport() {
    trackEvent('report_shared', { brand_name: intakeData?.brandName });
    setShareLoading(true);
    try {
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:  intakeData.brandName || 'Brand',
          industry:   intakeData.industry  || '',
          scoreData,
          intakeData,
          createdBy:  'results_page',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShareModalUrl(data.shareUrl);
        navigator.clipboard.writeText(data.shareUrl).catch(() => {});
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 2500);
      }
    } catch {}
    finally { setShareLoading(false); }
  }

  function closeShareModal() {
    setShareModalUrl('');
    setShareCopied(false);
  }

  const channels = [
    { label: 'Instagram',   value: cw.instagram   || 0 },
    { label: 'Website',     value: cw.website      || 0 },
    { label: 'Competitors', value: cw.competitor   || 0 },
    { label: 'Blog',        value: cw.blog         || 0 },
  ];

  return (
    <div className={styles.page}>

      {/* ── Fixed top bar ── */}
      <header className={styles.topBar}>
        <span className={styles.topLogo}>BrandShift</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className={styles.shareBtn}
            onClick={handleShareReport}
            disabled={shareLoading}
          >
            <Share2 size={14} />
            {shareLoading ? 'Creating link…' : 'Share Report'}
          </button>
          <button className={styles.topCta} onClick={() => router.push('/roadmap')}>
            Generate Roadmap
          </button>
        </div>
      </header>

      <div className={styles.content}>

        {/* ══ 1 — Score Hero ══ */}
        <section className={styles.heroGrid}>

          {/* Left: ring + verdict */}
          <div className={styles.heroLeft}>
            <ScoreRing score={overall} />
            <h1 className={styles.verdict}>{scoreData.verdict || 'Your Brand Score'}</h1>
            <div className={styles.badgeRow}>
              {scoreData.data_confidence && (
                <span className={styles.badge} style={{
                  background: 'rgba(124,92,191,0.12)', color: 'var(--bs-violet)', borderColor: 'rgba(124,92,191,0.25)',
                }}>
                  {scoreData.data_confidence.charAt(0).toUpperCase() + scoreData.data_confidence.slice(1)} Confidence
                </span>
              )}
              {scoreData.rebrand_urgency && (
                <span className={styles.badge} style={{ background: urgStyle.bg, color: urgStyle.color, borderColor: urgStyle.border }}>
                  {urgStyle.label}
                </span>
              )}
            </div>
          </div>

          {/* Right: 2×2 metric cards */}
          <div className={styles.heroRight}>
            <div className={styles.metricsGrid}>

              {/* Card 1: Brand maturity */}
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>
                  Brand maturity
                  <Tooltip content={KELLER_TOOLTIP} width={240} />
                </div>
                <div className={styles.metricValue} style={{ color: 'var(--bs-violet)' }}>
                  {kellerLevel ? `Level ${kellerLevel}` : '—'}
                  <span className={styles.metricValueSuffix}> of 4</span>
                </div>
                <div className={styles.metricSub}>{kellerInfo?.name || 'Run audit for level'}</div>
              </div>

              {/* Card 2: Primary channel */}
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Primary channel</div>
                <div className={styles.metricValue}>{brandTypeLabel}</div>
                <div className={styles.metricSub}>How we weighted your analysis</div>
              </div>

              {/* Card 3: Instagram signal */}
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Instagram signal</div>
                {sourceAvail.instagram ? (
                  <>
                    <div className={styles.metricValue} style={{ color: 'var(--bs-teal)', fontSize: 16 }}>
                      <Check size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                      Analysed
                    </div>
                    <div className={styles.metricSub}>Included in scoring</div>
                  </>
                ) : (
                  <>
                    <div className={styles.metricValue} style={{ color: 'var(--bs-text-tertiary)', fontSize: 14 }}>
                      Not connected
                    </div>
                    <div className={styles.metricSub}>Add handle for better accuracy</div>
                  </>
                )}
              </div>

              {/* Card 4: Sources analysed */}
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Sources analysed</div>
                <div className={styles.sourceIconRow}>
                  <Globe   size={16} style={{ color: sourceAvail.homepage     ? 'var(--bs-teal)' : 'var(--bs-text-tertiary)' }} />
                  <AtSign size={16} style={{ color: sourceAvail.instagram  ? 'var(--bs-teal)' : 'var(--bs-text-tertiary)' }} />
                  <Users   size={16} style={{ color: sourceAvail.competitors  ? 'var(--bs-teal)' : 'var(--bs-text-tertiary)' }} />
                  <FileText size={16} style={{ color: sourceAvail.blog        ? 'var(--bs-teal)' : 'var(--bs-text-tertiary)' }} />
                </div>
                <div className={styles.metricSub}>
                  {sourcesCount} of 4 sources · {scoreData.data_confidence || '—'} confidence
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ══ 2 — Score Simulation + Brand Maturity Path ══ */}
        <section className={styles.heroTransition}>

          {/* Insight card */}
          {sim.improvement > 0 && (
            <div className={styles.simInsightCard}>
              <TrendingUp size={24} style={{ color: 'var(--bs-teal)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p className={styles.simInsightMain}>
                  Fixing your top 2 gaps could push your score from {Math.round(overall)} to {Math.round(sim.simulated)}
                </p>
                {gap1Name && gap2Name && (
                  <p className={styles.simInsightSub}>
                    {gap1Name} and {gap2Name} are your biggest opportunities
                  </p>
                )}
              </div>
              <span className={styles.simInsightDelta}>+{Math.round(sim.improvement)}</span>
            </div>
          )}

          {/* Brand maturity path */}
          {kellerLevel && (
            <>
              <div className={styles.maturityWrap}>
                <div className={styles.maturityLine}>
                  <div className={styles.maturityLineActive}
                    style={{ width: `${((kellerLevel - 1) / 3) * 100}%` }} />
                </div>
                <div className={styles.maturityNodes}>
                  {KELLER_LEVELS.map((lvl) => {
                    const achieved  = lvl.level < kellerLevel;
                    const current   = lvl.level === kellerLevel;
                    const nodeClass = achieved ? styles.matNodeAchieved : current ? styles.matNodeCurrent : styles.matNodeFuture;
                    const textClass = achieved || current ? styles.matLabelActive : styles.matLabelFuture;
                    return (
                      <div key={lvl.level} className={styles.matNodeWrap}>
                        <div className={`${styles.matNode} ${nodeClass}`}>
                          {achieved
                            ? <Check size={16} />
                            : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{lvl.level}</span>}
                        </div>
                        <p className={`${styles.matLabel} ${textClass}`}>{lvl.name}</p>
                        <p className={styles.matDesc}>{lvl.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.maturityCard}>
                <span className={styles.matCardLabel}>You are here:</span>
                <h3 className={styles.matCardTitle}>{kellerInfo?.name}</h3>
                {scoreData.keller_level_explanation && (
                  <p className={styles.matCardText}>{truncate(scoreData.keller_level_explanation, 320)}</p>
                )}
                {kellerLevel < 4 && nextLevelAction && (
                  <>
                    <div className={styles.matDivider} />
                    <span className={styles.matCardLabel}>To reach Level {kellerLevel + 1}:</span>
                    <p className={styles.matNextText}>{nextLevelAction}</p>
                  </>
                )}
              </div>
            </>
          )}
        </section>

        {/* ══ 3 — Radar + Dimensions ══ */}
        <section className={styles.sectionSpaced}>
          <h2 className={styles.sectionTitle}>Where the gaps are</h2>
          <p className={styles.sectionSub}>Your brand scored across 5 dimensions — here's what's driving the number</p>

          <div className={styles.radarSection}>

            {/* Left: Radar chart + weight bars */}
            <div className={styles.radarLeft}>
              <h2 className={styles.sectionTitleSm}>Brand shape</h2>
              <p className={styles.sectionSub}>Your strengths and gaps at a glance</p>
              <BrandRadarChart
                brandData={scoreData.dimensions}
                brandName={intakeData.brandName || 'Your Brand'}
                competitorName={scoreData.competitor_scores?.name || null}
                competitorData={scoreData.competitor_scores?.dimensions || null}
                dataConfidence={scoreData.data_confidence}
              />
              <div className={styles.weightSection}>
                <p className={styles.weightTitle}>How we weighted this analysis</p>
                {channels.map(ch => (
                  <div key={ch.label} className={styles.weightRow}>
                    <span className={styles.weightLabel}>{ch.label}</span>
                    <div className={styles.weightBarWrap}>
                      <div className={styles.weightBarFill} style={{ width: `${ch.value}%` }} />
                    </div>
                    <span className={styles.weightValue}>{ch.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Condensed dimension cards */}
            <div className={styles.radarRight}>
              <h2 className={styles.sectionTitleSm}>Dimension breakdown</h2>
              <p className={styles.sectionSub}>What's driving your score</p>
              <div className={styles.dimStack}>
                {DIM_CONFIG.map((dim, i) => {
                  const s = dims[dim.key]?.score ?? overall;
                  const col = scoreColor(s);
                  const Icon = dim.icon;
                  const justification = dims[dim.key]?.justification || '';
                  const evidenceQ    = dims[dim.key]?.evidence_quote || '';
                  const improvement  = dims[dim.key]?.improvement_action || '';
                  const voiceWords   = dim.key === 'tone_voice' ? (dims.tone_voice?.voice_in_3_words || []) : [];
                  const isExpanded   = expandedDim === dim.key;

                  return (
                    <FadeUp key={dim.key} delay={i * 60}>
                      <div
                        className={styles.dimCardSmall}
                        onClick={() => setExpandedDim(prev => prev === dim.key ? null : dim.key)}
                      >
                        <div className={styles.dimSmallHeader}>
                          <div className={styles.dimSmallLeft}>
                            <Icon size={14} style={{ color: 'var(--bs-violet)', flexShrink: 0 }} />
                            <span className={styles.dimSmallName}>{dim.label}</span>
                            <Tooltip content={FRAMEWORK_TOOLTIPS[dim.key]} />
                          </div>
                          <div className={styles.dimSmallRight}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: col }}>{s}</span>
                            {isExpanded
                              ? <ChevronUp size={13} style={{ color: 'var(--bs-text-tertiary)' }} />
                              : <ChevronDown size={13} style={{ color: 'var(--bs-text-tertiary)' }} />}
                          </div>
                        </div>
                        <AnimatedBar score={s} color={col} delay={i * 80} />

                        {/* Justification — full text when expanded, two sentences when collapsed */}
                        {isExpanded ? (
                          justification && <p className={styles.dimExpandJust}>{justification}</p>
                        ) : (
                          justification && <p className={styles.dimSmallJust}>{getTwoSentences(justification)}</p>
                        )}

                        {/* Evidence quote — always visible */}
                        {evidenceQ && (
                          <p className={styles.dimSmallEvidence}>{evidenceQ}</p>
                        )}

                        {/* Improvement pill — always visible */}
                        {improvement && (
                          <span className={styles.improvePill}>
                            <ArrowUp size={10} style={{ marginRight: 4 }} />
                            {truncate(improvement, 90)}
                          </span>
                        )}

                        {/* Voice words — expanded only, tone_voice dim */}
                        {isExpanded && voiceWords.length > 0 && (
                          <div className={styles.voicePills}>
                            {voiceWords.map((w, wi) => (
                              <span key={wi} className={styles.voicePill}>{w}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </FadeUp>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ══ 4 — Key Findings ══ */}
        <section className={styles.sectionSpaced}>
          <h2 className={styles.sectionTitle}>Key findings</h2>
          <p className={styles.sectionSub}>The single biggest thing working for you — and against you</p>
          <div className={styles.findingsGrid}>

            <FadeUp>
              <div className={`${styles.findingCard} ${styles.findingStrength}`}>
                <div className={styles.findingBgNum} style={{ color: 'rgba(46,196,160,0.06)' }}>
                  {highestDimScore}
                </div>
                <div className={styles.findingHeader}>
                  <CheckCircle size={18} style={{ color: 'var(--bs-teal)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: 'var(--bs-teal)' }}>
                    Biggest Strength
                  </span>
                </div>
                <h3 className={styles.findingTitle}>{scoreData.biggest_strength || '—'}</h3>
                {evidence[0] && (
                  <>
                    <p className={styles.findingDetail}>{evidence[0].observation}</p>
                    <p className={styles.findingSource}>Source: {evidence[0].source}</p>
                  </>
                )}
              </div>
            </FadeUp>

            <FadeUp delay={80}>
              <div className={`${styles.findingCard} ${styles.findingGap}`}>
                <div className={styles.findingBgNum} style={{ color: 'rgba(232,98,42,0.06)' }}>
                  {Math.min(...DIM_CONFIG.map(d => dims[d.key]?.score || overall))}
                </div>
                <div className={styles.findingHeader}>
                  <AlertCircle size={18} style={{ color: 'var(--bs-orange)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: 'var(--bs-orange)' }}>
                    Biggest Gap
                  </span>
                </div>
                <h3 className={styles.findingTitle}>{scoreData.biggest_gap || '—'}</h3>
                {evidence[1] && (
                  <>
                    <p className={styles.findingDetail}>{evidence[1].observation}</p>
                    <p className={styles.findingSource}>Source: {evidence[1].source}</p>
                  </>
                )}
              </div>
            </FadeUp>

          </div>
        </section>

        {/* ══ 5 — Evidence ══ */}
        <section className={styles.sectionSpaced}>
          <h2 className={styles.sectionTitle}>The evidence</h2>
          <p className={styles.sectionSub}>Everything we found, pulled directly from your brand's actual content</p>
          <EvidenceSection scrapedData={scrapedData} evidenceQuotes={evidence} />
        </section>

        {/* ══ 6 — CTA ══ */}
        <section className={styles.ctaSection}>
          <h2 className={styles.ctaHeading}>Ready to close the gaps?</h2>
          <p className={styles.ctaSub}>Generate a strategic roadmap tailored to your goals</p>
          <button className={styles.ctaBtn} onClick={() => {
            trackEvent('roadmap_cta_clicked', { brand_name: intakeData?.brandName, overall_score: scoreData?.overall_score, location: 'results_bottom' });
            router.push('/roadmap');
          }}>
            Generate Roadmap →
          </button>
          <div className={styles.ctaBtnRow}>
            <button className={styles.ctaSecondaryBtn} onClick={() => window.print()}>
              <Download size={14} /> Save Report
            </button>
            <button className={styles.ctaSecondaryBtn} onClick={handleShare}>
              <Share2 size={14} /> Share
            </button>
          </div>
        </section>

      </div>

      <Toast visible={toastVisible} />

      {/* ── Share modal ── */}
      {shareModalUrl && (
        <div className={styles.modalOverlay} onClick={closeShareModal}>
          <div className={styles.shareModal} onClick={e => e.stopPropagation()}>
            <div className={styles.shareModalHeader}>
              <p className={styles.shareModalTitle}>Report link created</p>
              <button className={styles.shareModalClose} onClick={closeShareModal}>✕</button>
            </div>
            <div className={styles.shareModalUrlRow}>
              <input
                className={styles.shareModalInput}
                value={shareModalUrl}
                readOnly
                onClick={e => e.target.select()}
              />
              <button
                className={styles.shareModalCopy}
                onClick={() => {
                  navigator.clipboard.writeText(shareModalUrl).catch(() => {});
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }}
              >
                {shareCopied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
            <p className={styles.shareModalNote}>
              This link gives anyone view-only access to this report for 30 days
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
