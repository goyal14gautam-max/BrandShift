'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './settings.module.css';

function formatMemberSince(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function planLabel(plan) {
  if (plan === 'starter') return 'Starter';
  if (plan === 'agency') return 'Agency';
  return 'Free';
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, account, signOut } = useAuth();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const rows = [
    { label: 'Email',         value: user?.email || '—' },
    { label: 'Plan',          value: planLabel(account?.plan), extra: account?.plan === 'free' },
    { label: 'Brand',         value: account?.primary_brand || 'No brand linked' },
    { label: 'Member since',  value: formatMemberSince(account?.created_at) },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>
      <p className={styles.sub}>Manage your account</p>

      {/* Account card */}
      <div className={styles.card}>
        <h2 className={styles.cardHeading}>Account</h2>
        <div className={styles.rows}>
          {rows.map(r => (
            <div key={r.label} className={styles.row}>
              <span className={styles.rowLabel}>{r.label}</span>
              <div className={styles.rowRight}>
                <span className={styles.rowValue}>{r.value}</span>
                {r.extra && (
                  <button className={styles.upgradeLink} onClick={() => router.push('/pricing')}>
                    Upgrade to Starter →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sign out card */}
      <div className={styles.card}>
        <h2 className={styles.cardHeading}>Sign out</h2>
        <p className={styles.cardSub}>
          You will be signed out of your BrandShift account on this device.
        </p>
        {!confirmSignOut ? (
          <button className={styles.signOutBtn} onClick={() => setConfirmSignOut(true)}>
            Sign out
          </button>
        ) : (
          <div className={styles.confirmRow}>
            <span className={styles.confirmText}>Are you sure?</span>
            <button className={styles.confirmBtn} onClick={signOut}>Yes, sign out</button>
            <button className={styles.cancelBtn} onClick={() => setConfirmSignOut(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
