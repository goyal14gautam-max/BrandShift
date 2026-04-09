'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import Logo from '@/components/Logo';
import styles from './signup.module.css';

function passwordStrength(pw) {
  if (!pw || pw.length < 8) return { level: 'weak', pct: 33 };
  const hasSpecial = /[0-9!@#$%^&*]/.test(pw);
  if (hasSpecial) return { level: 'strong', pct: 100 };
  return { level: 'medium', pct: 66 };
}

export default function Signup() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const supabase = createSupabaseBrowserClient();
  const strength = passwordStrength(password);

  async function handleGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    });
  }

  async function handleLinkedIn() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
        scopes: 'openid profile email',
      },
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!agreed) { setError('Please agree to the Terms of Service.'); return; }

    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin + '/auth/callback',
      },
    });

    if (err) { setError(err.message); setLoading(false); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.logo}><Logo size="lg" /></div>
        <div className={styles.card}>
          <CheckCircle size={48} color="var(--bs-teal)" style={{ display: 'block', margin: '0 auto 20px' }} />
          <h1 className={styles.heading}>Check your email</h1>
          <p className={styles.sub}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
          <button className={styles.ghostBtn} onClick={() => setDone(false)}>Wrong email? Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.logo}><Logo size="lg" /></div>

      <div className={styles.card}>
        <h1 className={styles.heading}>Create your account</h1>
        <p className={styles.sub}>Start with a free brand audit</p>

        <button className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
          </svg>
          Sign up with Google
        </button>

        <button className={styles.googleBtn} onClick={handleLinkedIn} disabled={loading} style={{ background: '#0A66C2', color: 'white', marginTop: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          Sign up with LinkedIn
        </button>

        <div className={styles.divider}><span>or</span></div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Full name</label>
            <input className={styles.input} type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Your name" />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email address</label>
            <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@brand.com" />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.passwordWrap}>
              <input className={styles.input} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 characters" />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(v => !v)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <div className={styles.strengthBar}>
                <div className={`${styles.strengthFill} ${styles[strength.level]}`} style={{ width: `${strength.pct}%` }} />
              </div>
            )}
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

          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>
              I agree to the{' '}
              <a href="/terms" target="_blank" className={styles.textLink}>Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" className={styles.textLink}>Privacy Policy</a>
            </span>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Create free account'}
          </button>
        </form>

        <p className={styles.switchLink}>
          Already have an account?{' '}
          <button className={styles.textLink} onClick={() => router.push('/login')}>Sign in →</button>
        </p>
      </div>
    </div>
  );
}
