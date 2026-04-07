'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import Logo from '@/components/Logo';
import styles from './reset.module.css';

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/dashboard');
  }

  return (
    <div className={styles.page}>
      <div className={styles.logo}><Logo size="lg" /></div>
      <div className={styles.card}>
        <h1 className={styles.heading}>Set new password</h1>
        <p className={styles.sub}>Choose a strong password for your account.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>New password</label>
            <input className={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 characters" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Confirm password</label>
            <input
              className={`${styles.input} ${confirm && confirm !== password ? styles.inputError : ''}`}
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="Repeat password"
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
