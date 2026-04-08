'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import {
  LayoutDashboard, Map, FileText,
  BookOpen, Settings, LogOut,
} from 'lucide-react';
import Logo from '@/components/Logo';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard'    },
  { icon: Map,             label: 'Roadmap',      href: '/roadmap'      },
  { icon: FileText,        label: 'Reports',      href: '/reports'      },
  { icon: BookOpen,        label: 'Constitution', href: '/constitution'  },
  { icon: Settings,        label: 'Settings',     href: '/settings'     },
];

function scoreColor(s) {
  if (!s) return 'var(--bs-text-tertiary)';
  if (s >= 65) return 'var(--bs-teal)';
  if (s >= 45) return 'var(--bs-amber)';
  return 'var(--destructive)';
}

function formatScoreDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (date.toDateString() === today.toDateString()) return 'today';
  if (date.toDateString() === yesterday.toDateString()) return 'yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile, latestScore, scoreDelta } = useDashboard();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <Logo size="sm" />
        </Link>
        {profile?.brand_name && (
          <p className={styles.logoBrand}>{profile.brand_name}</p>
        )}
        {profile?.industry && (
          <span className={styles.industryBadge}>{profile.industry}</span>
        )}
        {user?.email && (
          <p className={styles.userEmail}>{user.email}</p>
        )}
      </div>

      <div className={styles.sidebarDivider} />

      <nav className={styles.sidebarNav}>
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <button
              key={href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => router.push(href)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.sidebarScoreWidget}>
        <p className={styles.scoreWidgetLabel}>BRAND SCORE</p>
        <div className={styles.scoreWidgetRow}>
          <span className={styles.scoreWidgetNum} style={{ color: scoreColor(latestScore) }}>
            {latestScore ?? '—'}
          </span>
          {scoreDelta !== null && scoreDelta !== 0 && (
            <span className={styles.scoreWidgetDelta}
              style={{ color: scoreDelta >= 0 ? 'var(--bs-teal)' : 'var(--destructive)' }}>
              {scoreDelta >= 0 ? '↑' : '↓'} {Math.abs(scoreDelta)}
            </span>
          )}
        </div>
        <p className={styles.scoreWidgetSub}>
          {profile?.latest_score_date
            ? `Updated ${formatScoreDate(profile.latest_score_date)}`
            : 'Last updated'}
        </p>
      </div>

      <div className={styles.sidebarDivider} />

      <button className={styles.signOutBtn} onClick={signOut}>
        <LogOut size={14} />
        Sign out
      </button>
    </aside>
  );
}
