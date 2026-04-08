'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, BarChart2, FileText, BookOpen, Map,
  Flame, CheckCircle, Calendar, Search, ArrowUp, ArrowDown,
  Lightbulb, Keyboard, TrendingUp, Copy, Lock,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip,
} from 'recharts';
import { useDashboard } from '@/hooks/useDashboard';
import styles from './dashboard.module.css';
import { trackPageView, trackEvent } from '@/lib/analytics';
import FadeIn from '@/components/FadeIn';
import EffortIcon from '@/components/EffortIcon';
import ConstitutionPlant from '@/components/ConstitutionPlant';
import RoadmapPath from '@/components/RoadmapPath';
import dynamic from 'next/dynamic';
const AnimatedBackground = dynamic(() => import('@/components/AnimatedBackground'), { ssr: false });

const ANIMATIONS = {
  focus:   'https://assets5.lottiefiles.com/packages/lf20_kkflmtur.json',
  city:    'https://assets9.lottiefiles.com/packages/lf20_qmfs6c3i.json',
  data:    'https://assets3.lottiefiles.com/packages/lf20_qp1q7mct.json',
  journey: 'https://assets5.lottiefiles.com/packages/lf20_kkflmtur.json',
  idea:    'https://assets2.lottiefiles.com/packages/lf20_touohxv0.json',
  voice:   'https://assets4.lottiefiles.com/packages/lf20_0yfsb3a1.json',
  trend:   'https://assets6.lottiefiles.com/packages/lf20_kyu7xb1v.json',
};

// ── Helpers ──────────────────────────────────────────────────
function scoreColor(s) {
  if (!s) return 'var(--bs-text-tertiary)';
  if (s >= 65) return 'var(--bs-teal)';
  if (s >= 45) return 'var(--bs-amber)';
  return 'var(--destructive)';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatScoreDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (date.toDateString() === today.toDateString()) return 'today';
  if (date.toDateString() === yesterday.toDateString()) return 'yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function truncate(str, n) {
  if (!str) return '';
  return str.length <= n ? str : str.slice(0, n) + '…';
}

// ── Score ring (80px) with glow ──────────────────────────────
function MiniScoreRing({ score }) {
  const [offset, setOffset] = useState(251.2);
  const circ = 251.2;

  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - (score / 100) * circ), 200);
    return () => clearTimeout(t);
  }, [score, circ]);

  const col = scoreColor(score);
  const glowColor =
    score >= 65 ? 'rgba(46,196,160,0.18)' :
    score >= 45 ? 'rgba(232,160,48,0.18)' :
                  'rgba(212,24,61,0.14)';
  const pulsing = score < 45;

  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      {/* Glow halo */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 110, height: 110, borderRadius: '50%',
        background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
        animation: pulsing ? 'pulse-glow 2s ease-in-out infinite' : 'none',
      }} />
      <svg viewBox="0 0 100 100" width="80" height="80" style={{ position: 'relative', zIndex: 1 }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle cx="50" cy="50" r="40" fill="none"
          stroke={col} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out', transformOrigin: 'center', transform: 'rotate(-90deg)' }}
        />
        <text x="50" y="55" textAnchor="middle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fill: col }}>
          {score ?? '—'}
        </text>
      </svg>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Animated bar ─────────────────────────────────────────────
function AnimBar({ score, delay = 0 }) {
  const [w, setW] = useState(0);
  const col = scoreColor(score);
  useEffect(() => {
    const t = setTimeout(() => setW(score), delay);
    return () => clearTimeout(t);
  }, [score, delay]);
  return (
    <div className={styles.miniBarBg}>
      <div className={styles.miniBarFill} style={{ width: `${w}%`, background: col, transition: 'width 0.8s ease' }} />
    </div>
  );
}

// ── Recharts custom tooltip ──────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  const dateStr = isNaN(d) ? label : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <div className={styles.chartTooltip}>
      <p className={styles.chartTooltipDate}>{dateStr}</p>
      <p className={styles.chartTooltipScore}>{payload[0].value}</p>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────
function Skeleton({ h }) {
  return <div className={styles.skeleton} style={{ height: h }} />;
}

function LoadingSkeleton() {
  return (
    <div className={styles.mainContent}>
      <div className={styles.topBar}>
        <div>
          <Skeleton h={32} />
          <div style={{ marginTop: 6 }}><Skeleton h={16} /></div>
        </div>
        <Skeleton h={40} />
      </div>
      <Skeleton h={100} />
      <div style={{ marginTop: 20 }} className={styles.scoreBriefGrid}>
        <Skeleton h={240} />
        <Skeleton h={240} />
      </div>
      <div style={{ marginTop: 20 }} className={styles.roadmapConstitGrid}>
        <Skeleton h={200} />
        <Skeleton h={200} />
      </div>
      <div style={{ marginTop: 20 }}><Skeleton h={120} /></div>
      <div style={{ marginTop: 20 }} className={styles.quickActionsGrid}>
        {[0,1,2,3].map(i => <Skeleton key={i} h={100} />)}
      </div>
    </div>
  );
}

// ── Error state ──────────────────────────────────────────────
function ErrorState({ error, onAction }) {
  const config = {
    no_brand:  { heading: 'No brand found',          sub: 'Run a brand audit to get started',                          btn: 'Run Brand Audit →', action: onAction },
    not_found: { heading: 'Brand profile not found', sub: "We couldn't find your brand data. Try running a new audit.", btn: 'Run Brand Audit →', action: onAction },
    failed:    { heading: 'Something went wrong',    sub: 'Failed to load your dashboard. Please refresh the page.',   btn: 'Refresh',           action: () => window.location.reload() },
  }[error] || { heading: 'Error', sub: 'Unknown error', btn: 'Go back', action: onAction };

  return (
    <div className={styles.errorState}>
      <LayoutDashboard size={40} style={{ color: 'var(--bs-text-tertiary)' }} />
      <h2 className={styles.errorHeading}>{config.heading}</h2>
      <p className={styles.errorSub}>{config.sub}</p>
      <button className={styles.errorBtn} onClick={config.action}>{config.btn}</button>
    </div>
  );
}

// ── Exit interview modal ──────────────────────────────────────
function ExitModal({ taskText, onSave, onClose }) {
  const [didIt, setDidIt] = useState('');
  const [what, setWhat]   = useState('');
  const [diff, setDiff]   = useState('');

  function handleSave() {
    if (!didIt) return;
    onSave({ didIt, what, diff });
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <h2 className={styles.modalHeading}>Task complete 🎯</h2>
        <p className={styles.modalSub}>Quick debrief — takes 60 seconds</p>

        {taskText && (
          <p className={styles.modalTaskText}>&ldquo;{taskText}&rdquo;</p>
        )}

        <p className={styles.modalLabel}>Did you complete this task?</p>
        <div className={styles.pillRow}>
          {['Yes ✓', 'Partially', 'Not yet'].map(opt => (
            <button key={opt}
              className={`${styles.pill} ${didIt === opt ? styles.pillActive : ''}`}
              onClick={() => setDidIt(opt)}>
              {opt}
            </button>
          ))}
        </div>

        <p className={styles.modalLabel} style={{ marginTop: 20 }}>What happened?</p>
        <textarea className={styles.modalTextarea}
          value={what} onChange={e => setWhat(e.target.value)}
          placeholder="What result did you see?" style={{ height: 80 }} />

        <p className={styles.modalLabel} style={{ marginTop: 16 }}>What would you do differently?</p>
        <textarea className={styles.modalTextarea}
          value={diff} onChange={e => setDiff(e.target.value)}
          placeholder="Optional" style={{ height: 60 }} />

        <div className={styles.modalBtnRow}>
          <button className={styles.modalSkip} onClick={onClose}>Skip</button>
          <button className={styles.modalSave} onClick={handleSave} disabled={!didIt}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Content Idea Card ─────────────────────────────────────────
function ContentIdeaCard({ profile, initialIdea }) {
  const [idea, setIdea] = useState(initialIdea);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function generateIdea() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tools/content-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: profile.brand_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setIdea(data.idea);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyIdea() {
    if (!idea?.idea) return;
    navigator.clipboard.writeText(idea.idea);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={styles.toolCard} style={{
      position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(ellipse at top right, rgba(232,160,48,0.09) 0%, var(--bs-card-dark) 65%)',
      borderColor: 'rgba(232,160,48,0.2)',
    }}>
      <AnimatedBackground src={ANIMATIONS.idea} opacity={0.08} speed={0.5} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className={styles.toolCardHeader}>
          <div className={styles.toolCardHeaderLeft}>
            <Lightbulb size={16} style={{ color: 'var(--bs-amber)', flexShrink: 0 }} />
            <span className={styles.toolCardLabel}>Content Idea</span>
          </div>
          <span className={styles.toolPillAmber}>Today</span>
        </div>

        {error && (
          <div className={styles.toolError}>
            Could not load — try again
            <button className={styles.toolErrorRetry} onClick={generateIdea}>Retry</button>
          </div>
        )}

        <div className={styles.ideaBody}>
          {idea ? (
            <>
              <p className={styles.ideaText}>{idea.idea}</p>
              <span className={styles.ideaFormatTag}>
                {idea.format} · {idea.theme}
                {idea.why && <span className={styles.ideaTooltip}>Why this works: {idea.why}</span>}
              </span>
            </>
          ) : (
            <div className={styles.ideaEmpty}>
              {loading ? 'Generating your idea…' : 'Generate your first content idea'}
            </div>
          )}
        </div>

        <div className={styles.toolCardFooter}>
          {idea && (
            <button className={styles.toolBtnGhost} onClick={copyIdea}>
              <Copy size={12} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button className={styles.toolBtnAmber} onClick={generateIdea} disabled={loading}>
            {loading ? <><span className={styles.spinner} /> Generating…</> : 'New idea →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Voice Check Card ──────────────────────────────────────────
function VoiceCheckCard({ profile, constitutionAnswered, initialUsage, router }) {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState(initialUsage);

  const isLocked = constitutionAnswered < 5;

  async function checkVoice() {
    if (!inputText.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tools/voice-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: profile.brand_name, inputText }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'daily_limit_reached') {
          setError('Daily limit of 10 rewrites reached. Resets tomorrow.');
        } else {
          throw new Error(data.error || 'Failed');
        }
        return;
      }
      setResult({ original: inputText, ...data });
      if (data.usage) setUsage(data.usage);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyRewrite() {
    if (!result?.rewritten) return;
    navigator.clipboard.writeText(result.rewritten);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={styles.toolCard} style={{
      position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(ellipse at top right, rgba(124,92,191,0.11) 0%, var(--bs-card-dark) 65%)',
      borderColor: 'rgba(124,92,191,0.25)',
    }}>
      <AnimatedBackground src={ANIMATIONS.voice} opacity={0.06} speed={0.7} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className={styles.toolCardHeader}>
          <div className={styles.toolCardHeaderLeft}>
            <Keyboard size={16} style={{ color: 'var(--bs-violet)', flexShrink: 0 }} />
            <span className={styles.toolCardLabel}>Voice Check</span>
          </div>
          <span className={styles.toolUsageLabel}>{usage.count} / {usage.limit} today</span>
        </div>

        {error && (
          <div className={styles.toolError}>
            {error}
            {error.includes('limit') ? null : (
              <button className={styles.toolErrorRetry} onClick={() => setError('')}>Dismiss</button>
            )}
          </div>
        )}

        {isLocked ? (
          <div className={styles.toolLockedState}>
            <Lock size={24} style={{ color: 'var(--bs-text-tertiary)' }} />
            <p className={styles.toolLockedText}>Complete your Brand Constitution to unlock voice checking</p>
            <button className={styles.toolLockedLink} onClick={() => router.push('/constitution')}>
              Complete Constitution →
            </button>
          </div>
        ) : result ? (
          <>
            <div className={styles.voiceResultPanels}>
              <div className={`${styles.voicePanel} ${styles.voicePanelOriginal}`}>
                <p className={`${styles.voicePanelLabel} ${styles.voicePanelLabelOriginal}`}>YOUR VERSION</p>
                <p className={styles.voicePanelText}>{result.original}</p>
              </div>
              <div className={`${styles.voicePanel} ${styles.voicePanelRewritten}`}>
                <p className={`${styles.voicePanelLabel} ${styles.voicePanelLabelRewritten}`}>BRAND VOICE</p>
                <p className={`${styles.voicePanelText} ${styles.voicePanelTextRewritten}`}>{result.rewritten}</p>
                <span className={styles.voiceScoreBadge}>Voice score: {result.voice_score}/10</span>
              </div>
            </div>
            <div className={styles.voiceResultFooter}>
              <button className={styles.toolBtnGhost} onClick={copyRewrite}>
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy rewrite'}
              </button>
              <button className={styles.voiceResetBtn} onClick={() => { setResult(null); setInputText(''); }}>
                Try another →
              </button>
            </div>
          </>
        ) : (
          <>
            <textarea
              className={styles.voiceTextarea}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Paste any copy — caption, email, website line — and see it rewritten in your brand voice..."
              disabled={loading}
            />
            <button
              className={styles.voiceCheckBtn}
              onClick={checkVoice}
              disabled={!inputText.trim() || loading || usage.count >= usage.limit}
            >
              {loading ? <><span className={styles.spinner} /> Checking…</> : 'Check my voice →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Trend Fit Card ────────────────────────────────────────────
function TrendFitCard({ profile, initialTrends, trendsGeneratedAt }) {
  const [trends, setTrends] = useState(initialTrends || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(trendsGeneratedAt);

  async function refreshTrends() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tools/trend-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: profile.brand_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setTrends(data.trends || []);
      setGeneratedAt(new Date().toISOString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const daysSince = generatedAt
    ? Math.floor((Date.now() - new Date(generatedAt).getTime()) / 86400000)
    : null;

  const fitClass = { use: styles.trendFitUse, avoid: styles.trendFitAvoid, test: styles.trendFitTest };
  const fitLabel = { use: 'Use it', avoid: 'Avoid', test: 'Test it' };

  return (
    <div className={styles.toolCard} style={{
      position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(ellipse at top right, rgba(46,196,160,0.08) 0%, var(--bs-card-dark) 65%)',
      borderColor: 'rgba(46,196,160,0.2)',
    }}>
      <AnimatedBackground src={ANIMATIONS.trend} opacity={0.06} speed={0.5} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className={styles.toolCardHeader}>
          <div className={styles.toolCardHeaderLeft}>
            <TrendingUp size={16} style={{ color: 'var(--bs-teal)', flexShrink: 0 }} />
            <span className={styles.toolCardLabel}>Trend Fit</span>
          </div>
          <span className={styles.toolPillTeal}>This week</span>
        </div>

        {error && (
          <div className={styles.toolError}>
            Could not load — try again
            <button className={styles.toolErrorRetry} onClick={refreshTrends}>Retry</button>
          </div>
        )}

        <div className={styles.trendList}>
          {trends.length > 0 ? trends.slice(0, 3).map((trend, i) => (
            <div key={i} className={styles.trendRow} onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}>
              <div className={styles.trendRowMain}>
                <span className={styles.trendName}>{trend.name}</span>
                <span className={`${styles.trendFitBadge} ${fitClass[trend.fit] || styles.trendFitTest}`}>
                  {fitLabel[trend.fit] || 'Test it'}
                </span>
              </div>
              {expandedIdx === i && trend.reason && (
                <p className={styles.trendReason}>{trend.reason}</p>
              )}
            </div>
          )) : (
            <div className={styles.trendEmpty}>
              {loading ? 'Checking trends…' : 'Tap refresh to see current trends'}
            </div>
          )}
        </div>

        <div className={styles.trendFooter}>
          <button className={styles.toolBtnGhost} onClick={refreshTrends} disabled={loading}>
            {loading ? <><span className={styles.spinner} /> Checking…</> : 'Refresh trends →'}
          </button>
          {daysSince !== null && (
            <span className={styles.trendLastUpdated}>
              {daysSince === 0 ? 'Updated today' : `Updated ${daysSince}d ago`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const {
    profile, isLoading, error,
    contentIdea, trends, voiceCheckUsage,
    todayTask, currentWeek, streak,
    latestBrief, isBriefNew,
    scoreHistory, latestScore, latestDimensions, scoreDelta,
    constitutionProgress, todayQuestion,
    isGeneratingBrief,
    markTaskDone, saveConstitutionAnswer, markBriefOpened, generateBriefNow,
  } = useDashboard();

  const [modalOpen, setModalOpen]       = useState(false);
  const [modalTaskIdx, setModalTaskIdx] = useState(null);
  const [toast, setToast]               = useState('');
  const [answer, setAnswer]             = useState('');
  const [answerSaved, setAnswerSaved]   = useState(false);

  // Track page view on mount
  useEffect(() => {
    if (!isLoading && profile) {
      trackPageView('dashboard');
      trackEvent('dashboard_opened', {
        brand_name: profile?.brand_name,
        current_week: profile?.current_week,
        streak: profile?.pulse_streak,
      });
    }
  }, [isLoading, profile]);

  // Redirect to results if no roadmap yet
  useEffect(() => {
    if (!isLoading && profile && !profile.current_roadmap) {
      router.replace('/results?message=complete_roadmap');
    }
  }, [profile, isLoading, router]);

  // Mark brief opened on mount when new
  useEffect(() => {
    if (isBriefNew) markBriefOpened();
  }, [isBriefNew]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function openModal(idx) {
    setModalTaskIdx(idx);
    setModalOpen(true);
  }

  function handleModalSave(result) {
    setModalOpen(false);
    const task = weekTasks[modalTaskIdx];
    trackEvent('task_completed', {
      brand_name: profile?.brand_name,
      week: currentWeek,
      effort: task?.effort,
      did_it: result.didIt,
    });
    markTaskDone(modalTaskIdx, {
      did_it:           result.didIt,
      what_happened:    result.what,
      what_differently: result.diff,
    });
    showToast('Task marked complete 🎉');
  }

  function handleGenerateBrief() {
    trackEvent('monday_brief_generated', {
      brand_name: profile?.brand_name,
      triggered_by: 'manual',
    });
    generateBriefNow();
  }

  async function handleSaveAnswer() {
    if (!answer.trim() || !todayQuestion) return;
    await saveConstitutionAnswer(todayQuestion.question, answer);
    trackEvent('constitution_answered', {
      brand_name: profile?.brand_name,
      questions_completed: (constitutionProgress?.answered ?? 0) + 1,
    });
    setAnswerSaved(true);
    setTimeout(() => setAnswerSaved(false), 2000);
    setAnswer('');
  }

  // Tasks for current week
  const weekTasks = (profile?.tasks || [])
    .filter(t => t.week === currentWeek)
    .slice(0, 3);
  const doneCount  = weekTasks.filter(t => t.status === 'done').length;
  const totalTasks = weekTasks.length;

  // Fix 1 — dimension bars use per-dimension scores from latest score_history
  const dimensionConfig = [
    { key: 'visual_identity',        label: 'Visual',      score: latestDimensions?.visual_identity?.score        ?? latestScore ?? 50 },
    { key: 'tone_voice',             label: 'Voice',       score: latestDimensions?.tone_voice?.score             ?? latestScore ?? 50 },
    { key: 'trend_relevance',        label: 'Trends',      score: latestDimensions?.trend_relevance?.score        ?? latestScore ?? 50 },
    { key: 'competitor_positioning', label: 'Positioning', score: latestDimensions?.competitor_positioning?.score ?? latestScore ?? 50 },
    { key: 'audience_alignment',     label: 'Audience',    score: latestDimensions?.audience_alignment?.score     ?? latestScore ?? 50 },
  ];

  // Score history chart data
  const chartData = scoreHistory.map(e => ({
    date:          e.date,
    overall_score: e.overall_score,
  }));
  const scores   = chartData.map(d => d.overall_score);
  const minScore = scores.length ? Math.min(...scores) : 0;
  const maxScore = scores.length ? Math.max(...scores) : 100;

  // Today task index in original array
  const todayTaskIdx = profile?.tasks?.findIndex(t => t.status === 'todo') ?? -1;

  // Brand color (from DB or default violet)
  const brandColor = profile?.brand_color || '#7C5CBF';

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className={styles.mainContent}>
        <ErrorState error={error} onAction={() => router.push('/audit')} />
      </div>
    );
  }

  return (
    <>
    <main className={styles.mainContent} style={{ '--bs-brand': brandColor }}>

        {/* ── Top bar ── */}
        <div className={styles.topBar}>
          <div>
            <h1 className={styles.greeting}>{greeting()}, {profile?.brand_name}</h1>
            <p className={styles.dateStr}>{formatDate()}</p>
          </div>
          <button className={styles.newAuditBtn} onClick={() => router.push('/audit')}>
            + New Audit
          </button>
        </div>

        {/* ── 1. Today's focus ── */}
        <FadeIn delay={0}>
        <div className={styles.focusCard} style={{ position: 'relative', overflow: 'hidden', borderColor: `${brandColor}33` }}>
          <AnimatedBackground src={ANIMATIONS.focus} opacity={0.06} speed={0.4} />
          {/* Background treatment */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(232,98,42,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(124,92,191,0.04) 0%, transparent 50%)',
            pointerEvents: 'none', zIndex: 0,
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
          {todayTask ? (
            <div className={styles.focusInner}>
              <div className={styles.focusLeft}>
                <p className={styles.focusSectionLabel}>TODAY'S FOCUS</p>
                <p className={styles.focusTask}>{todayTask.task}</p>
                <div className={styles.focusMeta}>
                  <span className={styles.effortBadge} data-effort={todayTask.effort}>
                    {todayTask.effort
                      ? todayTask.effort.charAt(0).toUpperCase() + todayTask.effort.slice(1)
                      : 'Task'}
                  </span>
                  <span className={styles.weekTag}>Week {currentWeek} of 8</span>
                </div>
              </div>
              <div className={styles.focusRight}>
                {streak > 0 && (
                  <div className={styles.streakDisplay}>
                    <Flame size={20} style={{ color: 'var(--bs-amber)' }} />
                    <span className={styles.streakNum}>{streak}</span>
                    <span className={styles.streakLabel}>day streak</span>
                  </div>
                )}
                <button className={styles.markDoneBtn}
                  onClick={() => todayTaskIdx !== -1 && openModal(todayTaskIdx)}>
                  Mark done →
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.focusEmpty}>
              <CheckCircle size={20} style={{ color: 'var(--bs-teal)' }} />
              <span>All tasks for this week are complete</span>
            </div>
          )}
          {/* Effort illustration */}
          {todayTask?.effort && (
            <div style={{ position: 'absolute', bottom: 12, right: 16, opacity: 0.45, zIndex: 1 }}>
              <EffortIcon effort={todayTask.effort} size={36} />
            </div>
          )}
          </div>
        </div>
        </FadeIn>

        {/* ── 2. Score + Monday brief ── */}
        <FadeIn delay={100}>
        <div className={styles.scoreBriefGrid}>

          {/* Score card */}
          <div className={styles.card} style={{ position: 'relative', overflow: 'hidden' }}>
            <AnimatedBackground src={ANIMATIONS.data} opacity={0.05} speed={0.6} />
            <div style={{ position: 'relative', zIndex: 1 }}>
            <div className={styles.cardHeaderRow}>
              <span className={styles.cardLabel}>Brand Score</span>
              <span className={styles.cardMeta}>Refreshes Monday</span>
            </div>
            <div className={styles.scoreRingRow}>
              <MiniScoreRing score={latestScore} />
              <div className={styles.scoreInfo}>
                {profile?.score_json?.verdict && (
                  <p className={styles.scoreVerdict}>
                    {truncate(profile.score_json.verdict.split('.')[0], 100)}
                  </p>
                )}
                {scoreDelta !== null && scoreDelta !== 0 && (
                  <div className={styles.scoreDeltaRow}>
                    {scoreDelta >= 0
                      ? <ArrowUp size={12} style={{ color: 'var(--bs-teal)' }} />
                      : <ArrowDown size={12} style={{ color: 'var(--destructive)' }} />}
                    <span style={{ color: scoreDelta >= 0 ? 'var(--bs-teal)' : 'var(--destructive)', fontSize: 12, fontFamily: 'var(--font-ui)' }}>
                      {scoreDelta > 0 ? '+' : ''}{scoreDelta} since last audit
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.dimBars}>
              {dimensionConfig.map((dim, i) => (
                <div key={dim.key} className={styles.dimBarRow}>
                  <span className={styles.dimBarLabel}>{dim.label}</span>
                  <AnimBar score={dim.score} delay={i * 80} />
                  <span className={styles.dimBarScore}>{dim.score}</span>
                </div>
              ))}
            </div>
            </div>
          </div>

          {/* Monday brief card */}
          <div className={styles.card} style={{ position: 'relative', overflow: 'hidden' }}>
            <AnimatedBackground src={ANIMATIONS.city} opacity={0.05} speed={0.3} blur={true} />
            {/* Newsprint texture when brief exists */}
            {latestBrief && (
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,255,255,0.018) 23px, rgba(255,255,255,0.018) 24px)',
                pointerEvents: 'none', zIndex: 0,
              }} />
            )}
            <div style={{ position: 'relative', zIndex: 1 }}>
            <div className={styles.cardHeaderRow}>
              <span className={styles.briefTitle}>Monday Brief</span>
              {isBriefNew && <span className={styles.newBadge}>New</span>}
            </div>

            {latestBrief ? (
              <>
                <div className={styles.briefSections}>
                  {[
                    { label: 'CATEGORY PULSE',    text: latestBrief.category_pulse           },
                    { label: 'THIS WEEK',          text: latestBrief.priority_task            },
                    { label: 'CONTENT IDEA',       text: latestBrief.content_ideas?.[0]       },
                    { label: 'THIS WEEK IN INDIA', text: latestBrief.this_week_in_india       },
                    { label: 'SCORE OBSERVATION',  text: latestBrief.score_observation        },
                  ].filter(s => s.text).map((section, i) => (
                    <div key={i} className={styles.briefSection}>
                      <p className={styles.briefSectionLabel}>{section.label}</p>
                      <p className={styles.briefSectionText}>{truncate(section.text, 100)}</p>
                    </div>
                  ))}
                </div>
                <div className={styles.briefFooter}>
                  {latestBrief.date && (
                    <span className={styles.briefDate}>
                      Generated {new Date(latestBrief.date).toLocaleDateString('en-GB', {
                        weekday: 'long', day: 'numeric', month: 'long',
                      })}
                    </span>
                  )}
                  <button
                    className={styles.briefRefreshBtn}
                    onClick={handleGenerateBrief}
                    disabled={isGeneratingBrief}
                  >
                    {isGeneratingBrief ? 'Generating…' : 'Generate fresh brief →'}
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.briefEmpty}>
                <Calendar size={24} style={{ color: 'var(--bs-text-tertiary)' }} />
                <p className={styles.briefEmptyMain}>Your Monday Brief will appear here</p>
                <p className={styles.briefEmptySub}>Briefs are generated every Sunday night</p>
                <button
                  className={styles.briefGenerateBtn}
                  onClick={handleGenerateBrief}
                  disabled={isGeneratingBrief}
                >
                  {isGeneratingBrief ? 'Generating…' : 'Generate brief now'}
                </button>
              </div>
            )}
            </div>
          </div>

        </div>
        </FadeIn>

        {/* ── 3. Roadmap + Constitution ── */}
        <FadeIn delay={200}>
        <div className={styles.roadmapConstitGrid}>

          {/* Roadmap card */}
          <div className={styles.card} style={{ position: 'relative', overflow: 'hidden' }}>
            <AnimatedBackground src={ANIMATIONS.journey} opacity={0.04} speed={0.3} />
            <div style={{ position: 'relative', zIndex: 1 }}>
            <div className={styles.roadmapHeader}>
              <span className={styles.roadmapTitle}>Roadmap</span>
              <span className={styles.roadmapWeekLabel}>Week {currentWeek} of 8</span>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 8 }}>
              <div style={{ width: 80, flexShrink: 0 }}>
                <RoadmapPath currentWeek={currentWeek} tasks={profile?.tasks || []} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.taskList}>
                  {weekTasks.length > 0 ? weekTasks.map((task, i) => {
                    const isDone = task.status === 'done';
                    const origIdx = profile?.tasks?.indexOf(task) ?? i;
                    return (
                      <div key={i} className={styles.taskItem}>
                        <div
                          className={`${styles.taskCheck} ${isDone ? styles.taskCheckDone : ''}`}
                          onClick={() => !isDone && openModal(origIdx)}
                        >
                          {isDone && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                        <p className={`${styles.taskText} ${isDone ? styles.taskTextDone : ''}`}>{task.task}</p>
                      </div>
                    );
                  }) : (
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--bs-text-tertiary)' }}>
                      No tasks for this week yet.
                    </p>
                  )}
                </div>
                {totalTasks > 0 && (
                  <>
                    <div className={styles.taskProgressBar}>
                      <div className={styles.taskProgressFill} style={{ width: `${(doneCount / totalTasks) * 100}%` }} />
                    </div>
                    <p className={styles.taskProgressLabel}>{doneCount} of {totalTasks} tasks complete this week</p>
                  </>
                )}
                <span className={styles.viewRoadmapLink} onClick={() => router.push('/roadmap')}>
                  View full roadmap →
                </span>
              </div>
            </div>
            </div>
          </div>

          {/* Constitution card */}
          <div className={styles.card}>
            <p className={styles.constitTitle}>Brand Constitution</p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 8 }}>
              <ConstitutionPlant answered={constitutionProgress.answered} total={20} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {constitutionProgress.answered < 5 && (
                  <div className={styles.constitPrompt}>
                    <p className={styles.constitPromptText}>
                      Complete your Brand Constitution to unlock personalised insights
                    </p>
                    <button className={styles.constitPromptBtn} onClick={() => router.push('/constitution')}>
                      Complete now →
                    </button>
                  </div>
                )}
                {todayQuestion && (
                  <div className={styles.questionBox}>
                    <p className={styles.questionLabel}>TODAY'S QUESTION</p>
                    <p className={styles.questionText}>{todayQuestion.question}</p>
                    <textarea
                      className={styles.questionTextarea}
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Answer in 2 minutes..."
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <button className={styles.questionSaveBtn} onClick={handleSaveAnswer}>
                        {answerSaved ? 'Saved ✓' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
        </FadeIn>

        {/* ── 4. Brand Tools ── */}
        <FadeIn delay={300}>
        <div style={{ marginBottom: 4 }}>
          <p className={styles.brandToolsHeading}>Brand Tools</p>
          <p className={styles.brandToolsSub}>Daily tools personalised to your brand</p>
        </div>
        <div className={styles.toolsGrid}>
          <ContentIdeaCard profile={profile} initialIdea={contentIdea} />
          <VoiceCheckCard
            profile={profile}
            constitutionAnswered={constitutionProgress.answered}
            initialUsage={voiceCheckUsage}
            router={router}
          />
          <TrendFitCard
            profile={profile}
            initialTrends={trends}
            trendsGeneratedAt={profile?.trends_generated_at}
          />
        </div>
        </FadeIn>

        {/* ── 5. Score history ── */}
        <FadeIn delay={400}>
        <div className={styles.card} style={{ marginBottom: 20 }}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.briefTitle}>Score history</span>
            <span className={styles.cardMeta}>Updates every Monday</span>
          </div>
          {scoreHistory.length >= 3 ? (
            <div style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7C5CBF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C5CBF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={v => { const d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }}
                    tick={{ fill: '#4A4868', fontSize: 10 }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    domain={[Math.max(0, minScore - 10), Math.min(100, maxScore + 10)]}
                    tick={{ fill: '#4A4868', fontSize: 10 }}
                    axisLine={false} tickLine={false} width={28}
                  />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone" dataKey="overall_score"
                    stroke="#7C5CBF" strokeWidth={2}
                    fill="url(#scoreGradient)"
                    dot={{ fill: '#7C5CBF', r: 4, strokeWidth: 2, stroke: '#08080E' }}
                    activeDot={{ r: 6 }}
                    isAnimationActive animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--bs-text-tertiary)', textAlign: 'right', marginTop: 8 }}>
                Each point = one week · Score updates every Monday
              </p>
            </div>
          ) : (
            <div className={styles.chartEmpty}>
              <p className={styles.chartEmptyMain}>Score history builds over time</p>
              <p className={styles.chartEmptySub}>
                {scoreHistory.length} of 3 data points collected so far · Refreshes every Monday
              </p>
            </div>
          )}
        </div>
        </FadeIn>

        {/* ── 6. Quick actions ── */}
        <FadeIn delay={500}>
        <div className={styles.quickActionsGrid}>
          {[
            { icon: FileText,  label: 'Stakeholder report', sub: 'Download PDF',        href: '/reports'      },
            { icon: Search,    label: 'New audit',          sub: 'Re-analyse brand',    href: '/audit'        },
            { icon: Map,       label: 'Full roadmap',       sub: 'View all 8 weeks',    href: '/roadmap'      },
            { icon: BookOpen,  label: 'Constitution',       sub: 'Continue building',   href: '/constitution' },
          ].map(({ icon: Icon, label, sub, href }) => (
            <div key={label} className={styles.quickCard} onClick={() => router.push(href)}>
              <Icon size={22} style={{ color: 'var(--bs-violet)', marginBottom: 10 }} />
              <p className={styles.quickLabel}>{label}</p>
              <p className={styles.quickSub}>{sub}</p>
            </div>
          ))}
        </div>
        </FadeIn>

      </main>

      {/* ── Exit interview modal ── */}
      {modalOpen && (
        <ExitModal
          taskText={profile?.tasks?.[modalTaskIdx]?.task}
          onSave={handleModalSave}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* ── Toast ── */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* ── Mobile bottom nav ── */}
      <nav className={styles.mobileNav}>
        {[
          { icon: LayoutDashboard, label: 'Home',     href: '/dashboard' },
          { icon: BarChart2,       label: 'Score',    href: '/results'   },
          { icon: BookOpen,        label: 'Menu',     href: '/constitution' },
        ].map(({ icon: Icon, label, href }) => (
          <button key={href} className={styles.mobileNavTab}
            onClick={() => router.push(href)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

