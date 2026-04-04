'use client';

import { useState, useEffect } from 'react';
import styles from './roadmap.module.css';

export default function Roadmap() {
  const [roadmap, setRoadmap] = useState(null);
  const [brand, setBrand]     = useState(null);

  useEffect(() => {
    const r = localStorage.getItem('brandshift_roadmap');
    const b = localStorage.getItem('brandshift_brand');
    if (r) setRoadmap(JSON.parse(r));
    if (b) setBrand(JSON.parse(b));
  }, []);

  if (!roadmap) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'var(--text-muted)' }}>
        No roadmap found. <a href="/" style={{ color:'var(--accent)', marginLeft:'0.5rem' }}>Start an audit →</a>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>BrandShift</span>
      </header>

      <div className={styles.container}>
        {/* Top */}
        <div className={styles.topSection}>
          <h1 className={styles.brandHeading}>
            {brand?.brandName || 'Your Brand'} — Brand Roadmap
          </h1>
          <p className={styles.subtext}>Your personalised execution plan</p>
        </div>

        {/* Section 1: 2 Months */}
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

        {/* Section 2: 6 Month Plan */}
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

        {/* Section 3: 1 Year Vision */}
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

        {/* Section 4: Bigger Picture */}
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

        {/* Actions */}
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
