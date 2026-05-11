'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import Logo from '@/components/Logo';
import Link from 'next/link';

const PLANS = [
  {
    name: 'Free',
    price: 0,
    period: null,
    description: 'Try BrandShift once',
    color: 'rgba(255,255,255,0.1)',
    cta: 'Start free audit',
    ctaAction: 'audit',
    features: [
      'One brand audit',
      'Full score + 5 dimensions',
      'Evidence from 5 sources',
      'Competitor radar chart',
      'Shareable report link',
    ],
    notIncluded: [
      'Roadmap generation',
      'Dashboard access',
      'Monday Brief',
      'Brand Constitution',
      'Campaign Pre-Flight',
    ],
  },
  {
    name: 'Starter',
    price: 2999,
    period: 'month',
    description: 'For growing D2C brands',
    color: 'var(--bs-violet)',
    cta: 'Start Starter plan',
    ctaAction: 'starter',
    highlight: true,
    features: [
      'Everything in Free',
      '8-week action roadmap',
      'Full dashboard access',
      'Monday Brief every week',
      'Brand Constitution wizard',
      'Campaign Pre-Flight Check',
      'Content Idea generator',
      'Voice Check (10/day)',
      'Trend Fit alerts',
      'Weekly score tracking',
      'Shareable reports',
    ],
    notIncluded: [],
  },
  {
    name: 'Agency',
    price: 9999,
    period: 'month',
    description: 'For agencies managing brands',
    color: 'var(--bs-teal)',
    cta: 'Start Agency plan',
    ctaAction: 'agency',
    features: [
      'Everything in Starter',
      'Up to 5 brands',
      'White-label PDF reports',
      'Unlimited voice checks',
      'Priority support',
      'Outreach email generator',
    ],
    notIncluded: [],
  },
];

export default function PricingPage() {
  const { account, isPaid } = useAuth();
  const router = useRouter();

  function handleCTA(plan) {
    if (plan.ctaAction === 'audit') {
      router.push('/audit');
      return;
    }
    if (!account) {
      router.push('/signup?plan=' + plan.ctaAction);
      return;
    }
    if (isPaid) {
      router.push('/dashboard');
      return;
    }
    alert('Payment coming soon. Contact us at hello@brandshift.in to upgrade manually.');
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bs-base)',
      padding: '0 0 80px',
    }}>

      {/* Nav */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 48px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link href="/"><Logo size="md" /></Link>
        {account ? (
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 'var(--radius)',
              padding: '8px 20px',
              color: 'var(--bs-text-primary)',
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Go to dashboard
          </button>
        ) : (
          <button
            onClick={() => router.push('/login')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 'var(--radius)',
              padding: '8px 20px',
              color: 'var(--bs-text-primary)',
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        )}
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '64px 48px 48px' }}>
        <h1 style={{
          fontFamily: 'var(--font-headline)',
          fontSize: 'clamp(32px, 5vw, 52px)',
          color: 'var(--bs-text-primary)',
          margin: '0 0 16px',
          lineHeight: 1.15,
        }}>
          Simple, honest pricing
        </h1>
        <p style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 18,
          color: 'var(--bs-text-secondary)',
          margin: 0,
          maxWidth: 480,
          marginLeft: 'auto',
          marginRight: 'auto',
          lineHeight: 1.6,
        }}>
          Start free. Upgrade when you&apos;re ready to act on what you learn.
        </p>
      </div>

      {/* Plans grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
        maxWidth: 960,
        margin: '0 auto',
        padding: '0 48px',
      }}>
        {PLANS.map(plan => (
          <div
            key={plan.name}
            style={{
              background: plan.highlight ? 'rgba(124,92,191,0.06)' : 'var(--bs-card-dark)',
              border: `1px solid ${plan.highlight ? 'rgba(124,92,191,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 'var(--radius)',
              padding: '32px',
              position: 'relative',
            }}
          >
            {plan.highlight && (
              <div style={{
                position: 'absolute',
                top: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--bs-violet)',
                color: 'white',
                borderRadius: 100,
                padding: '4px 16px',
                fontFamily: 'var(--font-ui)',
                fontSize: 11,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}>
                Most popular
              </div>
            )}

            <div style={{
              fontFamily: 'var(--font-headline)',
              fontSize: 22,
              color: 'var(--bs-text-primary)',
              marginBottom: 4,
            }}>
              {plan.name}
            </div>

            <div style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--bs-text-tertiary)',
              marginBottom: 24,
            }}>
              {plan.description}
            </div>

            <div style={{ marginBottom: 28 }}>
              {plan.price === 0 ? (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 36,
                  color: 'var(--bs-text-primary)',
                }}>
                  Free
                </span>
              ) : (
                <div>
                  <span style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 14,
                    color: 'var(--bs-text-tertiary)',
                    verticalAlign: 'super',
                  }}>
                    ₹
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 36,
                    color: 'var(--bs-text-primary)',
                  }}>
                    {plan.price.toLocaleString('en-IN')}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 13,
                    color: 'var(--bs-text-tertiary)',
                    marginLeft: 4,
                  }}>
                    /month
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleCTA(plan)}
              style={{
                width: '100%',
                background: plan.highlight ? 'var(--bs-orange)' : 'transparent',
                color: plan.highlight ? 'white' : 'var(--bs-text-primary)',
                border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.15)',
                borderRadius: 'var(--radius)',
                padding: '12px',
                fontFamily: 'var(--font-ui)',
                fontSize: 14,
                fontWeight: plan.highlight ? 500 : 400,
                cursor: 'pointer',
                marginBottom: 28,
                transition: 'opacity 0.2s',
              }}
            >
              {account && isPaid && plan.ctaAction !== 'audit'
                ? 'Current plan ✓'
                : plan.cta}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plan.features.map((feature, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Check size={14} color="var(--bs-teal)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 13,
                    color: 'var(--bs-text-secondary)',
                    lineHeight: 1.5,
                  }}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAQ strip */}
      <div style={{
        maxWidth: 640,
        margin: '64px auto 0',
        padding: '0 48px',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--bs-text-tertiary)',
          lineHeight: 1.7,
        }}>
          All plans include Indian market scoring and cultural calendar intelligence.
          No credit card required for free audit. Cancel anytime.
          Questions? hello@brandshift.in
        </p>
      </div>
    </div>
  );
}
