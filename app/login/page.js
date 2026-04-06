'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import styles from './login.module.css';

function LoginInner() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const supabase = createSupabaseBrowserClient();

  function friendlyError(msg) {
    if (msg?.includes('Invalid login credentials')) return 'Wrong email or password.';
    if (msg?.includes('Email not confirmed')) return 'Please check your email to confirm your account.';
    return msg || 'Something went wrong. Please try again.';
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback?next=/dashboard' },
    });
  }

  async function handleEmailSignIn(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(friendlyError(err.message)); setLoading(false); return; }
    window.location.href = '/dashboard';
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    });
    if (err) { setError(friendlyError(err.message)); setLoading(false); return; }
    setMagicSent(true);
    setLoading(false);
  }

  if (magicSent) {
    return (
      <div className={styles.page}>
        <div className={styles.logo}>BrandShift</div>
        <div className={styles.card}>
          <p className={styles.magicIcon}>✉️</p>
          <h1 className={styles.heading}>Check your email</h1>
          <p className={styles.sub}>We sent a login link to <strong>{email}</strong>. Click it to sign in.</p>
          <button className={styles.ghostBtn} onClick={() => setMagicSent(false)}>← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.logo}>BrandShift</div>

      <div className={styles.card}>
        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.sub}>Sign in to your BrandShift account</p>

        {/* Google */}
        <button className={styles.googleBtn} onClick={handleGoogleSignIn} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
          </svg>
          Continue with Google
        </button>

        <div className={styles.divider}><span>or</span></div>

        {!magicMode ? (
          <form onSubmit={handleEmailSignIn} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Email address</label>
              <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@brand.com" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <div className={styles.passwordWrap}>
                <input className={styles.input} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="button" className={styles.forgotLink} onClick={() => router.push('/forgot-password')}>Forgot password?</button>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'Sign in'}
            </button>

            <p className={styles.magicPrompt}>
              Prefer not to use a password?{' '}
              <button type="button" className={styles.textLink} onClick={() => setMagicMode(true)}>Send me a magic link</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleMagicLink} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Email address</label>
              <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@brand.com" />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'Send magic link'}
            </button>
            <button type="button" className={styles.ghostBtn} onClick={() => setMagicMode(false)}>← Back to password</button>
          </form>
        )}

        <p className={styles.switchLink}>
          Don't have an account?{' '}
          <button className={styles.textLink} onClick={() => router.push('/signup')}>Sign up →</button>
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
