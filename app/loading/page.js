'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle } from 'lucide-react';
import styles from './loading.module.css';
import { trackEvent } from '@/lib/analytics';

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
  const [stepStates, setStepStates]   = useState(STEPS.map(() => 'pending'));
  const [stepTexts, setStepTexts]     = useState(STEPS.map(() => ''));
  const [progress, setProgress]       = useState(0);
  const [errorMsg, setErrorMsg]       = useState('');
  const [activityCards, setActivityCards] = useState([
    { title: 'Homepage Read',           subtitle: 'Analyzing...', visible: false },
    { title: 'Instagram Scanned',       subtitle: 'Analyzing...', visible: false },
    { title: 'Competitors Benchmarked', subtitle: 'Analyzing...', visible: false },
  ]);
  const didRun = useRef(false);

  function typeStep(index) {
    const text = STEPS[index];
    const charDelay = Math.max(8, Math.floor(400 / text.length));
    let i = 0;
    const id = setInterval(() => {
      i++;
      setStepTexts(prev => {
        const next = [...prev];
        next[index] = text.slice(0, i);
        return next;
      });
      if (i >= text.length) clearInterval(id);
    }, charDelay);
  }

  function activateStep(index) {
    setStepStates(prev => {
      const next = [...prev];
      if (index > 0) next[index - 1] = 'done';
      next[index] = 'active';
      return next;
    });
    typeStep(index);
  }

  function completeAllSteps() {
    setStepStates(STEPS.map(() => 'done'));
    setStepTexts([...STEPS]);
  }

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    setProgress(15);
    activateStep(0);
    runAudit();
  }, []);

  async function runAudit() {
    try {
      const raw = localStorage.getItem('brandshift_intake');
      if (!raw) { router.push('/audit'); return; }
      const intake = JSON.parse(raw);
      trackEvent('analysis_started', { brand_name: intake?.brandName });

      // Clear stale results from any previous audit immediately
      localStorage.removeItem('brandshift_score');
      localStorage.removeItem('brandshift_brand');
      localStorage.removeItem('brandshift_scraped');

      const c1 = parseCompetitor(intake.competitor1);
      const c2 = parseCompetitor(intake.competitor2);

      // ── Scrape ──────────────────────────────────────────────
      const scrapeRes = await fetch('/api/scrape', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:       intake.brandName,
          websiteUrl:      intake.websiteUrl,
          instagramHandle: intake.instagramHandle,
          linkedinUrl:     intake.linkedinPage || '',
          comp1Name:       c1.name,
          comp1Url:        c1.url,
          comp2Name:       c2.name,
          comp2Url:        c2.url,
        }),
      });
      const scrapeData = await scrapeRes.json();
      if (scrapeData.error) throw new Error('Scrape failed: ' + scrapeData.error);

      trackEvent('scraping_completed', {
        homepage_success: !!scrapeData.scraped_homepage,
        instagram_success: !!scrapeData.scraped_instagram,
        competitor_success: !!scrapeData.scraped_comp1,
      });

      // Activate steps 2 → 3 → 4 in sequence after scrape
      activateStep(1);
      setProgress(30);
      await new Promise(r => setTimeout(r, 400));

      activateStep(2);
      setProgress(50);
      await new Promise(r => setTimeout(r, 400));

      activateStep(3);
      setProgress(65);

      // Update activity feed with real counts
      const homepageSections = scrapeData.scraped_homepage
        ? Math.max(1, Math.floor(scrapeData.scraped_homepage.length / 500))
        : 0;
      const instagramPosts = scrapeData.scraped_instagram
        ? scrapeData.scraped_instagram.split('\n\n').filter(Boolean).length
        : 0;
      const competitorCount = [scrapeData.scraped_comp1, scrapeData.scraped_comp2]
        .filter(Boolean).length;

      setActivityCards([
        { title: 'Homepage Read',           subtitle: `${homepageSections} sections analyzed`, visible: true },
        { title: 'Instagram Scanned',       subtitle: `${instagramPosts} posts reviewed`,      visible: true },
        { title: 'Competitors Benchmarked', subtitle: `${competitorCount} brands compared`,    visible: true },
      ]);

      await new Promise(r => setTimeout(r, 300));

      // ── Score ──────────────────────────────────────────────
      activateStep(4);
      setProgress(80);

      const scoreRes = await fetch('/api/score', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:      intake.brandName,
          industry:       intake.industry,
          targetAudience: intake.targetAudience,
          challenge:      intake.challenge,
          comp1Name:      c1.name,
          comp2Name:      c2.name,
          ...scrapeData,
        }),
      });
      const scoreData = await scoreRes.json();
      if (scoreData.error) throw new Error(scoreData.error);

      trackEvent('score_generated', {
        brand_name: intake?.brandName,
        overall_score: scoreData?.overall_score,
        data_confidence: scoreData?.data_confidence,
        brand_type: scoreData?.brand_type,
      });

      setProgress(95);
      completeAllSteps();

      localStorage.setItem('brandshift_score',        JSON.stringify(scoreData));
      localStorage.setItem('brandshift_brand',        JSON.stringify({ brandName: intake.brandName, industry: intake.industry }));
      localStorage.setItem('brandshift_active_brand', intake.brandName);
      localStorage.setItem('brandshift_scraped',      JSON.stringify({
        screenshots:       scrapeData.screenshots      || {},
        scraped_instagram: scrapeData.scraped_instagram || '',
        scraped_linkedin:  scrapeData.scraped_linkedin  || '',
        comp1Name:         c1.name,
        comp2Name:         c2.name,
        websiteUrl:        intake.websiteUrl || '',
        linkedinUrl:       intake.linkedinPage || '',
      }));

      setProgress(100);
      await new Promise(r => setTimeout(r, 800));
      router.replace('/results');

    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    }
  }

  // ── Error state ──────────────────────────────────────────────
  if (errorMsg) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <AlertCircle size={32} className={styles.errorIcon} />
          <h2 className={styles.errorHeading}>Something went wrong</h2>
          <p className={styles.errorSub}>
            We couldn&apos;t complete the analysis. Please try again.
          </p>
          <button className={styles.retryBtn} onClick={() => router.push('/audit')}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* Left — main loading area */}
      <div className={styles.mainArea}>
        <p className={styles.heading}>Analyzing your brand intelligence...</p>

        {/* Terminal card */}
        <div className={styles.terminal}>
          {STEPS.map((step, i) => {
            const state = stepStates[i];
            return (
              <div key={step} className={styles.stepRow}>
                {/* Icon */}
                <div className={styles.iconWrap}>
                  {state === 'done'   && <CheckCircle size={16} className={styles.iconDone} />}
                  {state === 'active' && <span className={styles.iconSpinning} />}
                  {state === 'pending' && <span className={styles.iconPending} />}
                </div>

                {/* Text */}
                <span className={`${styles.stepText} ${styles[`state_${state}`]}`}>
                  {state === 'pending' ? step : (stepTexts[i] || step)}
                  {state === 'active' && stepTexts[i].length < step.length && (
                    <span className={styles.cursor}>|</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
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

      {/* Right — activity feed */}
      <aside className={styles.feed}>
        {activityCards.map(card => (
          <div
            key={card.title}
            className={`${styles.feedCard} ${card.visible ? styles.feedCardVisible : ''}`}
          >
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
