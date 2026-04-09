'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle } from 'lucide-react';
import styles from './loading.module.css';

const STEPS = [
  'Scanning homepage architecture...',
  'Analyzing visual identity patterns...',
  'Reading Instagram content strategy...',
  'Benchmarking against competitors...',
  'Generating brand intelligence score...',
];

function parseCompetitor(val) {
  if (!val) return { name: '', url: '' };
  const isUrl = val.startsWith('http://') || val.startsWith('https://') || val.includes('.');
  if (isUrl) {
    const url = val.startsWith('http') ? val : 'https://' + val;
    return { name: val, url };
  }
  return { name: val, url: '' };
}

export default function Loading() {
  const router = useRouter();
  const [stepStates, setStepStates] = useState(STEPS.map(() => 'pending'));
  const [stepTexts, setStepTexts]   = useState(STEPS.map(() => ''));
  const [progress, setProgress]     = useState(0);
  const [errorMsg, setErrorMsg]     = useState('');
  const [activityCards, setActivityCards] = useState([
    { title: 'Homepage Read', subtitle: 'Waiting...', visible: false },
    { title: 'Instagram Scanned', subtitle: 'Waiting...', visible: false },
    { title: 'LinkedIn Analyzed', subtitle: 'Waiting...', visible: false },
    { title: 'Competitors Benchmarked', subtitle: 'Waiting...', visible: false },
  ]);

  const didRun   = useRef(false);
  const typeRefs = useRef([]);

  const typeStep = useCallback((index) => {
    const text = STEPS[index];
    let i = 0;
    const charDelay = Math.max(10, Math.floor(400 / text.length));
    if (typeRefs.current[index]) clearInterval(typeRefs.current[index]);
    typeRefs.current[index] = setInterval(() => {
      i++;
      setStepTexts(prev => {
        const next = [...prev];
        next[index] = text.slice(0, i);
        return next;
      });
      if (i >= text.length) {
        clearInterval(typeRefs.current[index]);
        typeRefs.current[index] = null;
      }
    }, charDelay);
  }, []);

  function activateStep(index) {
    setStepStates(prev => {
      const next = [...prev];
      for (let j = 0; j < index; j++) next[j] = 'done';
      next[index] = 'active';
      return next;
    });
    setStepTexts(prev => {
      const next = [...prev];
      for (let j = 0; j < index; j++) next[j] = STEPS[j];
      return next;
    });
    typeStep(index);
  }

  function completeStep(index) {
    if (typeRefs.current[index]) {
      clearInterval(typeRefs.current[index]);
      typeRefs.current[index] = null;
    }
    setStepStates(prev => {
      const next = [...prev];
      next[index] = 'done';
      return next;
    });
    setStepTexts(prev => {
      const next = [...prev];
      next[index] = STEPS[index];
      return next;
    });
  }

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    setProgress(15);
    activateStep(0);
    runAudit();
    return () => typeRefs.current.forEach(ref => ref && clearInterval(ref));
  }, []);

  async function runAudit() {
    try {
      const raw = localStorage.getItem('brandshift_intake');
      if (!raw) { router.push('/audit'); return; }
      const intake = JSON.parse(raw);
      const c1 = parseCompetitor(intake.competitor1);
      const c2 = parseCompetitor(intake.competitor2);
      const c3 = parseCompetitor(intake.competitor3);

      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: intake.brandName, websiteUrl: intake.websiteUrl,
          instagramHandle: intake.instagramHandle,
          linkedinUrl: intake.linkedinPage || '',
          comp1Name: c1.name, comp1Url: c1.url,
          comp2Name: c2.name, comp2Url: c2.url,
        }),
      });
      const scrapeData = await scrapeRes.json();

      setProgress(30);
      completeStep(0);

      setTimeout(() => {
        activateStep(1);
        setProgress(40);
        const sections = scrapeData.scraped_homepage ? Math.max(1, Math.floor(scrapeData.scraped_homepage.length / 500)) : 0;
        setActivityCards(prev => { const n = [...prev]; n[0] = { ...n[0], subtitle: `${sections} sections analyzed`, visible: true }; return n; });
      }, 300);

      setTimeout(() => {
        completeStep(1); activateStep(2); setProgress(50);
        const posts = scrapeData.scraped_instagram ? scrapeData.scraped_instagram.split('\n\n').filter(Boolean).length : 0;
        setActivityCards(prev => { const n = [...prev]; n[1] = { ...n[1], subtitle: `${posts} posts reviewed`, visible: true }; return n; });
      }, 800);

      setTimeout(() => {
        completeStep(2); activateStep(3); setProgress(55);
        const hasLinkedIn = !!scrapeData.scraped_linkedin;
        setActivityCards(prev => { const n = [...prev]; n[2] = { ...n[2], subtitle: hasLinkedIn ? 'Company page scraped' : 'Not provided', visible: true }; return n; });
      }, 1100);

      setTimeout(() => {
        completeStep(3); activateStep(3); setProgress(65);
        const compCount = [scrapeData.scraped_comp1, scrapeData.scraped_comp2].filter(Boolean).length;
        setActivityCards(prev => { const n = [...prev]; n[3] = { ...n[3], subtitle: `${compCount} brands compared`, visible: true }; return n; });
      }, 1500);

      setTimeout(() => { completeStep(3); activateStep(4); setProgress(80); }, 2000);

      const scoreRes = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: intake.brandName, industry: intake.industry,
          targetAudience: intake.targetAudience, challenge: intake.challenge,
          comp1Name: c1.name, comp2Name: c2.name, comp3Name: c3?.name || '',
          ...scrapeData,
        }),
      });
      const scoreData = await scoreRes.json();
      if (scoreData.error) throw new Error(scoreData.error);

      setProgress(95);
      completeStep(4);

      localStorage.setItem('brandshift_score', JSON.stringify(scoreData));
      localStorage.setItem('brandshift_brand', JSON.stringify({ brandName: intake.brandName, industry: intake.industry }));
      localStorage.setItem('brandshift_active_brand', intake.brandName);

      setProgress(100);
      await new Promise(r => setTimeout(r, 800));
      router.push('/results');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    }
  }

  if (errorMsg) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <AlertCircle size={32} className={styles.errorIcon} />
          <h2 className={styles.errorHeading}>Something went wrong</h2>
          <p className={styles.errorSub}>We couldn&apos;t complete the analysis. Please try again.</p>
          <button className={styles.retryBtn} onClick={() => router.push('/audit')}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.mainArea}>
        <p className={styles.heading}>Analyzing your brand intelligence...</p>
        <div className={styles.terminal}>
          {STEPS.map((step, i) => {
            const state = stepStates[i];
            if (state === 'pending') return null;
            return (
              <div key={step} className={styles.stepRow}>
                <div className={styles.stepIcon}>
                  {state === 'done'
                    ? <CheckCircle size={16} className={styles.iconDone} />
                    : <span className={styles.iconSpinning} />}
                </div>
                <span className={`${styles.stepText} ${state === 'done' ? styles.stepDone : styles.stepActive}`}>
                  {stepTexts[i]}
                  {state === 'active' && stepTexts[i].length < step.length && <span className={styles.cursor}>|</span>}
                </span>
              </div>
            );
          })}
        </div>
        <div className={styles.progressWrap}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>Processing</span>
            <span className={styles.progressPct}>{progress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <aside className={styles.feed}>
        {activityCards.map(card => (
          <div key={card.title} className={`${styles.feedCard} ${card.visible ? styles.feedCardVisible : ''}`}>
            <span className={`${styles.dot} ${card.visible ? styles.dotActive : ''}`} />
            <div>
              <p className={styles.feedTitle}>{card.title}</p>
              <p className={styles.feedSub}>{card.subtitle}</p>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
