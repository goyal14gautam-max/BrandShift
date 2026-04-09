'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './constitution.module.css';

// ── TagInput ──────────────────────────────────────────────────────

function TagInput({ value = [], onChange, onSave, min = 1, max = 10, placeholder = 'Type and press Enter' }) {
  const [draft, setDraft] = useState('');

  function addTag(raw) {
    const tag = raw.trim().replace(/,$/, '');
    if (!tag || value.includes(tag) || value.length >= max) return;
    const updated = [...value, tag];
    onChange(updated);
    setDraft('');
    // Trigger immediate save when a tag is added
    if (onSave) onSave();
  }

  function removeTag(index) {
    const updated = value.filter((_, j) => j !== index);
    onChange(updated);
    if (onSave) onSave();
  }

  function onKey(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(draft); }
    if (e.key === 'Backspace' && !draft && value.length) removeTag(value.length - 1);
  }

  return (
    <div className={styles.tagWrap}>
      <div className={styles.tagBox}>
        {value.map((t, i) => (
          <span key={i} className={styles.pill}>
            {t}
            <button type="button" onClick={() => removeTag(i)}>×</button>
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
  { field: 'brand_mission', label: 'Complete this sentence: We exist so that ___________', type: 'text', placeholder: 'our customers never have to feel [X] again' },
  { field: 'brand_personality_words', label: 'Pick 5 words that describe your brand. Words your best customer would use.', type: 'tags', placeholder: 'e.g. Bold, Warm, Grounded…', min: 5, max: 5 },
  { field: 'brand_off_brand_words', label: 'Pick 5 words your brand would NEVER be.', type: 'tags', placeholder: 'e.g. Corporate, Flashy, Generic…', min: 5, max: 5 },
  { field: 'brand_best_customer', label: 'Describe your best customer in one paragraph. Not demographics — their life.', type: 'textarea', placeholder: 'She wakes up at 7, checks Instagram before getting out of bed, has strong opinions about brands that talk down to her…' },
  { field: 'brand_5_year_association', label: 'In 5 years, when someone mentions your brand, you want people to immediately think of ___________', type: 'text', placeholder: 'One thing. Not three things. One.' },
];

// ── Helpers ───────────────────────────────────────────────────────

function buildFormFromProfile(profile) {
  return {
    brand_mission:            profile?.brand_mission || '',
    brand_personality_words:  profile?.brand_personality_words || [],
    brand_off_brand_words:    profile?.brand_off_brand_words || [],
    brand_best_customer:      profile?.brand_best_customer || '',
    brand_5_year_association: profile?.brand_5_year_association || '',
  };
}

function mapFormToProfile(data) {
  return {
    brand_mission:            data.brand_mission || '',
    brand_personality_words:  data.brand_personality_words || [],
    brand_off_brand_words:    data.brand_off_brand_words || [],
    brand_best_customer:      data.brand_best_customer || '',
    brand_5_year_association: data.brand_5_year_association || '',
  };
}

function hasExistingData(profile) {
  if (!profile) return false;
  const textFields = [profile.brand_best_customer, profile.brand_5_year_association, profile.brand_mission];
  const arrayFields = [profile.brand_personality_words, profile.brand_off_brand_words];
  const hasText = textFields.some(f => f && f.trim().length > 3);
  const hasArrays = arrayFields.some(f => Array.isArray(f) && f.length > 0);
  return hasText || hasArrays;
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

function validateQuestion(q, answers) {
  const val = answers[q.field];
  if (q.type === 'tags') {
    if (!val || val.length < (q.min || 1)) return `Add at least ${q.min || 1} entries`;
  } else if (!val || !String(val).trim()) {
    return 'This field is required';
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────

export default function Constitution() {
  const router = useRouter();
  const [screen, setScreen]             = useState('loading-profile'); // start with loading, not intro
  const [questionIdx, setQIdx]          = useState(0);
  const [answers, setAnswers]           = useState(buildFormFromProfile(null));
  const [errors, setErrors]             = useState({});
  const [brandName, setBrandName]       = useState('');
  const [saving, setSaving]             = useState(false);
  const [saveMsg, setSaveMsg]           = useState('');
  const [genError, setGenError]         = useState('');
  const [constitution, setConstitution] = useState(null);
  const [isMobile, setIsMobile]         = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [lastSaved, setLastSaved]       = useState(null);
  const [toastMsg, setToastMsg]         = useState('');
  const isFirstRender                   = useRef(true);
  const saveTimeoutRef                  = useRef(null);

  const totalQ = CORE_QUESTIONS.length;

  // ── Resolve brand name on mount ───────────────────────────────
  useEffect(() => {
    const brand = JSON.parse(localStorage.getItem('brandshift_brand') || '{}');
    const resolved = brand.brandName || localStorage.getItem('brandshift_active_brand') || '';
    if (resolved) setBrandName(resolved);

    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Fetch profile from server, pre-fill, decide screen ────────
  useEffect(() => {
    if (!brandName) {
      // No brand = show intro
      setScreen('intro');
      return;
    }

    async function fetchProfile() {
      try {
        console.log('=== CONSTITUTION DIAGNOSE ===');
        console.log('Brand from localStorage:', brandName);

        const res = await fetch(`/api/profile?brandName=${encodeURIComponent(brandName)}`);
        if (!res.ok) {
          console.log('Profile fetch failed, status:', res.status);
          setScreen('intro');
          return;
        }
        const profile = await res.json();

        console.log('Profile constitution fields:', {
          brand_personality_words: profile?.brand_personality_words,
          brand_off_brand_words:   profile?.brand_off_brand_words,
          brand_best_customer:     profile?.brand_best_customer,
          brand_5_year_association: profile?.brand_5_year_association,
          brand_mission:           profile?.brand_mission,
          constitution_completed:  profile?.constitution_completed,
        });

        // Also run the direct check API
        try {
          const checkRes = await fetch(`/api/constitution/check?brand=${encodeURIComponent(brandName)}`);
          const checkData = await checkRes.json();
          console.log('Direct Supabase check:', checkData);
        } catch (e) {
          console.log('Check API failed:', e.message);
        }

        console.log('=== END DIAGNOSE ===');

        // Pre-fill form from profile
        if (hasExistingData(profile)) {
          setAnswers(buildFormFromProfile(profile));
          console.log('Form pre-filled from profile — skipping intro');
          setScreen('section');
        } else {
          // Also check localStorage for in-progress answers
          const saved = localStorage.getItem('brandshift_constitution_progress');
          if (saved) {
            try {
              const { answers: a, qIdx } = JSON.parse(saved);
              if (a) setAnswers(prev => ({ ...prev, ...a }));
              if (typeof qIdx === 'number') setQIdx(qIdx);
              setScreen('section');
              console.log('Restored from localStorage');
              return;
            } catch {}
          }
          setScreen('intro');
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
        setScreen('intro');
      }
    }

    fetchProfile();
  }, [brandName]);

  // ── Save function — uses API route (server-side, bypasses RLS) ──
  async function doSave(data) {
    const name = brandName || localStorage.getItem('brandshift_active_brand');
    if (!name) {
      console.error('No brand name for save');
      return false;
    }
    setIsSaving(true);

    // Always save to localStorage
    localStorage.setItem('brandshift_constitution_progress', JSON.stringify({ answers: data, qIdx: questionIdx }));

    try {
      const profileData = mapFormToProfile(data);
      console.log('Saving constitution for:', name, 'fields:', Object.keys(profileData));

      const response = await fetch('/api/constitution/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: name, updates: profileData }),
      });

      const result = await response.json();

      if (response.ok) {
        setLastSaved(new Date());
        showToast('Answers saved');
        console.log('Constitution saved OK:', result);
        return true;
      } else {
        console.error('Save failed:', result);
        return false;
      }
    } catch (err) {
      console.error('Save error:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  // Debounced save — called after every field change
  function scheduleSave(data) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => doSave(data), 1500);
  }

  // Immediate save — called on blur, tag add, navigation
  async function immediateSave() {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    await doSave(answers);
  }

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2000);
  }

  function setAnswer(field, value) {
    const updated = { ...answers, [field]: value };
    setAnswers(updated);
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
    // Schedule debounced save
    if (!isFirstRender.current) scheduleSave(updated);
  }

  // ── Navigation handlers ───────────────────────────────────────

  async function handleSaveLater() {
    setSaving(true);
    await doSave(answers);
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

    if (isMobile) {
      const err = validateQuestion(q, answers);
      if (err) { setErrors({ [q.field]: err }); return; }
      setErrors({});
      if (questionIdx < totalQ - 1) {
        await immediateSave();
        setQIdx(questionIdx + 1);
        return;
      }
    }

    const allErrors = {};
    for (const cq of CORE_QUESTIONS) {
      const e = validateQuestion(cq, answers);
      if (e) allErrors[cq.field] = e;
    }
    if (Object.keys(allErrors).length) { setErrors(allErrors); return; }

    // Save before generating
    await doSave(answers);
    setScreen('generating');

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
      if (data._partial) setGenError('partial');
      setScreen('result');
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('overloaded') || msg.includes('529')) setGenError('AI is busy. Retrying automatically...');
      else if (msg.includes('timeout')) setGenError('Request timed out. Please try again.');
      else setGenError('Generation failed. Please try again.');
      setScreen('section');
    }
  }

  async function handleBack() {
    await immediateSave();
    if (questionIdx > 0) { setQIdx(questionIdx - 1); setErrors({}); }
    else { setScreen('intro'); setErrors({}); }
  }

  // Mark first render done after profile loads
  useEffect(() => {
    if (screen === 'section' || screen === 'intro') {
      isFirstRender.current = false;
    }
  }, [screen]);

  // ── Save indicator ────────────────────────────────────────────
  function SaveIndicator() {
    if (!isSaving && !lastSaved) return null;
    return (
      <div className={styles.saveIndicator}>
        {isSaving ? (
          <><span className={styles.saveDotSpin} />Saving...</>
        ) : lastSaved ? (
          <><span className={styles.saveDotDone} />Saved {formatTimeAgo(lastSaved)}</>
        ) : null}
      </div>
    );
  }

  // ── Loading profile state ─────────────────────────────────────
  if (screen === 'loading-profile') return (
    <div className={styles.page}>
      <div className={styles.loadingWrap}>
        <div className={styles.dots}><span /><span /><span /></div>
        <p className={styles.loadingSub}>Loading your constitution...</p>
      </div>
    </div>
  );

  // ── Intro ─────────────────────────────────────────────────────
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
            <span>5 questions now</span><span>·</span><span>15 more over time via Daily Pulse</span>
          </div>
          <button className={styles.startBtn} onClick={() => { setScreen('section'); setQIdx(0); }}>
            Let&apos;s go →
          </button>
          <button className={styles.skipBtn} onClick={handleSkip}>
            Skip for now — I&apos;ll complete this later
          </button>
        </div>
      </div>
    </div>
  );

  // ── Generating ────────────────────────────────────────────────
  if (screen === 'generating') return (
    <div className={styles.page}>
      <div className={styles.loadingWrap}>
        <p className={styles.loadingText}>Building your Brand Constitution</p>
        <div className={styles.dots}><span /><span /><span /></div>
        <p className={styles.loadingSub}>Synthesising your answers into a brand document…</p>
      </div>
    </div>
  );

  // ── Result ────────────────────────────────────────────────────
  if (screen === 'result' && constitution) return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>BrandShift</span>
        <span className={styles.headerBadge}>Brand Constitution</span>
      </header>
      <div className={styles.resultWrap}>
        <div className={styles.resultHeader}>
          <h1 className={styles.resultTitle}>{brandName} Brand Constitution</h1>
          <p className={styles.resultDate}>Generated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
                  <div className={styles.wordPills}>{val?.words?.map((w, i) => <span key={i} className={styles.wordPill}>{w}</span>)}</div>
                  {val?.description && <p className={styles.cText}>{val.description}</p>}
                </>
              ) : type === 'voice' ? (
                <>
                  <ul className={styles.rulesList}>{val?.rules?.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  {(val?.example_good || val?.example_bad) && (
                    <div className={styles.voiceExamples}>
                      {val.example_good && <div className={styles.goodEx}><span className={styles.exLabel}>✓ On-brand</span><p>&quot;{val.example_good}&quot;</p></div>}
                      {val.example_bad && <div className={styles.badEx}><span className={styles.exLabel}>✗ Off-brand</span><p>&quot;{val.example_bad}&quot;</p></div>}
                    </div>
                  )}
                </>
              ) : type === 'never' ? (
                <ul className={styles.neverList}>{val?.map((item, i) => <li key={i}>{item}</li>)}</ul>
              ) : null}
            </div>
          );
        })}
        <div className={styles.resultFooter}>
          <p className={styles.footerText}>This is your brand&apos;s north star. Every roadmap task, every score, every recommendation will be measured against this.</p>
          <button className={styles.dashBtn} onClick={() => router.push('/dashboard')}>Go to My Dashboard →</button>
        </div>
      </div>
    </div>
  );

  // ── Section screen (form) ─────────────────────────────────────

  const isLastQ      = questionIdx === totalQ - 1;
  const qProgressPct = ((questionIdx) / totalQ) * 100;

  function renderField(q) {
    const err = errors[q.field];
    return (
      <div key={q.field} className={styles.qBlock}>
        {isMobile && <p className={styles.mobileQNum}>Question {questionIdx + 1} of {totalQ}</p>}
        <label className={styles.qLabel}>{q.label}</label>
        {q.type === 'textarea' && (
          <textarea
            className={`${styles.qTextarea} ${err ? styles.hasErr : ''}`}
            value={answers[q.field]}
            onChange={e => setAnswer(q.field, e.target.value)}
            onBlur={immediateSave}
            placeholder={q.placeholder}
            rows={5}
          />
        )}
        {q.type === 'text' && (
          <input
            type="text"
            className={`${styles.qInput} ${err ? styles.hasErr : ''}`}
            value={answers[q.field]}
            onChange={e => setAnswer(q.field, e.target.value)}
            onBlur={immediateSave}
            placeholder={q.placeholder}
          />
        )}
        {q.type === 'tags' && (
          <TagInput
            value={answers[q.field]}
            onChange={v => setAnswer(q.field, v)}
            onSave={immediateSave}
            min={q.min}
            max={q.max}
            placeholder={q.placeholder}
          />
        )}
        {err && <p className={styles.errMsg}>{err}</p>}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>BrandShift</span>
        <SaveIndicator />
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
            ? renderField(CORE_QUESTIONS[questionIdx])
            : CORE_QUESTIONS.map(q => renderField(q))
          }
        </div>

        {genError && (() => {
          const friendly = genError.includes('overloaded') || genError.includes('529')
            ? { title: 'AI is busy right now', message: "We'll retry automatically — or try again in 30 seconds.", action: 'Try again' }
            : genError.includes('timeout')
            ? { title: 'Request timed out', message: 'The generation took too long.', action: 'Try again' }
            : { title: 'Something went wrong', message: 'Unable to generate your constitution.', action: 'Try again' };
          return (
            <div className={styles.sectionErr}>
              <div style={{ fontWeight: 500, color: 'var(--bs-amber)', marginBottom: 4 }}>{friendly.title}</div>
              <div style={{ fontSize: 13, color: 'var(--bs-text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{friendly.message}</div>
              <button onClick={() => { setGenError(''); handleNext(); }} style={{ background: 'var(--bs-orange)', color: 'white', border: 'none', borderRadius: 'var(--radius)', padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>{friendly.action}</button>
            </div>
          );
        })()}

        <div className={styles.navRow}>
          <button className={styles.backBtn} onClick={handleBack}>← Back</button>
          <div className={styles.navRight}>
            {saveMsg && <span className={styles.saveMsg}>{saveMsg}</span>}
            <button className={styles.saveLaterBtn} onClick={handleSaveLater} disabled={saving}>{saving ? 'Saving…' : 'Save for later'}</button>
            <button className={styles.nextBtn} onClick={handleNext}>{isMobile ? (isLastQ ? 'Generate Constitution →' : 'Next →') : 'Generate Constitution →'}</button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: 'var(--bs-card-light)', border: '1px solid var(--bs-teal)',
          borderRadius: 'var(--radius)', padding: '10px 20px',
          fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--bs-teal)',
          zIndex: 100, animation: 'fadeIn 0.2s ease',
        }}>
          {toastMsg} ✓
        </div>
      )}
    </div>
  );
}
