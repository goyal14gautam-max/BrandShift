'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import {
  Rocket, Check, AlertTriangle, ChevronRight,
  CheckCircle, XCircle, AlertCircle, ArrowLeft,
} from 'lucide-react';

const CHANNELS = ['Instagram', 'YouTube', 'Twitter/X', 'LinkedIn', 'WhatsApp', 'Email', 'Print', 'OOH', 'Influencer', 'TV/Radio'];

const OBJECTIVES = [
  { value: 'awareness', label: 'Build Awareness', emoji: '\u{1F4E2}' },
  { value: 'sales',     label: 'Drive Sales',     emoji: '\u{1F4B0}' },
  { value: 'loyalty',   label: 'Build Loyalty',    emoji: '\u2764\uFE0F' },
  { value: 'cultural',  label: 'Cultural Moment',  emoji: '\u{1F389}' },
];

const CHECK_LABELS = {
  personality: 'Brand Personality', offBrand: 'Off-Brand Language', hardNos: 'Brand Limits',
  audience: 'Audience Alignment', objective: 'Strategic Objective', momentum: 'Score Momentum',
  calendar: 'Calendar Timing', execution: 'Execution Risk', contentPatterns: 'Content Patterns', market: 'Market Intelligence',
};

const statusIcon = (status) => {
  if (status === 'pass') return <CheckCircle size={16} style={{ color: 'var(--bs-teal)' }} />;
  if (status === 'fail') return <XCircle size={16} style={{ color: '#E8622A' }} />;
  return <AlertCircle size={16} style={{ color: 'var(--bs-amber)' }} />;
};

export default function PreflightPage() {
  const { account } = useAuth();
  const { profile } = useDashboard();

  const [view, setView] = useState('form');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    name: '',
    objective: '',
    description: '',
    targetAudience: profile?.target_audience || '',
    startDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    channels: [],
  });

  const [charCount, setCharCount] = useState(0);

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'description') setCharCount(value.length);
  }

  function toggleChannel(channel) {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.includes(channel) ? prev.channels.filter(c => c !== channel) : [...prev.channels, channel],
    }));
  }

  async function handleSubmit() {
    setError('');
    if (!form.name.trim()) { setError('Campaign name required'); return; }
    if (!form.objective) { setError('Select a campaign objective'); return; }
    if (form.description.length < 30) { setError('Description too short \u2014 describe your campaign in more detail'); return; }
    if (!form.targetAudience.trim()) { setError('Target audience required'); return; }

    setIsLoading(true);
    try {
      const response = await fetch('/api/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: account?.primary_brand || profile?.brand_name,
          campaign: form,
        }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Something went wrong'); return; }
      setResult(data.result);
      setView('report');
      window.scrollTo(0, 0);
    } catch {
      setError('Failed to run check. Try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Data readiness ────────────────────────────────────────
  const dataReadiness = [
    { label: 'Brand Constitution', active: (profile?.brand_personality_words?.length || 0) >= 3, icon: '\u{1F4CB}' },
    { label: 'Brand Score', active: (profile?.score_history?.length || 0) >= 1, icon: '\u{1F4CA}' },
    { label: 'Task History', active: (profile?.tasks || []).filter(t => t.exit_interview).length >= 3, icon: '\u2705' },
    { label: 'Monday Briefs', active: (profile?.monday_briefs?.length || 0) >= 3, icon: '\u{1F4F0}' },
    { label: 'Trend Analysis', active: (profile?.latest_trends?.length || 0) > 0, icon: '\u{1F4C8}' },
  ];
  const activeCount = dataReadiness.filter(d => d.active).length;

  // ── Shared styles ─────────────────────────────────────────
  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius)', padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 14,
    color: 'var(--bs-text-primary)', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500,
    color: 'var(--bs-text-primary)', marginBottom: 8,
  };

  // ── REPORT VIEW ───────────────────────────────────────────
  if (view === 'report' && result) {
    const recColor = result.recommendation === 'GO' ? 'var(--bs-teal)' : result.recommendation === 'CAUTION' ? 'var(--bs-amber)' : '#E8622A';

    return (
      <div style={{ padding: '32px 40px', maxWidth: 720 }}>
        <button onClick={() => setView('form')} style={{ background: 'none', border: 'none', color: 'var(--bs-text-secondary)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, padding: 0 }}>
          <ArrowLeft size={14} /> Back to form
        </button>

        {/* Score hero */}
        <div style={{ background: 'var(--bs-card-dark)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius)', padding: '32px 36px', marginBottom: 24, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--bs-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Pre-Flight Score
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 64, fontWeight: 700, color: recColor, margin: '0 0 8px', lineHeight: 1 }}>
            {result.overallScore}
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: `${recColor}18`, border: `1px solid ${recColor}33` }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: recColor }}>{result.recommendation}</span>
          </div>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--bs-text-secondary)', marginTop: 12, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            {result.recommendationMessage}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bs-text-tertiary)', marginTop: 8 }}>
            Data confidence: {result.dataConfidence} ({result.dataPoints}/5 sources)
          </p>
        </div>

        {/* Campaign summary */}
        <div style={{ background: 'var(--bs-card-dark)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 24 }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--bs-text-primary)', marginBottom: 4 }}>{form.name}</p>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--bs-text-tertiary)' }}>
            {OBJECTIVES.find(o => o.value === form.objective)?.label || form.objective} &middot; Launch: {form.startDate} &middot; {form.channels.length ? form.channels.join(', ') : 'No channels'}
          </p>
        </div>

        {/* Findings */}
        {result.findings.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--bs-text-primary)', marginBottom: 12 }}>
              Findings to address
            </p>
            {result.findings.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: f.severity === 'high' ? 'rgba(232,98,42,0.06)' : 'rgba(232,160,48,0.06)', border: `1px solid ${f.severity === 'high' ? 'rgba(232,98,42,0.15)' : 'rgba(232,160,48,0.15)'}`, borderRadius: 'var(--radius)', marginBottom: 8 }}>
                <AlertTriangle size={16} style={{ color: f.severity === 'high' ? '#E8622A' : 'var(--bs-amber)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: f.severity === 'high' ? '#E8622A' : 'var(--bs-amber)', marginBottom: 2 }}>{f.label}</p>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--bs-text-secondary)', lineHeight: 1.5 }}>{f.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Positives */}
        {result.positives.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--bs-text-primary)', marginBottom: 12 }}>
              What's working
            </p>
            {result.positives.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'rgba(46,196,160,0.06)', border: '1px solid rgba(46,196,160,0.15)', borderRadius: 'var(--radius)', marginBottom: 8 }}>
                <CheckCircle size={16} style={{ color: 'var(--bs-teal)', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--bs-text-secondary)', lineHeight: 1.5 }}>{p.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* All 10 checks breakdown */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--bs-text-primary)', marginBottom: 12 }}>
            All checks
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(result.checks).map(([key, check]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bs-card-dark)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius)' }}>
                {statusIcon(check.status)}
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--bs-text-primary)', flex: 1 }}>
                  {CHECK_LABELS[key] || key}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: check.status === 'pass' ? 'var(--bs-teal)' : check.status === 'fail' ? '#E8622A' : 'var(--bs-amber)', minWidth: 30, textAlign: 'right' }}>
                  {check.score}
                </span>
                {check.hasData === false && (
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--bs-text-tertiary)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4 }}>
                    limited data
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trend insights */}
        {result.trends?.insights?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--bs-text-primary)', marginBottom: 12 }}>
              Trend territory
            </p>
            {result.trends.insights.map((t, i) => (
              <div key={i} style={{ padding: '10px 14px', background: 'var(--bs-card-dark)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius)', marginBottom: 6 }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: t.type === 'positive' ? 'var(--bs-teal)' : t.type === 'fail' ? '#E8622A' : 'var(--bs-text-secondary)', lineHeight: 1.5 }}>
                  {t.message}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button onClick={() => { setView('form'); setResult(null); }} style={{ padding: '12px 24px', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--bs-text-secondary)', fontFamily: 'var(--font-ui)', fontSize: 14, cursor: 'pointer' }}>
            Run another check
          </button>
        </div>
      </div>
    );
  }

  // ── FORM VIEW ─────────────────────────────────────────────
  return (
    <div style={{ padding: '32px 40px', maxWidth: 680 }}>
      {/* Page header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Rocket size={22} color="var(--bs-orange)" />
          <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: 28, color: 'var(--bs-text-primary)', margin: 0 }}>
            Campaign Pre-Flight
          </h1>
        </div>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--bs-text-secondary)', margin: 0 }}>
          Check your campaign against your brand before spending a single rupee
        </p>
      </div>

      {/* Data readiness */}
      <div style={{ background: 'var(--bs-card-dark)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--bs-text-secondary)' }}>
            Analysis accuracy: {activeCount}/5 data sources active
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: activeCount >= 4 ? 'var(--bs-teal)' : activeCount >= 2 ? 'var(--bs-amber)' : 'var(--bs-text-tertiary)' }}>
            {activeCount >= 4 ? 'High' : activeCount >= 2 ? 'Medium' : 'Low'} confidence
          </span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${activeCount / 5 * 100}%`, background: activeCount >= 4 ? 'var(--bs-teal)' : activeCount >= 2 ? 'var(--bs-amber)' : 'var(--bs-text-tertiary)', borderRadius: 2, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {dataReadiness.map(source => (
            <div key={source.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 100, fontSize: 11, fontFamily: 'var(--font-ui)', background: source.active ? 'rgba(46,196,160,0.1)' : 'rgba(255,255,255,0.04)', color: source.active ? 'var(--bs-teal)' : 'var(--bs-text-tertiary)', border: `1px solid ${source.active ? 'rgba(46,196,160,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
              {source.icon} {source.label}
              {source.active ? <Check size={10} /> : <span style={{ opacity: 0.4 }}>{'\u25CB'}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Form fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Campaign name */}
        <div>
          <label style={labelStyle}>Campaign name</label>
          <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g. Summer Glow Campaign" style={inputStyle} />
        </div>

        {/* Objective */}
        <div>
          <label style={labelStyle}>What is this campaign trying to do?</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {OBJECTIVES.map(opt => (
              <button key={opt.value} onClick={() => updateForm('objective', opt.value)} style={{
                padding: '10px 18px', borderRadius: 'var(--radius)',
                border: form.objective === opt.value ? '1px solid var(--bs-violet)' : '1px solid rgba(255,255,255,0.1)',
                background: form.objective === opt.value ? 'rgba(124,92,191,0.12)' : 'transparent',
                color: form.objective === opt.value ? 'var(--bs-text-primary)' : 'var(--bs-text-secondary)',
                fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>{opt.emoji}</span> {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ ...labelStyle, marginBottom: 4 }}>Describe your campaign</label>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--bs-text-tertiary)', margin: '0 0 8px' }}>
            Include the idea, the tone, and what the audience will see or hear
          </p>
          <div style={{ position: 'relative' }}>
            <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} maxLength={500} rows={6}
              placeholder={'What is the campaign idea?\n\nWhat tone does it use \u2014 bold, emotional, humorous?\n\nWhat will the audience see or hear?'}
              style={{ ...inputStyle, padding: '12px 14px', resize: 'vertical', lineHeight: 1.6 }}
            />
            <span style={{ position: 'absolute', bottom: 10, right: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: charCount < 30 ? 'var(--bs-orange)' : 'var(--bs-text-tertiary)' }}>
              {charCount}/500
            </span>
          </div>
          {charCount > 0 && charCount < 30 && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--bs-orange)', margin: '4px 0 0' }}>
              Add at least {30 - charCount} more characters
            </p>
          )}
        </div>

        {/* Target audience */}
        <div>
          <label style={labelStyle}>Who is this campaign targeting?</label>
          <input type="text" value={form.targetAudience} onChange={e => updateForm('targetAudience', e.target.value)} placeholder="e.g. Urban women 22-35 interested in skincare" style={inputStyle} />
        </div>

        {/* Launch date */}
        <div>
          <label style={labelStyle}>When does this campaign launch?</label>
          <input type="date" value={form.startDate} min={new Date().toISOString().split('T')[0]} onChange={e => updateForm('startDate', e.target.value)}
            style={{ ...inputStyle, width: 'auto' }}
          />
        </div>

        {/* Channels */}
        <div>
          <label style={labelStyle}>Channels (optional)</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CHANNELS.map(ch => (
              <button key={ch} onClick={() => toggleChannel(ch)} style={{
                padding: '6px 14px', borderRadius: 100, fontSize: 12, fontFamily: 'var(--font-ui)', cursor: 'pointer', transition: 'all 0.15s',
                border: form.channels.includes(ch) ? '1px solid var(--bs-violet)' : '1px solid rgba(255,255,255,0.08)',
                background: form.channels.includes(ch) ? 'rgba(124,92,191,0.12)' : 'transparent',
                color: form.channels.includes(ch) ? 'var(--bs-text-primary)' : 'var(--bs-text-tertiary)',
              }}>
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(232,98,42,0.08)', border: '1px solid rgba(232,98,42,0.2)', borderRadius: 'var(--radius)', padding: '10px 16px' }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#E8622A', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={isLoading} style={{
          padding: '14px 32px', borderRadius: 'var(--radius)', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
          background: isLoading ? 'rgba(232,98,42,0.4)' : 'var(--bs-orange)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 15,
          fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', transition: 'all 0.2s',
          opacity: isLoading ? 0.7 : 1,
        }}>
          {isLoading ? (
            <>
              <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Running 10 checks...
            </>
          ) : (
            <>
              <Rocket size={16} />
              Run Pre-Flight Check
            </>
          )}
        </button>

        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--bs-text-tertiary)', textAlign: 'center', marginTop: -12 }}>
          Zero AI calls &middot; Uses semantic matching &middot; Runs in ~5 seconds
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
