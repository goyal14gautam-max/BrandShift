'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Share2, Eye, Copy, ExternalLink } from 'lucide-react';

export default function ReportsPage() {
  const { account } = useAuth();
  const [reports, setReports]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      const response = await fetch('/api/share/list');
      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('Load reports:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function scoreColor(s) {
    if (s >= 65) return 'var(--bs-teal)';
    if (s >= 45) return 'var(--bs-amber)';
    return '#d4183d';
  }

  return (
    <div style={{ padding: '32px 40px' }}>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--font-headline)',
          fontSize: 28,
          color: 'var(--bs-text-primary)',
          margin: '0 0 8px',
        }}>
          Shared Reports
        </h1>
        <p style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          color: 'var(--bs-text-secondary)',
          margin: 0,
        }}>
          Reports you&apos;ve shared with clients and prospects
        </p>
      </div>

      {isLoading ? (
        <div style={{
          color: 'var(--bs-text-tertiary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
        }}>
          Loading...
        </div>
      ) : reports.length === 0 ? (
        <div style={{
          background: 'var(--bs-card-dark)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius)',
          padding: '48px',
          textAlign: 'center',
        }}>
          <Share2 size={32} color="var(--bs-text-tertiary)" style={{ marginBottom: 16 }} />
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            color: 'var(--bs-text-secondary)',
            marginBottom: 8,
          }}>
            No reports shared yet
          </div>
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            color: 'var(--bs-text-tertiary)',
          }}>
            Share a report from the results page to track who views it
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--bs-card-dark)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 80px 140px 100px',
            gap: 16,
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: 1,
            color: 'var(--bs-text-tertiary)',
            textTransform: 'uppercase',
          }}>
            <span>Brand</span>
            <span>Score</span>
            <span>Views</span>
            <span>Last viewed</span>
            <span>Actions</span>
          </div>

          {reports.map((report, i) => (
            <div
              key={report.share_token}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 80px 140px 100px',
                gap: 16,
                padding: '16px 20px',
                borderBottom: i < reports.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 14,
                  color: 'var(--bs-text-primary)',
                  fontWeight: 500,
                  marginBottom: 2,
                }}>
                  {report.brand_name}
                </div>
                <div style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  color: 'var(--bs-text-tertiary)',
                }}>
                  {new Date(report.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                color: report.score_data?.overall_score != null
                  ? scoreColor(report.score_data.overall_score)
                  : 'var(--bs-text-tertiary)',
              }}>
                {report.score_data?.overall_score ?? '—'}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                color: report.view_count > 0 ? 'var(--bs-teal)' : 'var(--bs-text-tertiary)',
              }}>
                <Eye size={12} />
                {report.view_count || 0}
              </div>

              <div style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                color: 'var(--bs-text-tertiary)',
              }}>
                {report.viewed_at
                  ? new Date(report.viewed_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Not viewed yet'}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/report/${report.share_token}`;
                    navigator.clipboard.writeText(url);
                  }}
                  title="Copy link"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    padding: '6px 8px',
                    cursor: 'pointer',
                    color: 'var(--bs-text-secondary)',
                  }}
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={() => window.open(`/report/${report.share_token}`, '_blank')}
                  title="Open report"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    padding: '6px 8px',
                    cursor: 'pointer',
                    color: 'var(--bs-text-secondary)',
                  }}
                >
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
