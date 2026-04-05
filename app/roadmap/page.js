'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './roadmap.module.css';

export default function Roadmap() {
  const router = useRouter();
  const [roadmap, setRoadmap] = useState(null);
  const [brand, setBrand]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    // If we already generated this roadmap, use cached version
    const cached = localStorage.getItem('brandshift_roadmap');
    if (cached) {
      setRoadmap(JSON.parse(cached));
      const b = localStorage.getItem('brandshift_brand');
      if (b) setBrand(JSON.parse(b));
      setLoading(false);
      return;
    }

    // Otherwise generate from score data
    const rawScore = localStorage.getItem('brandshift_score');
    const rawBrand = localStorage.getItem('brandshift_brand');
    const rawIntake = localStorage.getItem('brandshift_intake');

    if (!rawScore) {
      router.push('/audit');
      return;
    }

    const scoreData = JSON.parse(rawScore);
    const brandData = rawBrand ? JSON.parse(rawBrand) : {};
    const intake    = rawIntake ? JSON.parse(rawIntake) : {};

    if (rawBrand) setBrand(brandData);

    generateRoadmap(scoreData, brandData, intake);
  }, []);

  async function generateRoadmap(scoreData, brandData, intake) {
    try {
      const res = await fetch('/api/roadmap', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:      brandData.brandName || intake.brandName || 'Your Brand',
          industry:       brandData.industry  || intake.industry  || '',
          targetAudience: intake.targetAudience || '',
          direction:      intake.challenge || '',
          toneDirection:  '',
          marketFocus:    '',
          scoreData,
        }),
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      localStorage.setItem('brandshift_roadmap', JSON.stringify(data));
      setRoadmap(data);
    } catch (err) {
      setError(err.message || 'Failed to generate roadmap. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Building your brand roadmap...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <p className={styles.errorMsg}>{error}</p>
        <button className={styles.retryBtn} onClick={() => router.push('/results')}>
          ← Back to results
        </button>
      </div>
    );
  }

  if (!roadmap) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>BrandShift</span>
      </header>

      <div className={styles.container}>
        <div className={styles.topSection}>
          <h1 className={styles.brandHeading}>
            {brand?.brandName || 'Your Brand'} — Brand Roadmap
          </h1>
          <p className={styles.subtext}>Your personalised execution plan</p>
        </div>

        {roadmap.two_months && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Next 2 Months</h2>
              <p className={styles.sectionTheme}>{roadmap.two_months.theme}</p>
            </div>
            <div className={styles.weekCards}>
              {roadmap.two_months.actions?.map((action, i) => (
                <div key={i} className={styles.weekCard}>
                  <span className={styles.weekBadge}>Week {action.week}</span>
                  <div className={styles.weekContent}>
                    <p className={styles.weekTask}>{action.task}</p>
                    <p className={styles.weekWhy}>{action.why}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {roadmap.six_months && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>6 Month Plan</h2>
              <p className={styles.sectionTheme}>{roadmap.six_months.theme}</p>
            </div>
            <div className={styles.timeline}>
              {roadmap.six_months.milestones?.map((m, i) => (
                <div key={i} className={styles.monthNode}>
                  <div className={styles.monthDot}>M{m.month}</div>
                  <div className={styles.monthContent}>
                    <p className={styles.monthGoal}>{m.goal}</p>
                    <p className={styles.monthHow}>{m.how}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {roadmap.one_year && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>1 Year Vision</h2>
              <p className={styles.sectionTheme}>{roadmap.one_year.theme}</p>
            </div>
            <div className={styles.objectives}>
              {roadmap.one_year.objectives?.map((obj, i) => (
                <div key={i} className={styles.objective}>
                  <span className={styles.objNumber}>{String(i + 1).padStart(2, '0')}</span>
                  <p className={styles.objText}>{obj}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {roadmap.bigger_picture && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>The Bigger Picture</h2>
            </div>
            <div className={styles.biggerPicture}>
              <p className={styles.vision}>{roadmap.bigger_picture.vision}</p>
              <p className={styles.marketPos}>{roadmap.bigger_picture.market_position}</p>
            </div>
          </div>
        )}

        <div className={styles.actionRow}>
          <a href="/dashboard" className={styles.dashboardBtn}>
            Go to Dashboard →
          </a>
          <button className={styles.downloadBtn} onClick={() => window.print()}>
            Download Roadmap (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
