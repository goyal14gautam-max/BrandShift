'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Globe, Users, Target, ArrowRight, ChevronLeft,
} from 'lucide-react';
import SuggestInput from '@/components/SuggestInput';
import Logo from '@/components/Logo';
import styles from './audit.module.css';
import { trackPageView, trackEvent } from '@/lib/analytics';

const INDUSTRY_SUGGESTIONS = [
  'D2C / Consumer Brand', 'FMCG / Food & Beverage', 'Fashion & Lifestyle',
  'Health & Wellness', 'Tech / SaaS', 'Beauty & Personal Care', 'EdTech',
  'FinTech', 'Real Estate', 'Hospitality & Travel', 'Healthcare', 'Retail',
  'Food & Beverage', 'Apparel & Footwear', 'Home & Living', 'Sports & Fitness',
  'Media & Entertainment', 'Automotive', 'B2B / Enterprise',
  'Regional / Family Business',
];

const AUDIENCE_SUGGESTIONS = [
  'Gen Z (18–25)', 'Millennials (26–35)', 'Working Professionals (25–40)',
  'College Students', 'Young Mothers', 'Urban Indians',
  'Tier 2 & 3 City Consumers', 'Premium / Luxury Segment',
  'B2B Decision Makers', 'Small Business Owners', 'Health-Conscious Consumers',
  'Tech-Savvy Users', 'Regional Language Audience', 'High Net Worth Individuals',
  'First-Time Buyers', 'Mixed Age Groups (25–45)',
];

const INITIAL_FORM = {
  brandName: '',
  industry: '',
  targetAudience: '',
  websiteUrl: '',
  instagramHandle: '',
  linkedinPage: '',
  competitor1: '',
  competitor2: '',
  competitor3: '',
  challenge: '',
  goal: '',
};

function normalizeUrl(val) {
  if (!val) return val;
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  return 'https://' + val;
}

function stripAt(val) {
  return val.startsWith('@') ? val.slice(1) : val;
}

// ── Context cards ──────────────────────────────────────────────

const CONTEXT = [
  {
    icon: Sparkles,
    title: 'Brand Foundations',
    description: 'We need to understand your brand identity to provide accurate analysis across all touchpoints.',
  },
  {
    icon: Globe,
    title: 'Digital Footprint',
    description: 'Your online presence reveals how customers perceive and interact with your brand.',
  },
  {
    icon: Users,
    title: 'Competitive Context',
    description: 'Knowing your competitors helps us benchmark your positioning and identify opportunities.',
  },
  {
    icon: Target,
    title: 'Strategic Direction',
    description: 'Your goals shape the recommendations — we tailor insights to what matters most to you.',
  },
  {
    icon: ArrowRight,
    title: 'Final Review',
    description: 'Double-check your inputs. Our AI will analyze everything you have shared in under 2 minutes.',
  },
];

// ── Field components ───────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export default function Audit() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [stepping, setStepping] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    trackPageView('audit_form');
    trackEvent('audit_started');
    const saved = localStorage.getItem('brandshift_intake');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only restore intake fields, not submittedAt
        const { submittedAt: _, ...fields } = parsed;
        setFormData(prev => ({ ...prev, ...fields }));
      } catch {}
    }
  }, []);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem('brandshift_intake', JSON.stringify(formData));
  }, [formData]);

  function setField(key, value) {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  }

  function validateStep(step) {
    const errs = {};
    if (step === 1) {
      if (!formData.brandName.trim())      errs.brandName      = 'This field is required';
      if (!formData.industry.trim())       errs.industry       = 'This field is required';
      if (!formData.targetAudience.trim()) errs.targetAudience = 'This field is required';
    } else if (step === 2) {
      if (!formData.websiteUrl.trim())      errs.websiteUrl      = 'This field is required';
      if (!formData.instagramHandle.trim()) errs.instagramHandle = 'This field is required';
    } else if (step === 3) {
      if (!formData.competitor1.trim()) errs.competitor1 = 'This field is required';
      if (!formData.competitor2.trim()) errs.competitor2 = 'This field is required';
    } else if (step === 4) {
      if (!formData.challenge.trim()) errs.challenge = 'This field is required';
    }
    return errs;
  }

  async function handleContinue() {
    const validationErrors = validateStep(currentStep);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    // Normalize URL/handle fields when leaving step 2
    if (currentStep === 2) {
      setFormData(prev => ({
        ...prev,
        websiteUrl:      normalizeUrl(prev.websiteUrl.trim()),
        instagramHandle: stripAt(prev.instagramHandle.trim()),
        linkedinPage:    prev.linkedinPage?.trim() ? normalizeUrl(prev.linkedinPage.trim()) : '',
      }));
    }

    setStepping(true);
    await new Promise(r => setTimeout(r, 200));
    setStepping(false);

    const stepNames = ['', 'brand_foundations', 'digital_footprint', 'competitors', 'challenge', 'review'];
    trackEvent('audit_step_completed', { step: currentStep, step_name: stepNames[currentStep] });

    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    } else {
      submitForm();
    }
  }

  function submitForm() {
    trackEvent('audit_submitted', {
      industry: formData.industry,
      has_instagram: !!formData.instagramHandle,
      has_competitors: !!formData.competitor1,
    });
    localStorage.setItem('brandshift_intake', JSON.stringify({
      ...formData,
      submittedAt: new Date().toISOString(),
    }));
    localStorage.setItem('brandshift_active_brand', formData.brandName);
    router.replace('/loading');
  }

  const progress = currentStep * 20;
  const ctx = CONTEXT[currentStep - 1];
  const CtxIcon = ctx.icon;

  // ── Step content ─────────────────────────────────────────────

  function renderStep() {
    switch (currentStep) {

      case 1:
        return (
          <>
            <h1 className={styles.stepHeading}>Tell us about your brand</h1>
            <Field label="Brand Name" error={errors.brandName}>
              <input
                className={`${styles.fieldInput} ${errors.brandName ? styles.inputError : ''}`}
                type="text"
                placeholder="Acme Inc."
                value={formData.brandName}
                onChange={e => setField('brandName', e.target.value)}
              />
            </Field>
            <Field label="Industry" error={errors.industry}>
              <SuggestInput
                className={`${styles.fieldInput} ${errors.industry ? styles.inputError : ''}`}
                placeholder="e.g., D2C Fashion, SaaS, FMCG"
                value={formData.industry}
                onChange={v => setField('industry', v)}
                suggestions={INDUSTRY_SUGGESTIONS}
                hasError={!!errors.industry}
              />
            </Field>
            <Field label="Target Audience" error={errors.targetAudience}>
              <SuggestInput
                className={`${styles.fieldInput} ${errors.targetAudience ? styles.inputError : ''}`}
                placeholder="e.g., Millennials, B2B Tech Leaders"
                value={formData.targetAudience}
                onChange={v => setField('targetAudience', v)}
                suggestions={AUDIENCE_SUGGESTIONS}
                hasError={!!errors.targetAudience}
              />
            </Field>
          </>
        );

      case 2:
        return (
          <>
            <h1 className={styles.stepHeading}>Your online presence</h1>
            <Field label="Website URL" error={errors.websiteUrl}>
              <input
                className={`${styles.fieldInput} ${errors.websiteUrl ? styles.inputError : ''}`}
                type="text"
                placeholder="https://yourbrand.com"
                value={formData.websiteUrl}
                onChange={e => setField('websiteUrl', e.target.value)}
              />
            </Field>
            <Field label="Instagram Handle" error={errors.instagramHandle}>
              <input
                className={`${styles.fieldInput} ${errors.instagramHandle ? styles.inputError : ''}`}
                type="text"
                placeholder="@yourbrand"
                value={formData.instagramHandle}
                onChange={e => setField('instagramHandle', e.target.value)}
              />
            </Field>
            <Field label="LinkedIn Page (Optional)">
              <input
                className={styles.fieldInput}
                type="text"
                placeholder="linkedin.com/company/yourbrand"
                value={formData.linkedinPage}
                onChange={e => setField('linkedinPage', e.target.value)}
              />
            </Field>
          </>
        );

      case 3:
        return (
          <>
            <h1 className={styles.stepHeading}>Who are your competitors?</h1>
            <p className={styles.stepSubheading}>We'll benchmark your brand against theirs</p>
            <Field label="Competitor 1" error={errors.competitor1}>
              <input
                className={`${styles.fieldInput} ${errors.competitor1 ? styles.inputError : ''}`}
                type="text"
                placeholder="Brand name or website"
                value={formData.competitor1}
                onChange={e => setField('competitor1', e.target.value)}
              />
            </Field>
            <Field label="Competitor 2" error={errors.competitor2}>
              <input
                className={`${styles.fieldInput} ${errors.competitor2 ? styles.inputError : ''}`}
                type="text"
                placeholder="Brand name or website"
                value={formData.competitor2}
                onChange={e => setField('competitor2', e.target.value)}
              />
            </Field>
            <Field label="Competitor 3 (Optional)">
              <input
                className={styles.fieldInput}
                type="text"
                placeholder="Brand name or website"
                value={formData.competitor3}
                onChange={e => setField('competitor3', e.target.value)}
              />
            </Field>
          </>
        );

      case 4:
        return (
          <>
            <h1 className={styles.stepHeading}>What's your biggest challenge?</h1>
            <Field label="Describe your challenge" error={errors.challenge}>
              <textarea
                className={`${styles.fieldTextarea} ${errors.challenge ? styles.inputError : ''}`}
                placeholder="e.g., We're struggling to differentiate from competitors"
                value={formData.challenge}
                onChange={e => setField('challenge', e.target.value)}
              />
            </Field>
            <Field label="What's your goal?">
              <textarea
                className={styles.fieldTextarea}
                placeholder="e.g., Increase brand recognition by 50% in 6 months"
                value={formData.goal}
                onChange={e => setField('goal', e.target.value)}
              />
            </Field>
          </>
        );

      case 5: {
        const competitors = [formData.competitor1, formData.competitor2, formData.competitor3]
          .filter(Boolean)
          .join(', ');
        const onlinePresence = [
          formData.websiteUrl,
          formData.instagramHandle ? `@${formData.instagramHandle}` : '',
          formData.linkedinPage || '',
        ].filter(Boolean).join(' · ');

        return (
          <>
            <h1 className={styles.stepHeading}>Review your information</h1>
            <div className={styles.summaryCard}>
              <div className={styles.summaryRow}>
                <div className={styles.summaryRowContent}>
                  <p className={styles.summaryLabel}>Brand</p>
                  <p className={styles.summaryValue}>
                    {formData.brandName}{formData.industry ? ` · ${formData.industry}` : ''}
                  </p>
                </div>
                <button className={styles.summaryEdit} onClick={() => setCurrentStep(1)}>Edit</button>
              </div>
              <div className={styles.summaryRow}>
                <div className={styles.summaryRowContent}>
                  <p className={styles.summaryLabel}>Online Presence</p>
                  <p className={styles.summaryValue}>{onlinePresence}</p>
                </div>
                <button className={styles.summaryEdit} onClick={() => setCurrentStep(2)}>Edit</button>
              </div>
              <div className={styles.summaryRow}>
                <div className={styles.summaryRowContent}>
                  <p className={styles.summaryLabel}>Competitors</p>
                  <p className={styles.summaryValue}>{competitors || '—'}</p>
                </div>
                <button className={styles.summaryEdit} onClick={() => setCurrentStep(3)}>Edit</button>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryRowLast}`}>
                <div className={styles.summaryRowContent}>
                  <p className={styles.summaryLabel}>Goal</p>
                  <p className={formData.goal ? styles.summaryValue : styles.summaryValueMuted}>
                    {formData.goal || 'Not specified'}
                  </p>
                </div>
                <button className={styles.summaryEdit} onClick={() => setCurrentStep(4)}>Edit</button>
              </div>
            </div>
          </>
        );
      }

      default:
        return null;
    }
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Top bar */}
      <header className={styles.topBar}>
        <Logo size="md" />
      </header>

      {/* Progress */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>Step {currentStep} of 5</span>
          <span className={styles.progressPct}>{progress}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Main grid */}
      <div className={styles.mainContent}>

        {/* Left — form */}
        <div className={styles.leftCol}>
          <div key={currentStep} className={styles.stepContent}>
            {renderStep()}
          </div>

          {/* Bottom nav */}
          <div className={styles.bottomNav}>
            {currentStep > 1 ? (
              <button
                className={styles.backBtn}
                onClick={() => { setErrors({}); setCurrentStep(prev => prev - 1); }}
              >
                <ChevronLeft size={16} />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              className={styles.continueBtn}
              onClick={handleContinue}
              disabled={stepping}
            >
              {stepping
                ? <span className={styles.spinner} />
                : currentStep < 5 ? 'Continue' : 'Run Brand Audit'
              }
            </button>
          </div>
        </div>

        {/* Right — context card */}
        <div className={styles.rightCol}>
          <div className={styles.contextCard}>
            <CtxIcon size={32} className={styles.contextIcon} />
            <h2 className={styles.contextTitle}>{ctx.title}</h2>
            <p className={styles.contextDesc}>{ctx.description}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
