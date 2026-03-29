'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const LOADING_STEPS = [
  { msg: 'Scraping your website…',              until: 20 },
  { msg: 'Analysing competitor positioning…',   until: 40 },
  { msg: 'Pulling Instagram data…',             until: 80 },
  { msg: 'Generating your Brand Score…',        until: Infinity },
];

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState({
    brandName: '', industry: '', brandAge: '', targetAudience: '',
    websiteUrl: '', instagramHandle: '',
    comp1Name: '', comp1Url: '', comp2Name: '', comp2Url: '',
    challenge: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (loading) {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const currentStep = LOADING_STEPS.find(s => elapsed < s.until) || LOADING_STEPS[LOADING_STEPS.length - 1];

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.brandName.trim()) { setError('Brand name is required.'); return; }
    if (!form.websiteUrl.trim()) { setError('Website URL is required.'); return; }
    if (!form.challenge.trim()) { setError('Please describe your biggest challenge.'); return; }

    setLoading(true);

    try {
      // Step 1: Scrape
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:        form.brandName,
          websiteUrl:       form.websiteUrl,
          instagramHandle:  form.instagramHandle,
          comp1Name:        form.comp1Name,
          comp1Url:         form.comp1Url,
          comp2Name:        form.comp2Name,
          comp2Url:         form.comp2Url,
        }),
      });
      const scrapeData = await scrapeRes.json();

      // Step 2: Score
      const scoreRes = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:       form.brandName,
          industry:        form.industry,
          brandAge:        form.brandAge,
          targetAudience:  form.targetAudience,
          challenge:       form.challenge,
          comp1Name:       form.comp1Name,
          comp2Name:       form.comp2Name,
          ...scrapeData,
        }),
      });
      const scoreData = await scoreRes.json();

      if (scoreData.error) throw new Error(scoreData.error);

      localStorage.setItem('brandshift_score', JSON.stringify(scoreData));
      localStorage.setItem('brandshift_brand', JSON.stringify(form));
      router.push('/results');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {loading && (
        <div className={styles.overlay}>
          <div className={styles.overlayIcon} />
          <p className={styles.overlayMsg}>{currentStep.msg}</p>
          <div className={styles.overlayDots}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
          <p className={styles.overlaySub}>{elapsed}s elapsed</p>
        </div>
      )}

      <header className={styles.header}>
        <span className={styles.logo}>BrandShift</span>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.heroHeading}>
          Know exactly where your <span>brand stands.</span>
        </h1>
        <p className={styles.heroSub}>
          AI analyses your website, social media, and competitors.
          Then tells you what to fix and in what order.
        </p>
      </section>

      <div className={styles.formWrapper}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Brand basics */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Brand Name *</label>
              <input type="text" value={form.brandName} onChange={set('brandName')}
                placeholder="e.g. Mamaearth" required />
            </div>
            <div className={styles.field}>
              <label>Industry</label>
              <select value={form.industry} onChange={set('industry')}>
                <option value="">Select industry</option>
                <option>FMCG/Food &amp; Beverage</option>
                <option>D2C/Consumer</option>
                <option>Fashion &amp; Lifestyle</option>
                <option>Tech/SaaS</option>
                <option>Health &amp; Wellness</option>
                <option>Regional/Family Business</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Brand Age</label>
              <select value={form.brandAge} onChange={set('brandAge')}>
                <option value="">Select age</option>
                <option>Less than 2 years</option>
                <option>2–5 years</option>
                <option>5–15 years</option>
                <option>15–30 years</option>
                <option>30+ years</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Target Audience</label>
              <select value={form.targetAudience} onChange={set('targetAudience')}>
                <option value="">Select audience</option>
                <option>Gen Z 18–25</option>
                <option>Millennials 26–35</option>
                <option>Mixed Age Groups</option>
                <option>Regional/Tier 2–3</option>
                <option>Premium/Luxury</option>
              </select>
            </div>
          </div>

          <hr className={styles.divider} />
          <p className={styles.sectionLabel}>Online Presence</p>

          <div className={styles.field}>
            <label>Website URL *</label>
            <input type="url" value={form.websiteUrl} onChange={set('websiteUrl')}
              placeholder="https://yourbrand.com" required />
          </div>

          <div className={styles.field}>
            <label>Instagram Handle</label>
            <input type="text" value={form.instagramHandle} onChange={set('instagramHandle')}
              placeholder="yourbrand — without the @" />
          </div>

          <hr className={styles.divider} />
          <p className={styles.sectionLabel}>Competitors</p>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Competitor 1 Name</label>
              <input type="text" value={form.comp1Name} onChange={set('comp1Name')}
                placeholder="e.g. The Derma Co" />
            </div>
            <div className={styles.field}>
              <label>Competitor 1 Website</label>
              <input type="url" value={form.comp1Url} onChange={set('comp1Url')}
                placeholder="https://competitor.com" />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Competitor 2 Name <span style={{color:'var(--text-dim)'}}>optional</span></label>
              <input type="text" value={form.comp2Name} onChange={set('comp2Name')}
                placeholder="e.g. Minimalist" />
            </div>
            <div className={styles.field}>
              <label>Competitor 2 Website <span style={{color:'var(--text-dim)'}}>optional</span></label>
              <input type="url" value={form.comp2Url} onChange={set('comp2Url')}
                placeholder="https://competitor2.com" />
            </div>
          </div>

          <hr className={styles.divider} />

          <div className={styles.field}>
            <label>Biggest Challenge Right Now *</label>
            <textarea value={form.challenge} onChange={set('challenge')} required
              placeholder="e.g. Younger audience doesn't connect with us, competitors are outpacing us on social media, our messaging feels generic..." />
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Running Audit…' : 'Run Brand Audit →'}
          </button>
        </form>
      </div>
    </div>
  );
}
