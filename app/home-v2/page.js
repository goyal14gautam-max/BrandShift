'use client';

import { useRouter } from 'next/navigation';
import styles from './home.module.css';

const STEPS = [
  {
    num: '01',
    title: 'Tell us about your brand',
    body: 'Share your website, Instagram handle, and two competitors. Takes 2 minutes.',
  },
  {
    num: '02',
    title: 'AI analyses everything',
    body: 'We scrape your site, pull social data, and benchmark against your competitors in real time.',
  },
  {
    num: '03',
    title: 'Get your Brand Score',
    body: 'A detailed audit across 5 dimensions — with a prioritised action list tailored to your brand.',
  },
];

const DIMENSIONS = [
  { label: 'Visual Identity',        color: 'var(--bs-violet)', pct: 25 },
  { label: 'Tone & Voice',           color: 'var(--bs-orange)', pct: 25 },
  { label: 'Trend Relevance',        color: 'var(--bs-teal)',   pct: 20 },
  { label: 'Competitor Positioning', color: 'var(--bs-amber)',  pct: 20 },
  { label: 'Audience Alignment',     color: 'var(--bs-violet)', pct: 10 },
];

const STATS = [
  { value: '5', label: 'Brand dimensions scored' },
  { value: '< 2m', label: 'Time to full audit' },
  { value: '100%', label: 'AI-powered analysis' },
];

export default function HomeV2() {
  const router = useRouter();

  return (
    <div className={styles.page}>

      {/* ── Nav ── */}
      <header className={styles.nav}>
        <span className={styles.navLogo}>BrandShift</span>
        <button className={styles.navCta} onClick={() => router.push('/audit')}>
          Start Free Audit →
        </button>
      </header>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroPill}>AI Brand Intelligence for Indian Brands</div>
        <h1 className={styles.heroHeading}>
          Know exactly where your<br />
          <em>brand is losing ground.</em>
        </h1>
        <p className={styles.heroSub}>
          AI analyses your website, social media, and competitors.
          Then tells you what to fix — and in what order.
        </p>
        <div className={styles.heroActions}>
          <button className={styles.primaryBtn} onClick={() => router.push('/audit')}>
            Run Free Brand Audit →
          </button>
          <span className={styles.heroNote}>No signup. Results in under 2 minutes.</span>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className={styles.statsRow}>
        {STATS.map(s => (
          <div key={s.label} className={styles.stat}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Score preview ── */}
      <section className={styles.previewSection}>
        <div className={styles.sectionLabel}>What you get</div>
        <h2 className={styles.sectionHeading}>A complete brand audit, not just a score</h2>
        <p className={styles.sectionSub}>
          Every dimension is weighted, justified with evidence from your actual online presence,
          and compared against your competitors.
        </p>

        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <div>
              <p className={styles.previewBrand}>Mamaearth <span className={styles.previewIndustry}>D2C / Health & Wellness</span></p>
              <p className={styles.previewMeta}>Sample audit — 5 dimensions analysed</p>
            </div>
            <div className={styles.scoreRing}>
              <svg viewBox="0 0 100 100" width="80" height="80">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bs-teal)" strokeWidth="8"
                  strokeDasharray="251" strokeDashoffset="63"
                  transform="rotate(-90 50 50)" strokeLinecap="round" />
              </svg>
              <span className={styles.scoreNum}>75</span>
            </div>
          </div>

          <div className={styles.dimList}>
            {DIMENSIONS.map(d => (
              <div key={d.label} className={styles.dimRow}>
                <span className={styles.dimLabel}>{d.label}</span>
                <div className={styles.dimBar}>
                  <div className={styles.dimFill} style={{
                    width: `${60 + Math.random() * 30}%`,
                    background: d.color,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className={styles.howSection}>
        <div className={styles.sectionLabel}>How it works</div>
        <h2 className={styles.sectionHeading}>From input to insight in minutes</h2>

        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s.num} className={styles.step}>
              <div className={styles.stepNum}>{s.num}</div>
              <div className={styles.stepBody}>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepText}>{s.body}</p>
              </div>
              {i < STEPS.length - 1 && <div className={styles.stepConnector} />}
            </div>
          ))}
        </div>
      </section>

      {/* ── For Indian brands ── */}
      <section className={styles.contextSection}>
        <div className={styles.contextCard}>
          <div className={styles.sectionLabel}>Built for India</div>
          <h2 className={styles.contextHeading}>
            Indian consumers are different.<br />Your brand audit should be too.
          </h2>
          <p className={styles.contextBody}>
            BrandShift understands regional audiences, D2C dynamics, and the competitive
            landscape of Indian markets — not just generic global benchmarks.
          </p>
          <button className={styles.primaryBtn} onClick={() => router.push('/audit')}>
            Audit My Brand →
          </button>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaHeading}>Ready to see where you stand?</h2>
        <p className={styles.ctaSub}>
          Get a full brand audit in under 2 minutes. Free, no signup required.
        </p>
        <button className={styles.primaryBtn} onClick={() => router.push('/audit')}>
          Start Free Audit →
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <span className={styles.footerLogo}>BrandShift</span>
        <span className={styles.footerNote}>AI Brand Intelligence for Indian Brands</span>
      </footer>

    </div>
  );
}
