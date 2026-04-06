'use client';

import { useState, useEffect } from 'react';
import styles from './outreach.module.css';

function parseCompetitor(val) {
  if (!val) return { name: '', url: '' };
  const isUrl = val.startsWith('http://') || val.startsWith('https://') || val.includes('.');
  if (isUrl) {
    const url = val.startsWith('http') ? val : 'https://' + val;
    return { name: val, url };
  }
  return { name: val, url: '' };
}

function scoreColor(s) {
  if (!s) return 'var(--bs-text-tertiary)';
  if (s >= 65) return 'var(--bs-teal)';
  if (s >= 45) return 'var(--bs-amber)';
  return 'var(--destructive)';
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 86400000)  return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Outreach() {
  const [form, setForm] = useState({
    brandName: '', websiteUrl: '', instagramHandle: '',
    competitor1: '', contactName: '', contactEmail: '',
  });
  const [status, setStatus]       = useState('idle'); // idle | running | done | error
  const [statusMsg, setStatusMsg] = useState('');
  const [result, setResult]       = useState(null); // { scoreData, shareUrl, email }
  const [reports, setReports]     = useState([]);
  const [copied, setCopied]       = useState('');

  useEffect(() => { loadReports(); }, []);

  async function loadReports() {
    try {
      const res  = await fetch('/api/share/list');
      const data = await res.json();
      if (data.success) setReports(data.reports);
    } catch {}
  }

  function setField(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function runAudit(e) {
    e.preventDefault();
    if (!form.brandName || !form.websiteUrl) return;

    setStatus('running');
    setResult(null);

    try {
      const c1 = parseCompetitor(form.competitor1);

      setStatusMsg(`Scraping ${form.brandName}...`);
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:       form.brandName,
          websiteUrl:      form.websiteUrl,
          instagramHandle: form.instagramHandle,
          comp1Name:       c1.name,
          comp1Url:        c1.url,
        }),
      });
      const scrapeData = await scrapeRes.json();

      setStatusMsg('Scoring brand...');
      const scoreRes = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:  form.brandName,
          comp1Name:  c1.name,
          ...scrapeData,
        }),
      });
      const scoreData = await scoreRes.json();
      if (scoreData.error) throw new Error(scoreData.error);

      setStatusMsg('Creating shareable report...');
      const shareRes = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:  form.brandName,
          scoreData,
          intakeData: { ...form },
          createdBy:  'outreach',
        }),
      });
      const shareData = await shareRes.json();
      if (!shareData.success) throw new Error('Failed to create share link');

      setStatusMsg('Generating email...');
      const emailRes = await fetch('/api/outreach/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName:   form.brandName,
          scoreData,
          shareUrl:    shareData.shareUrl,
          contactName: form.contactName,
          senderName:  'BrandShift',
        }),
      });
      const emailData = await emailRes.json();

      setResult({
        scoreData,
        shareUrl:    shareData.shareUrl,
        shareToken:  shareData.shareToken,
        emailSubject: emailData.subject || '',
        emailBody:    emailData.body || '',
      });
      setStatus('done');
      loadReports();
    } catch (err) {
      setStatusMsg(err.message || 'Something went wrong');
      setStatus('error');
    }
  }

  async function copyToClipboard(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch {}
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <h1 className={styles.heading}>Outreach Tool</h1>
          <p className={styles.sub}>Run an audit on a potential client's brand and generate a personalised email</p>
        </div>

        {/* ── Form ── */}
        <form className={styles.form} onSubmit={runAudit}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Brand Name *</label>
              <input className={styles.input} type="text" value={form.brandName}
                onChange={e => setField('brandName', e.target.value)} placeholder="e.g. Mamaearth" required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Website URL *</label>
              <input className={styles.input} type="text" value={form.websiteUrl}
                onChange={e => setField('websiteUrl', e.target.value)} placeholder="https://brand.com" required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Instagram Handle</label>
              <input className={styles.input} type="text" value={form.instagramHandle}
                onChange={e => setField('instagramHandle', e.target.value)} placeholder="@brandhandle" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Competitor URL</label>
              <input className={styles.input} type="text" value={form.competitor1}
                onChange={e => setField('competitor1', e.target.value)} placeholder="https://competitor.com" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Contact Name</label>
              <input className={styles.input} type="text" value={form.contactName}
                onChange={e => setField('contactName', e.target.value)} placeholder="Who you're emailing" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Contact Email</label>
              <input className={styles.input} type="email" value={form.contactEmail}
                onChange={e => setField('contactEmail', e.target.value)} placeholder="their@email.com" />
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={status === 'running'}
          >
            {status === 'running'
              ? <><span className={styles.spinner} /> {statusMsg}</>
              : 'Run Audit & Generate Email →'}
          </button>

          {status === 'error' && (
            <p className={styles.errorMsg}>{statusMsg}</p>
          )}
        </form>

        {/* ── Results ── */}
        {status === 'done' && result && (
          <div className={styles.results}>
            <div className={styles.resultsGrid}>

              {/* Left: score preview */}
              <div className={styles.scoreCard}>
                <p className={styles.cardLabel}>Score Preview</p>
                <div className={styles.scoreBig} style={{ color: scoreColor(result.scoreData.overall_score) }}>
                  {result.scoreData.overall_score}
                  <span className={styles.scoreOf}>/100</span>
                </div>
                {result.scoreData.biggest_gap && (
                  <div className={styles.scoreDetail}>
                    <span className={styles.scoreDetailLabel}>Biggest gap</span>
                    <span className={styles.scoreDetailVal}>{result.scoreData.biggest_gap}</span>
                  </div>
                )}
                {result.scoreData.evidence_quotes?.[0]?.quote && (
                  <p className={styles.scoreQuote}>"{result.scoreData.evidence_quotes[0].quote}"</p>
                )}
                <div className={styles.shareUrlRow}>
                  <input
                    className={styles.shareInput}
                    value={result.shareUrl}
                    readOnly
                    onClick={e => e.target.select()}
                  />
                  <button
                    className={styles.copyBtn}
                    onClick={() => copyToClipboard(result.shareUrl, 'url')}
                  >
                    {copied === 'url' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
                <div className={styles.actionBtns}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => window.open(result.shareUrl, '_blank')}
                  >
                    View Report ↗
                  </button>
                </div>
              </div>

              {/* Right: generated email */}
              <div className={styles.emailCard}>
                <p className={styles.cardLabel}>Generated Email</p>
                {result.emailSubject && (
                  <div className={styles.emailSubjectRow}>
                    <span className={styles.emailSubjectLabel}>Subject:</span>
                    <span className={styles.emailSubject}>{result.emailSubject}</span>
                  </div>
                )}
                <textarea
                  className={styles.emailBody}
                  value={result.emailBody}
                  onChange={e => setResult(prev => ({ ...prev, emailBody: e.target.value }))}
                  rows={14}
                />
                <div className={styles.emailActions}>
                  <button
                    className={styles.emailBtn}
                    onClick={() => copyToClipboard(result.emailBody, 'email')}
                  >
                    {copied === 'email' ? 'Copied ✓' : 'Copy Email'}
                  </button>
                  <button
                    className={styles.emailBtn}
                    onClick={() => {
                      const mailto = `mailto:${form.contactEmail}?subject=${encodeURIComponent(result.emailSubject)}&body=${encodeURIComponent(result.emailBody)}`;
                      window.open(mailto);
                    }}
                  >
                    Open in Gmail ↗
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── Reports sent table ── */}
        <div className={styles.reportsSection}>
          <div className={styles.reportsSectionHeader}>
            <h2 className={styles.reportsHeading}>Reports Sent</h2>
            <button className={styles.refreshBtn} onClick={loadReports}>Refresh</button>
          </div>

          {reports.length === 0 ? (
            <p className={styles.reportsEmpty}>No reports sent yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Score</th>
                    <th>Sent</th>
                    <th>Views</th>
                    <th>Last Viewed</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => {
                    const score = r.score_data?.overall_score;
                    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
                    const url = `${appUrl}/report/${r.share_token}`;
                    return (
                      <tr key={r.id}>
                        <td className={styles.tdBrand}>{r.brand_name}</td>
                        <td>
                          <span className={styles.tdScore} style={{ color: scoreColor(score) }}>
                            {score ?? '—'}
                          </span>
                        </td>
                        <td className={styles.tdMeta}>{fmtDate(r.created_at)}</td>
                        <td>
                          {r.view_count > 0
                            ? <span className={styles.viewsActive}>{r.view_count} view{r.view_count !== 1 ? 's' : ''}</span>
                            : <span className={styles.viewsNone}>Not opened</span>}
                        </td>
                        <td className={styles.tdMeta}>{r.viewed_at ? fmtDateShort(r.viewed_at) : '—'}</td>
                        <td>
                          <button
                            className={styles.copyLinkBtn}
                            onClick={() => copyToClipboard(url, r.id)}
                          >
                            {copied === r.id ? 'Copied ✓' : 'Copy'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
