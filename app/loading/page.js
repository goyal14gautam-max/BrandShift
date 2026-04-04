'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './loading.module.css';

const STEPS = [
  { msg: 'Scraping your website…',            until: 20 },
  { msg: 'Analysing competitor positioning…', until: 45 },
  { msg: 'Pulling Instagram data…',           until: 75 },
  { msg: 'Generating your Brand Score…',      until: Infinity },
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
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const timerRef = useRef(null);
  const didRun = useRef(false);

  const currentStep = STEPS.find(s => elapsed < s.until) || STEPS[STEPS.length - 1];

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    runAudit();

    return () => clearInterval(timerRef.current);
  }, []);

  async function runAudit() {
    try {
      const raw = localStorage.getItem('brandshift_intake');
      if (!raw) { router.push('/audit'); return; }
      const intake = JSON.parse(raw);

      const c1 = parseCompetitor(intake.competitor1);
      const c2 = parseCompetitor(intake.competitor2);
      const c3 = parseCompetitor(intake.competitor3);

      // Step 1 — scrape
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:       intake.brandName,
          websiteUrl:      intake.websiteUrl,
          instagramHandle: intake.instagramHandle,
          comp1Name:       c1.name,
          comp1Url:        c1.url,
          comp2Name:       c2.name,
          comp2Url:        c2.url,
        }),
      });
      const scrapeData = await scrapeRes.json();

      // Step 2 — score
      const scoreRes = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:      intake.brandName,
          industry:       intake.industry,
          targetAudience: intake.targetAudience,
          challenge:      intake.challenge,
          comp1Name:      c1.name,
          comp2Name:      c2.name,
          comp3Name:      c3.name,
          ...scrapeData,
        }),
      });
      const scoreData = await scoreRes.json();
      if (scoreData.error) throw new Error(scoreData.error);

      // Persist results
      localStorage.setItem('brandshift_score', JSON.stringify(scoreData));
      localStorage.setItem('brandshift_brand', JSON.stringify({
        brandName: intake.brandName,
        industry:  intake.industry,
      }));

      clearInterval(timerRef.current);
      router.push('/results');
    } catch (err) {
      clearInterval(timerRef.current);
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    }
  }

  if (errorMsg) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <p className={styles.errorMsg}>{errorMsg}</p>
          <button className={styles.retryBtn} onClick={() => router.push('/audit')}>
            ← Back to audit form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p className={styles.msg}>{currentStep.msg}</p>
        <div className={styles.dots}>
          <span /><span /><span />
        </div>
        <p className={styles.elapsed}>{elapsed}s elapsed</p>
      </div>
    </div>
  );
}
