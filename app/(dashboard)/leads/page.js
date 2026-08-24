'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      const res = await fetch('/api/leads');
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err) {
      console.error('Load leads:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleContacted(id, current) {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, contacted: !current } : l)));
    await fetch('/api/leads/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, contacted: !current }),
    });
  }

  function updateNotesLocal(id, notes) {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, notes } : l)));
  }

  async function saveNotes(id, notes) {
    await fetch('/api/leads/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, notes }),
    });
  }

  function scoreColor(s) {
    if ((s || 0) >= 65) return 'var(--bs-teal)';
    if ((s || 0) >= 45) return 'var(--bs-amber)';
    return '#d4183d';
  }

  const columns = '1.4fr 1fr 70px 90px 90px 1.4fr';

  return (
    <div style={{ padding: '32px 40px' }}>
      <h1 style={{
        fontFamily: 'var(--font-headline)',
        fontSize: 28,
        color: 'var(--bs-text-primary)',
        marginBottom: 8,
      }}>
        Leads
      </h1>
      <p style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        color: 'var(--bs-text-secondary)',
        marginBottom: 32,
      }}>
        Brands that ran a quick audit on your website
      </p>

      {forbidden ? (
        <div style={{
          background: 'var(--bs-card-dark)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius)',
          padding: 48,
          textAlign: 'center',
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          color: 'var(--bs-text-tertiary)',
        }}>
          This page is only available to the account owner.
        </div>
      ) : isLoading ? (
        <div style={{ color: 'var(--bs-text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
          Loading...
        </div>
      ) : leads.length === 0 ? (
        <div style={{
          background: 'var(--bs-card-dark)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius)',
          padding: 48,
          textAlign: 'center',
        }}>
          <Users size={32} color="var(--bs-text-tertiary)" style={{ marginBottom: 16 }} />
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--bs-text-tertiary)' }}>
            No leads yet. Share your Moative website to start capturing brands.
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--bs-card-dark)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: columns,
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
            <span>Website</span>
            <span>Score</span>
            <span>Date</span>
            <span>Contacted</span>
            <span>Notes</span>
          </div>

          {leads.map((lead, i) => (
            <div
              key={lead.id}
              style={{
                display: 'grid',
                gridTemplateColumns: columns,
                gap: 16,
                padding: '14px 20px',
                borderBottom: i < leads.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                alignItems: 'center',
                opacity: lead.contacted ? 0.6 : 1,
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: 'var(--bs-text-primary)' }}>
                  {lead.brand_name}
                </div>
                {lead.instagram_handle && (
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--bs-text-tertiary)' }}>
                    @{lead.instagram_handle}
                  </div>
                )}
              </div>

              <div style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                color: 'var(--bs-text-tertiary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {lead.website_url?.replace('https://', '')?.replace('www.', '')}
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: scoreColor(lead.score) }}>
                {lead.score ?? '—'}
              </div>

              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--bs-text-tertiary)' }}>
                {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </div>

              <div>
                <input
                  type="checkbox"
                  checked={!!lead.contacted}
                  onChange={() => toggleContacted(lead.id, lead.contacted)}
                  style={{ cursor: 'pointer', accentColor: 'var(--bs-teal)' }}
                />
              </div>

              <div>
                <input
                  type="text"
                  value={lead.notes || ''}
                  placeholder="Add a note..."
                  onChange={e => updateNotesLocal(lead.id, e.target.value)}
                  onBlur={e => saveNotes(lead.id, e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    padding: '6px 8px',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 12,
                    color: 'var(--bs-text-primary)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
