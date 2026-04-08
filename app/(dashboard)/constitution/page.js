'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './constitution.module.css';

// ── TagInput ──────────────────────────────────────────────────────

function TagInput({ value = [], onChange, min = 1, max = 10, placeholder = 'Type and press Enter' }) {
  const [draft, setDraft] = useState('');

  function addTag(raw) {
    const tag = raw.trim().replace(/,$/, '');
    if (!tag || value.includes(tag) || value.length >= max) return;
    onChange([...value, tag]);
    setDraft('');
  }

  function onKey(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(draft); }
    if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
  }

  return (
    <div className={styles.tagWrap}>
      <div className={styles.tagBox}>
        {value.map((t, i) => (
          <span key={i} className={styles.pill}>
            {t}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}>×</button>
          </span>
        ))}
        {value.length < max && (
          <input
            className={styles.tagInline}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => draft.trim() && addTag(draft)}
            placeholder={value.length ? 'Add more…' : placeholder}
          />
        )}
      </div>
      <p className={styles.tagMeta}>
        Press Enter to add · {value.length < min ? `${min - value.length} more needed` : `${value.length} added`}
      </p>
    </div>
  );
}

// ── Core 5 questions ──────────────────────────────────────────────

const CORE_QUESTIONS = [
  {
    field: 'brand_mission',
    label: 'Complete this sentence: We exist so that ___________',
    type: 'text',
    placeholder: 'our customers never have to feel [X] again',
  },
  {
    field: 'brand_personality_words',
    label: 'Pick 5 words that describe your brand. Words your best customer would use.',
    type: 'tags',
    placeholder: 'e.g. Bold, Warm, Grounded…',
    min: 5,
    max: 5,
  },
  {
    field: 'brand_off_brand_words',
    label: 'Pick 5 words your brand would NEVER be.',
    type: 'tags',
    placeholder: 'e.g. Corporate, Flashy, Generic…',
    min: 5,
    max: 5,
  },
  {
    field: 'brand_best_customer',
    label: 'Describe your best customer in one paragraph. Not demographics — their life.',
    type: 'textarea',
    placeholder: 'She wakes up at 7, checks Instagram before getting out of bed, has strong opinions about brands that talk down to her…',
  },
  {
    field: 'brand_5_year_association',
    label: 'In 5 years, when someone mentions your brand, you want people to immediately think of ___________',
    type: 'text',
    placeholder: 'One thing. Not three things. One.',
  },
];

// ── Remaining 15 questions stored server-side as daily queue ─────
// (populated in Supabase constitution_queue after core is complete)

const INITIAL_ANSWERS = {
  brand_mission: '',
  brand_personality_words: [],
  brand_off_brand_words: [],
  brand_best_customer: '',
  brand_5_year_association: '',
};

// ── Validation ────────────────────────────────────────────────────

function validateQuestion(q, answers) {
  const val = answers[q.field];
  if (q.type === 'tags') {
    if (!val || val.length < (q.min || 1)) return `Add at least ${q.min || 1} entries`;
  } else if (!val || !String(val).trim()) {
    return 'This field is required';
  } else if (q.minLength && String(val).trim().length < q.minLength) {
    return `Please write at least ${q.minLength} characters (${String(val).trim().length} so far)`;
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────

export default function Constitution() {
  const router = useRouter();
  const [screen, setScreen]             = useState('intro');
  const [questionIdx, setQIdx]          = useState(0);
  const [answers, setAnswers]           = useState(INITIAL_ANSWERS);
  const [errors, setErrors]             = useState({});
  const [brandName, setBrandName]       = useState('');
  const [saving, setSaving]             = useState(false);
  const [saveMsg, setSaveMsg]           = useState('');
  const [genError, setGenError]         = useState('');
  const [constitution, setConstitution] = useState(null);
  const [isMobile, setIsMobile]         = useState(false);

  const totalQ = CORE_QUESTIONS.length;  // 5

  useEffect(() => {
    const brand = JSON.parse(localStorage.getItem('brandshift_brand') || '{}');
    const resolvedBrand = brand.brandName || localStorage.getItem('brandshift_active_brand') || '';
    if (resolvedBrand) setBrandName(resolvedBrand);

    // Clear any stale completion flag so users can always re-enter
    localStorage.removeItem('brandshift_constitution_done');

    const saved = localStorage.getItem('brandshift_constitution_progress');
    if (saved) {
      try {
        const { answers: a, qIdx } = JSON.parse(saved);
        setAnswers(prev => ({ ...prev, ...a }));
        if (typeof qIdx === 'number') { setQIdx(qIdx); setScreen('section'); }
      } catch {}
    }

    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  function setAnswer(field, value) {
    setAnswers(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  }

  async function persistProgress(qIdx) {
    localStorage.setItem('brandshift_constitution_progress', JSON.stringify({ answers, qIdx }));
    if (!brandName) return;
    try {
      await fetch('/api/constitution/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, updates: answers }),
      });
    } catch (e) { console.error('Save error:', e.message); }
  }

  async function handleSaveLater() {
    setSaving(true);
    await persistProgress(questionIdx);
    setSaving(false);
    setSaveMsg('Progress saved!');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  async function handleSkip() {
    localStorage.setItem('brandshift_constitution_done', 'skipped');
    if (brandName) {
      try {
        await fetch('/api/constitution/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandName, updates: { constitution_completed: false } }),
        });
      } catch {}
    }
    router.push('/dashboard');
  }

  async function handleNext() {
    const q = CORE_QUESTIONS[questionIdx];

    // Mobile: one question at a time
    if (isMobile) {
      const err = validateQuestion(q, answers);
      if (err) { setErrors({ [q.field]: err }); return; }
      setErrors({});

      if (questionIdx < totalQ - 1) {
        setQIdx(questionIdx + 1);
        return;
      }
      // Mobile last question: fall through to submit
    }

    // Desktop (all questions shown at once) or mobile on last question: validate all and submit
    const allErrors = {};
    for (const cq of CORE_QUESTIONS) {
      const e = validateQuestion(cq, answers);
      if (e) allErrors[cq.field] = e;
    }
    if (Object.keys(allErrors).length) { setErrors(allErrors); return; }

    await persistProgress(totalQ - 1);
    setScreen('loading');

    try {
      const [res] = await Promise.all([
        fetch('/api/constitution/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandName, coreAnswers: answers }),
        }),
        new Promise(r => setTimeout(r, 3000)),
      ]);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConstitution(data);
      localStorage.setItem('brandshift_constitution_done', 'true');
      localStorage.removeItem('brandshift_constitution_progress');
      setScreen('result');
    } catch (e) {
      setGenError('Generation failed: ' + e.message + '. Please try again.');
      setScreen('section');
    }
  }

  function handleBack() {
    if (questionIdx > 0) { setQIdx(questionIdx - 1); setErrors({}); }
    else { setScreen('intro'); setErrors({}); }
  }

  // (progress displayed on result screen after generation)

  function renderQuestion(q, showAll = false) {
    const val   = answers[q.field];
    const err   = errors[q.field];
    const isVisible = showAll || isMobile
      ? CORE_QUESTIONS.indexOf(q) === questionIdx
      : true;

    if (!isVisible) return null;

    return (
      <div key={q.field} className={styles.qBlock}>
        {isMobile && (
          <p className={styles.mobileQNum}>Question {questionIdx + 1} of {totalQ}</p>
        )}
        <label className={styles.qLabel}>{q.label}</label>

        {q.type === 'textarea' && (
          <textarea
            className={`${styles.qTextarea} ${err ? styles.hasErr : ''}`}
            value={val}
            onChange={e => setAnswer(q.field, e.target.value)}
            placeholder={q.placeholder}
            rows={5}
          />
        )}
        {q.type === 'text' && (
          <input
            type="text"
            className={`${styles.qInput} ${err ? styles.hasErr : ''}`}
            value={val}
            onChange={e => setAnswer(q.field, e.target.value)}
            placeholder={q.placeholder}
          />
        )}
        {q.type === 'tags' && (
          <TagInput
            value={val}
            onChange={v => setAnswer(q.field, v)}
            min={q.min}
            max={q.max}
            placeholder={q.placeholder}
          />
        )}
        {err && <p className={styles.errMsg}>{err}</p>}
      </div>
    );
  }

  // ── Intro ─────────────────────────────────────────────────────────

  if (screen === 'intro') return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>BrandShift</span>
      </header>
      <div className={styles.introWrap}>
        <div className={styles.introCard}>
          <p className={styles.eyebrow}>Core Constitution · 5 minutes</p>
          <h1 className={styles.introHeading}>Five questions most brand managers have never been asked</h1>
          <p className={styles.introBody}>
            Your answers become the foundation of everything BrandShift builds for you. Takes 5 minutes. No right answers.
          </p>
          <div className={styles.introDivider} />
          <div className={styles.introMeta}>
            <span>5 questions now</span>
            <span>·</span>
            <span>15 more over time via Daily Pulse</span>
          </div>
          <button className={styles.startBtn} onClick={() => { setScreen('section'); setQIdx(0); }}>
            Let's go →
          </button>
          <button className={styles.skipBtn} onClick={handleSkip}>
            Skip for now — I'll complete this later
          </button>
        </div>
      </div>
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────

  if (screen === 'loading') return (
    <div className={styles.page}>
      <div className={styles.loadingWrap}>
        <p className={styles.loadingText}>Building your Brand Constitution</p>
        <div className={styles.dots}><span /><span /><span /></div>
        <p className={styles.loadingSub}>Synthesising your answers into a brand document…</p>
      </div>
    </div>
  );

  // ── Result ────────────────────────────────────────────────────────

  if (screen === 'result' && constitution) return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>BrandShift</span>
        <span className={styles.headerBadge}>Brand Constitution</span>
      </header>
      <div className={styles.resultWrap}>
        <div className={styles.resultHeader}>
          <h1 className={styles.resultTitle}>{brandName} Brand Constitution</h1>
          <p className={styles.resultDate}>
            Generated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className={styles.completionBar}>
            <div className={styles.completionTrack}>
              <div className={styles.completionFill} style={{ width: `${(5 / 20) * 100}%` }} />
            </div>
            <span className={styles.completionLabel}>Brand Constitution: 5/20 questions complete · 15 more unlock daily</span>
          </div>
        </div>

        {[
          { key: 'who_we_are', title: 'Who We Are', type: 'text' },
          { key: 'our_personality', title: 'Our Personality', type: 'personality' },
          { key: 'how_we_speak', title: 'How We Speak', type: 'voice' },
          { key: 'who_we_are_for', title: "Who We're For", type: 'text' },
          { key: 'what_we_will_never_do', title: "What We'll Never Do", type: 'never' },
          { key: 'where_we_are_going', title: "Where We're Going", type: 'text' },
        ].map(({ key, title, type }) => {
          const val = constitution[key];
          const isBuilding = !val || val === 'Building...';

          return (
            <div key={key} className={`${styles.cCard} ${isBuilding ? styles.cCardBuilding : ''}`}>
              <h2 className={styles.cSection}>{title}</h2>
              {isBuilding ? (
                <p className={styles.buildingText}>Building… this section fills in as you answer more daily questions.</p>
              ) : type === 'text' ? (
                <p className={styles.cText}>{val}</p>
              ) : type === 'personality' ? (
                <>
                  <div className={styles.wordPills}>
                    {val?.words?.map((w, i) => <span key={i} className={styles.wordPill}>{w}</span>)}
                  </div>
                  {val?.description && <p className={styles.cText}>{val.description}</p>}
                </>
              ) : type === 'voice' ? (
                <>
                  <ul className={styles.rulesList}>
                    {val?.rules?.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                  {(val?.example_good || val?.example_bad) && (
                    <div className={styles.voiceExamples}>
                      {val.example_good && (
                        <div className={styles.goodEx}>
                          <span className={styles.exLabel}>✓ On-brand</span>
                          <p>"{val.example_good}"</p>
                        </div>
                      )}
                      {val.example_bad && (
                        <div className={styles.badEx}>
                          <span className={styles.exLabel}>✗ Off-brand</span>
                          <p>"{val.example_bad}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : type === 'never' ? (
                <ul className={styles.neverList}>
                  {val?.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              ) : null}
            </div>
          );
        })}

        <div className={styles.resultFooter}>
          <p className={styles.footerText}>
            This is your brand's north star. Every roadmap task, every score, every recommendation will be measured against this.
          </p>
          <button className={styles.dashBtn} onClick={() => router.push('/dashboard')}>
            Go to My Dashboard →
          </button>
        </div>
      </div>
    </div>
  );

  // ── Section screen ────────────────────────────────────────────────

  const currentQ     = CORE_QUESTIONS[questionIdx];
  const isLastQ      = questionIdx === totalQ - 1;
  const qProgressPct = ((questionIdx) / totalQ) * 100;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>BrandShift</span>
        <span className={styles.timeLeft}>Core Constitution · 5 min</span>
        <button className={styles.skipLink} onClick={handleSkip}>Complete later →</button>
      </header>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${qProgressPct}%` }} />
      </div>

      <div className={styles.sectionWrap}>
        <div className={styles.sectionMeta}>
          <span className={styles.sectionNum}>Question {questionIdx + 1} of {totalQ}</span>
        </div>

        <div className={styles.questions}>
          {isMobile
            ? renderQuestion(currentQ)
            : CORE_QUESTIONS.map((q) => (
                <div key={q.field} className={styles.qBlock}>
                  <label className={styles.qLabel}>{q.label}</label>
                  {q.type === 'textarea' && (
                    <textarea
                      className={`${styles.qTextarea} ${errors[q.field] ? styles.hasErr : ''}`}
                      value={answers[q.field]}
                      onChange={e => setAnswer(q.field, e.target.value)}
                      placeholder={q.placeholder}
                      rows={5}
                    />
                  )}
                  {q.type === 'text' && (
                    <input
                      type="text"
                      className={`${styles.qInput} ${errors[q.field] ? styles.hasErr : ''}`}
                      value={answers[q.field]}
                      onChange={e => setAnswer(q.field, e.target.value)}
                      placeholder={q.placeholder}
                    />
                  )}
                  {q.type === 'tags' && (
                    <TagInput
                      value={answers[q.field]}
                      onChange={v => setAnswer(q.field, v)}
                      min={q.min}
                      max={q.max}
                      placeholder={q.placeholder}
                    />
                  )}
                  {errors[q.field] && <p className={styles.errMsg}>{errors[q.field]}</p>}
                </div>
              ))
          }
        </div>

        {genError && (
          <div style={{ background: 'rgba(232,98,42,0.12)', border: '1px solid #E8622A', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#E8622A', fontSize: 14 }}>
            {genError}
          </div>
        )}

        <div className={styles.navRow}>
          <button className={styles.backBtn} onClick={handleBack}>← Back</button>
          <div className={styles.navRight}>
            {saveMsg && <span className={styles.saveMsg}>{saveMsg}</span>}
            <button className={styles.saveLaterBtn} onClick={handleSaveLater} disabled={saving}>
              {saving ? 'Saving…' : 'Save for later'}
            </button>
            <button className={styles.nextBtn} onClick={handleNext}>
              {isMobile
                ? isLastQ ? 'Generate Constitution →' : 'Next →'
                : 'Generate Constitution →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
