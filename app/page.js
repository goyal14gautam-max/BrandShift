'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';

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

const WHAT_YOU_GET = [
  'Brand Relevance Score across 6 dimensions',
  'Evidence pulled from your actual website and social content',
  'Competitor gap analysis and positioning',
  '8-week execution roadmap with weekly tasks',
  'Stakeholder-ready PDF report',
  'Weekly score tracking and Monday brief',
];

const SAMPLE_DIMS = [
  { label: 'Visual Identity',        color: 'var(--bs-violet)', score: 74 },
  { label: 'Brand Voice',            color: 'var(--bs-orange)', score: 61 },
  { label: 'Trend Adherence',        color: 'var(--bs-teal)',   score: 71 },
  { label: 'Competitive Position',   color: 'var(--bs-amber)',  score: 58 },
  { label: 'Social Performance',     color: 'var(--bs-violet)', score: 69 },
];

export default function Home() {
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
              <p className={styles.previewBrand}>
                BrandShift <span className={styles.previewIndustry}>D2C / SaaS</span>
              </p>
              <p className={styles.previewMeta}>Sample audit — 5 dimensions analysed</p>
            </div>
            <div className={styles.scoreRing}>
              <svg viewBox="0 0 100 100" width="80" height="80">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bs-teal)" strokeWidth="8"
                  strokeDasharray="251" strokeDashoffset="82"
                  transform="rotate(-90 50 50)" strokeLinecap="round" />
              </svg>
              <span className={styles.scoreNum}>67</span>
            </div>
          </div>

          <div className={styles.dimList}>
            {SAMPLE_DIMS.map(d => (
              <div key={d.label} className={styles.dimRow}>
                <span className={styles.dimLabel}>{d.label}</span>
                <div className={styles.dimBar}>
                  <div className={styles.dimFill} style={{ width: `${d.score}%`, background: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works + What you get (parallel) ── */}
      <section className={styles.parallelSection}>

        {/* Left — How it works */}
        <div className={styles.parallelCol}>
          <p className={styles.parallelLabel}>PROCESS</p>
          <h2 className={styles.parallelHeading}>How it works</h2>
          <div className={styles.stepsList}>
            {STEPS.map(s => (
              <div key={s.num} className={styles.stepRow}>
                <span className={styles.stepNum}>{s.num}</span>
                <div>
                  <p className={styles.stepTitle}>{s.title}</p>
                  <p className={styles.stepText}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — What you get */}
        <div className={styles.parallelCol}>
          <p className={styles.parallelLabel}>OUTPUT</p>
          <h2 className={styles.parallelHeading}>What you get</h2>
          <div className={styles.getList}>
            {WHAT_YOU_GET.map(item => (
              <div key={item} className={styles.getRow}>
                <span className={styles.getBullet} />
                <p className={styles.getItem}>{item}</p>
              </div>
            ))}
          </div>
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
