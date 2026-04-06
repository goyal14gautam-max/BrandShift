'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import styles from './forgot.module.css';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/callback?next=/reset-password',
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.logo}>BrandShift</div>
      <div className={styles.card}>
        {sent ? (
          <>
            <h1 className={styles.heading}>Reset link sent</h1>
            <p className={styles.sub}>Check your email at <strong>{email}</strong> for a password reset link.</p>
            <button className={styles.ghostBtn} onClick={() => router.push('/login')}>← Back to sign in</button>
          </>
        ) : (
          <>
            <h1 className={styles.heading}>Reset your password</h1>
            <p className={styles.sub}>Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Email address</label>
                <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@brand.com" />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : 'Send reset link'}
              </button>
            </form>
            <button className={styles.ghostBtn} onClick={() => router.push('/login')}>← Back to sign in</button>
          </>
        )}
      </div>
    </div>
  );
}
