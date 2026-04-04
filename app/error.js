'use client';

export default function Error({ error, reset }) {
  return (
    <div style={{ background: '#08080E', color: '#EEEAF8', fontFamily: 'sans-serif', padding: '40px', minHeight: '100vh' }}>
      <h2 style={{ color: '#E8622A', marginBottom: '16px' }}>Something went wrong</h2>
      <pre style={{ background: '#0F0F1C', padding: '20px', borderRadius: '8px', fontSize: '13px', overflowX: 'auto', color: '#EF4444', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {error?.message}
        {'\n\n'}
        {error?.stack}
      </pre>
      <button
        onClick={reset}
        style={{ marginTop: '20px', background: '#E8622A', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
      >
        Try again
      </button>
    </div>
  );
}
