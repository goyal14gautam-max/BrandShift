'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Map, BarChart2, FileText, BookOpen, Settings,
  Flame, CheckCircle, Calendar, Search, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip,
} from 'recharts';
import { useDashboard } from '@/hooks/useDashboard';
import styles from './dashboard.module.css';
import { trackPageView, trackEvent } from '@/lib/analytics';

// ── Constants ────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard'   },
  { icon: Map,             label: 'Roadmap',      href: '/roadmap'     },
  { icon: BarChart2,       label: 'Brand Score',  href: '/results'     },
  { icon: FileText,        label: 'Reports',      href: '/reports'     },
  { icon: BookOpen,        label: 'Constitution', href: '/constitution' },
  { icon: Settings,        label: 'Settings',     href: '/settings'    },
];

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

// ── Score ring (80px) ────────────────────────────────────────
function MiniScoreRing({ score }) {
  const [offset, setOffset] = useState(251.2);
  const circ = 251.2;

  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - (score / 100) * circ), 200);
    return () => clearTimeout(t);
  }, [score, circ]);

  const col = scoreColor(score);
  return (
    <svg viewBox="0 0 100 100" width="80" height="80" style={{ flexShrink: 0 }}>
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

// ── Main dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const {
    profile, isLoading, error,
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
  const [activeNav, setActiveNav]       = useState('/dashboard');

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

  if (isLoading) {
    return (
      <div className={styles.layout}>
        <Sidebar profile={null} latestScore={null} scoreDelta={null} activeNav={activeNav} router={router} setActiveNav={setActiveNav} />
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.layout}>
        <Sidebar profile={null} latestScore={null} scoreDelta={null} activeNav={activeNav} router={router} setActiveNav={setActiveNav} />
        <div className={styles.mainContent}>
          <ErrorState error={error} onAction={() => router.push('/audit')} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Sidebar
        profile={profile}
        latestScore={latestScore}
        scoreDelta={scoreDelta}
        activeNav={activeNav}
        router={router}
        setActiveNav={setActiveNav}
      />

      <main className={styles.mainContent}>

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
        <div className={styles.focusCard}>
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
        </div>

        {/* ── 2. Score + Monday brief ── */}
        <div className={styles.scoreBriefGrid}>

          {/* Score card */}
          <div className={styles.card}>
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

          {/* Monday brief card */}
          <div className={styles.card}>
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

        {/* ── 3. Roadmap + Constitution ── */}
        <div className={styles.roadmapConstitGrid}>

          {/* Roadmap card */}
          <div className={styles.card}>
            <div className={styles.roadmapHeader}>
              <span className={styles.roadmapTitle}>Roadmap</span>
              <span className={styles.roadmapWeekLabel}>Week {currentWeek} of 8</span>
            </div>

            <div className={styles.weekDots}>
              {Array.from({ length: 8 }, (_, i) => {
                const w = i + 1;
                const done    = w < currentWeek;
                const current = w === currentWeek;
                return (
                  <div key={w} className={`${styles.weekDot} ${done ? styles.weekDotDone : current ? styles.weekDotCurrent : styles.weekDotFuture}`}>
                    {done
                      ? <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="var(--bs-teal)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{w}</span>}
                  </div>
                );
              })}
            </div>

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
                    <p className={`${styles.taskText} ${isDone ? styles.taskTextDone : ''}`}>
                      {task.task}
                    </p>
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

          {/* Constitution card */}
          <div className={styles.card}>
            <p className={styles.constitTitle}>Brand Constitution</p>

            <div className={styles.constitProgressRow}>
              <span className={styles.constitProgressLabel}>
                {constitutionProgress.answered} of 20 questions answered
              </span>
              <span className={styles.constitPct}>
                {Math.round((constitutionProgress.answered / 20) * 100)}%
              </span>
            </div>
            <div className={styles.constitBar}>
              <div className={styles.constitBarFill}
                style={{ width: `${(constitutionProgress.answered / 20) * 100}%` }} />
            </div>

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

        {/* ── 4. Score history ── */}
        <div className={styles.card} style={{ marginBottom: 20 }}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.briefTitle}>Score history</span>
            <span className={styles.cardMeta}>Updates every Monday</span>
          </div>

          {scoreHistory.length >= 3 ? (
            <div style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
                  <Line
                    type="monotone" dataKey="overall_score"
                    stroke="#7C5CBF" strokeWidth={2}
                    dot={{ fill: '#7C5CBF', r: 4, strokeWidth: 2, stroke: '#08080E' }}
                    activeDot={{ r: 6 }}
                    isAnimationActive
                  />
                </LineChart>
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

        {/* ── 5. Quick actions ── */}
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
          { icon: Map,             label: 'Roadmap',  href: '/roadmap'   },
          { icon: BarChart2,       label: 'Score',    href: '/results'   },
          { icon: BookOpen,        label: 'Menu',     href: '/constitution' },
        ].map(({ icon: Icon, label, href }) => (
          <button key={href} className={`${styles.mobileNavTab} ${activeNav === href ? styles.mobileNavTabActive : ''}`}
            onClick={() => { setActiveNav(href); router.push(href); }}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ profile, latestScore, scoreDelta, activeNav, router, setActiveNav }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>
        <p className={styles.logoText}>BrandShift</p>
        {profile?.brand_name && (
          <p className={styles.logoBrand}>{profile.brand_name}</p>
        )}
        {profile?.industry && (
          <span className={styles.industryBadge}>{profile.industry}</span>
        )}
      </div>

      <div className={styles.sidebarDivider} />

      <nav className={styles.sidebarNav}>
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => (
          <button
            key={href}
            className={`${styles.navItem} ${activeNav === href ? styles.navItemActive : ''}`}
            onClick={() => { setActiveNav(href); router.push(href); }}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.sidebarScoreWidget}>
        <p className={styles.scoreWidgetLabel}>BRAND SCORE</p>
        <div className={styles.scoreWidgetRow}>
          <span className={styles.scoreWidgetNum} style={{ color: scoreColor(latestScore) }}>
            {latestScore ?? '—'}
          </span>
          {scoreDelta !== null && scoreDelta !== 0 && (
            <span className={styles.scoreWidgetDelta} style={{ color: scoreDelta >= 0 ? 'var(--bs-teal)' : 'var(--destructive)' }}>
              {scoreDelta >= 0 ? '↑' : '↓'} {Math.abs(scoreDelta)}
            </span>
          )}
        </div>
        <p className={styles.scoreWidgetSub}>
          {profile?.latest_score_date
            ? `Updated ${formatScoreDate(profile.latest_score_date)}`
            : 'Last updated'}
        </p>
      </div>
    </aside>
  );
}
