'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { trackPageView, trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { getPostLoginDestination } from '@/lib/postLoginRoute';
import Logo from '@/components/Logo';

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
  const { user, isLoading } = useAuth();

  // Detect auth-in-progress synchronously so we never flash landing UI:
  //   - URL hash like #access_token=... (Supabase implicit-flow fallback)
  //   - URL query like ?code=... (PKCE callback that landed here by mistake)
  //   - Active session cookies (logged-in user hitting `/`)
  const [authInFlight, setAuthInFlight] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (/access_token|refresh_token|error_description/.test(hash)) return true;
    if (/[?&]code=/.test(search)) return true;
    if (document.cookie.split('; ').some(c => c.startsWith('sb-') && c.includes('-auth-token'))) return true;
    return false;
  });

  async function handleGoToDashboard() {
    try {
      const res = await fetch('/api/auth/account');
      const { account } = await res.json();
      if (!account) {
        router.push('/login');
        return;
      }
      let profile = null;
      if (account.primary_brand) {
        const profileRes = await fetch(
          `/api/profile?brandName=${encodeURIComponent(account.primary_brand)}`
        );
        if (profileRes.ok) profile = await profileRes.json();
      }
      router.push(getPostLoginDestination(account, profile));
    } catch {
      router.push('/login');
    }
  }

  useEffect(() => {
    trackPageView('landing_page');
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        // Stale cookies or no session — show the landing page after all.
        setAuthInFlight(false);
        return;
      }
      // Authenticated — route fast. Let /dashboard handle further routing
      // (it already redirects to /results if there's no roadmap).
      try {
        const res = await fetch('/api/auth/account');
        const { account } = res.ok ? await res.json() : { account: null };
        if (!account?.primary_brand) {
          window.location.replace('/audit');
          return;
        }
        window.location.replace('/dashboard');
      } catch {
        window.location.replace('/dashboard');
      }
    });
  }, []);

  // Never render the landing UI when an auth flow is in-flight or the user
  // is already signed in — show a minimal splash instead.
  if (authInFlight || user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bs-bg-dark, #0a0a0a)',
        flexDirection: 'column',
        gap: 16,
      }}>
        <Logo size="md" />
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.15)',
          borderTopColor: 'var(--bs-orange, #e8622a)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* ── Nav ── */}
      <header className={styles.nav}>
        <Link href="/" style={{ textDecoration: 'none' }}><Logo size="md" /></Link>
        <div className={styles.navRight}>
          {!isLoading && (
            user ? (
              <button className={styles.navCta} onClick={handleGoToDashboard}>
                Go to Dashboard →
              </button>
            ) : (
              <>
                <button className={styles.navGhost} onClick={() => router.push('/login')}>
                  Sign in
                </button>
                <Link
                  href="/pricing"
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 14,
                    color: 'var(--bs-text-secondary)',
                    textDecoration: 'none',
                  }}
                >
                  Pricing
                </Link>
                <button className={styles.navCta} onClick={() => { trackEvent('cta_clicked', { cta: 'start_free_audit', location: 'nav' }); router.push('/audit'); }}>
                  Start free audit
                </button>
              </>
            )
          )}
        </div>
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
          <button className={styles.primaryBtn} onClick={() => { trackEvent('cta_clicked', { cta: 'start_free_audit', location: 'hero' }); router.push('/audit'); }}>
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
        <p className={styles.ctaSignIn}>
          Already have an account?{' '}
          <button className={styles.ctaSignInLink} onClick={() => router.push('/login')}>Sign in →</button>
        </p>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <Logo size="sm" />
        <span className={styles.footerNote}>AI Brand Intelligence for Indian Brands</span>
      </footer>

    </div>
  );
}
