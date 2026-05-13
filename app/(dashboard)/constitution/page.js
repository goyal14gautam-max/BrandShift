'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader } from 'lucide-react';

const SECTIONS = [
  {
    id: 0,
    title: 'Your Brand Identity',
    subtitle: 'How your brand thinks and feels',
    color: 'var(--bs-violet)',
    questions: [
      { key: 'personalityWords', type: 'tags', label: 'If your brand were a person, they would be described as...', sublabel: 'Add 3-5 personality words. Press Enter after each.', placeholder: 'e.g. bold, warm, direct...', required: true },
      { key: 'offBrandWords', type: 'tags', label: 'Words your brand would NEVER want to be called', sublabel: 'These are your hard limits. Press Enter after each.', placeholder: 'e.g. cheap, corporate, boring...', required: true },
      { key: 'personDescription', type: 'textarea', label: 'If your brand walked into a party, what would they do?', sublabel: 'Describe the behaviour, energy, how they talk.', placeholder: 'They walk in confidently, find the most interesting person in the room...', required: false },
    ],
  },
  {
    id: 1,
    title: 'Your Customer',
    subtitle: 'Who you are really talking to',
    color: 'var(--bs-teal)',
    questions: [
      { key: 'bestCustomer', type: 'textarea', label: 'Describe your best customer in one paragraph. Not demographics — their life.', sublabel: 'What do they want, fear, believe? What is their day like?', placeholder: 'They are someone who has just started earning their own money and...', required: true },
      { key: 'notFor', type: 'textarea', label: 'Who is your brand NOT for?', sublabel: 'Being specific here sharpens everything else.', placeholder: 'Not for people who want the cheapest option. Not for...', required: false },
      { key: 'fiveYearVision', type: 'textarea', label: 'In 5 years, when someone mentions your brand, what do you want them to think of?', sublabel: 'Not your product. The feeling, the association.', placeholder: 'The brand that made me feel like I finally found my style...', required: false },
    ],
  },
  {
    id: 2,
    title: 'Your Voice',
    subtitle: 'How your brand communicates',
    color: 'var(--bs-amber)',
    questions: [
      { key: 'ownedPhrases', type: 'tags', label: 'Phrases or words your brand owns — signature language', sublabel: 'Things only your brand would say. Press Enter after each.', placeholder: 'e.g. "built for real life"...', required: false },
      { key: 'cringePhrases', type: 'tags', label: 'Phrases that make you cringe when you see them in your copy', sublabel: 'Language you want to actively avoid. Press Enter after each.', placeholder: 'e.g. "synergy", "world-class", "seamless"...', required: false },
      { key: 'originStory', type: 'textarea', label: 'Why does your brand exist? The real reason, not the PR version.', sublabel: 'What problem made you start this?', placeholder: 'We started because we were frustrated that...', required: false },
    ],
  },
  {
    id: 3,
    title: 'Your Edge',
    subtitle: 'What makes you different',
    color: 'var(--bs-orange)',
    questions: [
      { key: 'refusesTo', type: 'tags', label: 'Things your brand absolutely refuses to do', sublabel: 'Hard nos. Press Enter after each.', placeholder: 'e.g. use fear-based marketing, make false claims...', required: false },
      { key: 'competitiveEdge', type: 'textarea', label: 'What do you do that your competitors cannot easily copy?', sublabel: 'Your real unfair advantage.', placeholder: 'Unlike others we...', required: false },
      { key: 'mission', type: 'textarea', label: 'Complete this: We exist to ___', sublabel: 'One clear sentence. No jargon.', placeholder: 'We exist to...', required: false },
    ],
  },
];

function colorValue(cssVar) {
  if (cssVar === 'var(--bs-violet)') return '#7C5CBF';
  if (cssVar === 'var(--bs-teal)') return '#2EC4A0';
  if (cssVar === 'var(--bs-amber)') return '#E8A030';
  if (cssVar === 'var(--bs-orange)') return '#E8622A';
  return '#7C5CBF';
}

export default function ConstitutionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading]       = useState(true);
  const [isSaving, setIsSaving]         = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveError, setSaveError]       = useState('');
  const [currentStep, setCurrentStep]   = useState(0);
  const [isComplete, setIsComplete]     = useState(false);
  const [bibleContent, setBibleContent] = useState('');
  const [tagInput, setTagInput]         = useState({});
  const [brandName, setBrandName]       = useState('');

  const [answers, setAnswers] = useState({
    personalityWords: [], offBrandWords: [], personDescription: '',
    bestCustomer: '', notFor: '', fiveYearVision: '',
    ownedPhrases: [], cringePhrases: [], originStory: '',
    refusesTo: [], competitiveEdge: '', mission: '',
  });

  // Resolve brand name — MUST match the dashboard's source of truth
  // (account.primary_brand). If we read from localStorage first, the wizard
  // can write to a different brand than the dashboard reads from (e.g. user
  // had FieldAssist cached in localStorage from an earlier audit but their
  // account's primary_brand is Myntra). Falls back to localStorage only when
  // the account has no primary_brand yet (new-user edge case).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/account');
        if (res.ok) {
          const data = await res.json();
          const primary = data?.account?.primary_brand;
          if (primary) {
            setBrandName(primary);
            try { localStorage.setItem('brandshift_active_brand', primary); } catch {}
            return;
          }
        }
      } catch {
        // fall through to localStorage
      }
      try {
        const brand = JSON.parse(localStorage.getItem('brandshift_brand') || '{}');
        const name = brand.brandName || localStorage.getItem('brandshift_active_brand') || '';
        setBrandName(name);
      } catch {
        setBrandName('');
      }
    })();
  }, []);

  // Load existing answers
  useEffect(() => {
    if (!brandName) { setIsLoading(false); return; }
    loadAnswers();
  }, [brandName]);

  async function loadAnswers() {
    setIsLoading(true);
    try {
      console.log('Loading constitution for:', brandName);
      const res = await fetch(`/api/constitution/load?brand=${encodeURIComponent(brandName)}`);
      const data = await res.json();
      console.log('Load response:', data);

      if (data.success && data.data) {
        const d = data.data;
        const loaded = {
          personalityWords:  d.c_personality_words || [],
          offBrandWords:     d.c_off_brand_words || [],
          personDescription: d.c_person_description || '',
          bestCustomer:      d.c_best_customer || '',
          notFor:            d.c_not_for || '',
          fiveYearVision:    d.c_5_year_vision || '',
          ownedPhrases:      d.c_owned_phrases || [],
          cringePhrases:     d.c_cringe_phrases || [],
          originStory:       d.c_origin_story || '',
          refusesTo:         d.c_refuses_to || [],
          competitiveEdge:   d.c_competitive_edge || '',
          mission:           d.c_mission || '',
        };
        console.log('Loaded answers:', loaded);
        setAnswers(loaded);

        if (d.c_current_step > 0) {
          setCurrentStep(Math.min(d.c_current_step, SECTIONS.length - 1));
        }

        if (d.c_completed && d.c_bible_content) {
          setIsComplete(true);
          setBibleContent(d.c_bible_content);
        }
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Save
  async function saveStep(stepIndex) {
    setSaveError('');
    setIsSaving(true);
    console.log('Saving step:', stepIndex, 'Brand:', brandName, 'Answers:', answers);

    try {
      const res = await fetch('/api/constitution/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, step: stepIndex, answers }),
      });
      const result = await res.json();
      console.log('Save result:', result);

      if (!res.ok || !result.success) {
        if (res.status === 403) {
          setSaveError(
            result.message ||
              'This brand belongs to a different account. Sign in to that account or start a new audit.'
          );
        } else if (res.status === 401) {
          setSaveError('Your session expired. Please sign in again.');
        } else {
          setSaveError(result.error || 'Save failed');
        }
        return false;
      }
      return true;
    } catch (err) {
      console.error('Save error:', err);
      setSaveError('Could not save. Check your connection.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  // Navigation
  async function handleNext() {
    const section = SECTIONS[currentStep];
    const missing = section.questions
      .filter(q => q.required)
      .find(q => {
        const val = answers[q.key];
        return Array.isArray(val) ? val.length === 0 : !val || val.trim().length < 3;
      });

    if (missing) {
      setSaveError(`Please answer: "${missing.label.slice(0, 50)}..."`);
      return;
    }

    const saved = await saveStep(currentStep + 1);
    if (!saved) return;

    if (currentStep < SECTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
      await generateBible();
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  }

  // Generate
  async function generateBible() {
    setIsGenerating(true);
    setSaveError('');
    try {
      const res = await fetch('/api/constitution/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName }),
      });
      const result = await res.json();
      console.log('Generate result:', result);

      if (!res.ok || !result.success) {
        setSaveError(result.error || 'Generation failed. Your answers are saved. Try again.');
        return;
      }
      setBibleContent(result.bibleContent);
      setIsComplete(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Generate error:', err);
      setSaveError('Generation failed. Your answers are saved safely. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  // Field handlers
  function updateAnswer(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }));
    if (saveError) setSaveError('');
  }

  function handleTagKeyDown(e, key) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = (tagInput[key] || '').trim();
      if (value && !answers[key].includes(value)) {
        updateAnswer(key, [...answers[key], value]);
      }
      setTagInput(prev => ({ ...prev, [key]: '' }));
    }
  }

  function removeTag(key, index) {
    updateAnswer(key, answers[key].filter((_, i) => i !== index));
  }

  // ── Render question ─────────────────────────────────────────

  function renderQuestion(question) {
    const { key, type, label, sublabel, placeholder } = question;
    const sColor = SECTIONS[currentStep].color;
    const hex = colorValue(sColor);

    if (type === 'textarea') {
      const hasVal = (answers[key] || '').length > 3;
      return (
        <div key={key} style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-headline)', fontSize: 18, color: 'var(--bs-text-primary)', lineHeight: 1.4, marginBottom: 6 }}>{label}</label>
          {sublabel && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--bs-text-tertiary)', margin: '0 0 10px' }}>{sublabel}</p>}
          <textarea value={answers[key] || ''} onChange={e => updateAnswer(key, e.target.value)} placeholder={placeholder} rows={4}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: hasVal ? `1px solid ${hex}40` : '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius)', padding: '14px 16px', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--bs-text-primary)', lineHeight: 1.7, resize: 'vertical', outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s' }} />
        </div>
      );
    }

    if (type === 'tags') {
      const tags = answers[key] || [];
      return (
        <div key={key} style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontFamily: 'var(--font-headline)', fontSize: 18, color: 'var(--bs-text-primary)', lineHeight: 1.4, marginBottom: 6 }}>{label}</label>
          {sublabel && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--bs-text-tertiary)', margin: '0 0 10px' }}>{sublabel}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: tags.length ? 10 : 0 }}>
            {tags.map((tag, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${hex}15`, border: `1px solid ${hex}40`, borderRadius: 100, padding: '5px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, color: hex }}>
                {tag}
                <X size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removeTag(key, i)} />
              </span>
            ))}
          </div>
          <input type="text" value={tagInput[key] || ''} onChange={e => setTagInput(prev => ({ ...prev, [key]: e.target.value }))} onKeyDown={e => handleTagKeyDown(e, key)} placeholder={tags.length ? '+ Add another...' : placeholder}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: tags.length ? `1px solid ${hex}40` : '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius)', padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--bs-text-primary)', outline: 'none', boxSizing: 'border-box' }} />
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--bs-text-tertiary)', margin: '6px 0 0' }}>Press Enter to add each item</p>
        </div>
      );
    }
    return null;
  }

  // ── Loading ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <Loader size={20} color="var(--bs-violet)" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--bs-text-secondary)' }}>Loading your constitution...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Complete — Show Bible ───────────────────────────────────

  if (isComplete && bibleContent) {
    return (
      <div style={{ padding: 40, maxWidth: 760 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(46,196,160,0.1)', border: '1px solid rgba(46,196,160,0.2)', borderRadius: 100, padding: '4px 14px', marginBottom: 16 }}>
            <Check size={12} color="var(--bs-teal)" />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--bs-teal)' }}>Constitution complete</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: 32, color: 'var(--bs-text-primary)', margin: '0 0 8px' }}>{brandName} Brand Bible</h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--bs-text-secondary)', margin: 0 }}>Your living brand document. Share with your team and agency.</p>
        </div>

        <div style={{ background: 'var(--bs-card-dark)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius)', padding: 40, marginBottom: 24 }}>
          {bibleContent.split('\n').map((line, i) => {
            if (line.match(/^[A-Z][A-Z\s]+:/)) {
              return <h2 key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 2, color: 'var(--bs-violet)', margin: i === 0 ? '0 0 12px' : '28px 0 12px', textTransform: 'uppercase' }}>{line.replace(':', '')}</h2>;
            }
            if (line.match(/^[→•\-]/)) {
              return (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--bs-violet)', flexShrink: 0, marginTop: 2 }}>→</span>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--bs-text-secondary)', lineHeight: 1.6 }}>{line.replace(/^[→•\-]\s*/, '')}</span>
                </div>
              );
            }
            if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
            return <p key={i} style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--bs-text-primary)', lineHeight: 1.7, margin: '0 0 12px' }}>{line}</p>;
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} style={{ background: 'var(--bs-orange)', color: 'white', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Download as PDF</button>
          <button onClick={() => navigator.clipboard.writeText(bibleContent)} style={{ background: 'transparent', color: 'var(--bs-text-primary)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius)', padding: '12px 24px', fontFamily: 'var(--font-ui)', fontSize: 14, cursor: 'pointer' }}>Copy text</button>
          <button onClick={() => { setIsComplete(false); setCurrentStep(0); }} style={{ background: 'transparent', color: 'var(--bs-text-tertiary)', border: 'none', padding: 12, fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>Edit answers →</button>
        </div>
      </div>
    );
  }

  // ── Generating ──────────────────────────────────────────────

  if (isGenerating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, textAlign: 'center' }}>
        <Loader size={32} color="var(--bs-violet)" style={{ animation: 'spin 1s linear infinite' }} />
        <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: 24, color: 'var(--bs-text-primary)', margin: 0 }}>Writing your Brand Bible...</h2>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--bs-text-secondary)', margin: 0, maxWidth: 400 }}>Turning your answers into a complete brand document. Takes about 20 seconds.</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Main Form ───────────────────────────────────────────────

  const section = SECTIONS[currentStep];
  const isLastStep = currentStep === SECTIONS.length - 1;
  const hex = colorValue(section.color);

  return (
    <div style={{ padding: 40, maxWidth: 680 }}>
      {/* Progress */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--bs-text-tertiary)' }}>Section {currentStep + 1} of {SECTIONS.length}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--bs-text-tertiary)' }}>{Math.round(((currentStep + 1) / SECTIONS.length) * 100)}%</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((currentStep + 1) / SECTIONS.length) * 100}%`, background: hex, borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {SECTIONS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 1.5, background: i <= currentStep ? hex : 'rgba(255,255,255,0.08)', transition: 'background 0.3s ease' }} />
          ))}
        </div>
      </div>

      {/* Section header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'inline-block', background: `${hex}15`, color: hex, border: `1px solid ${hex}30`, borderRadius: 100, padding: '4px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>{section.subtitle}</div>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: 28, color: 'var(--bs-text-primary)', margin: 0, lineHeight: 1.2 }}>{section.title}</h1>
      </div>

      {/* Questions */}
      <div>{section.questions.map(q => renderQuestion(q))}</div>

      {/* Error */}
      {saveError && (
        <div style={{ background: 'rgba(212,24,61,0.08)', border: '1px solid rgba(212,24,61,0.2)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, fontFamily: 'var(--font-ui)', fontSize: 13, color: '#d4183d' }}>{saveError}</div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={handleBack} disabled={currentStep === 0}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius)', padding: '12px 24px', fontFamily: 'var(--font-ui)', fontSize: 14, color: currentStep === 0 ? 'var(--bs-text-tertiary)' : 'var(--bs-text-primary)', cursor: currentStep === 0 ? 'not-allowed' : 'pointer', opacity: currentStep === 0 ? 0.4 : 1 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isSaving && (
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--bs-text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />Saving...
            </span>
          )}
          <button onClick={handleNext} disabled={isSaving}
            style={{ background: isSaving ? `${hex}60` : hex, color: 'white', border: 'none', borderRadius: 'var(--radius)', padding: '12px 28px', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {isLastStep ? 'Generate Brand Bible →' : 'Save & Continue →'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
