'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './signup.module.css';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail]   = useState('');
  const [done, setDone]     = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span className={styles.logo}>BrandShift</span>

        {done ? (
          <>
            <h1 className={styles.heading}>You're on the list</h1>
            <p className={styles.sub}>We'll be in touch shortly to set up your brand dashboard.</p>
            <button className={styles.btn} onClick={() => router.push('/audit')}>
              Run a free audit now →
            </button>
          </>
        ) : (
          <>
            <h1 className={styles.heading}>Get early access</h1>
            <p className={styles.sub}>
              Weekly brand score tracking, Monday briefs, and an 8-week roadmap — built for your brand.
            </p>
            <form className={styles.form} onSubmit={handleSubmit}>
              <input
                className={styles.input}
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button className={styles.btn} type="submit">
                Get early access →
              </button>
            </form>
            <p className={styles.note}>No credit card required · First audit is free</p>
            <button className={styles.skip} onClick={() => router.push('/audit')}>
              Skip — just run a free audit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
