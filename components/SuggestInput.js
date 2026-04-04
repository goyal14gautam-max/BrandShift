'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './SuggestInput.module.css';

export default function SuggestInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
  className = '',
  hasError = false,
}) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (value.length < 2) {
      setFiltered([]);
      setOpen(false);
      return;
    }
    const lower = value.toLowerCase();
    const matches = suggestions
      .filter(s => s.toLowerCase().includes(lower))
      .slice(0, 5);
    setFiltered(matches);
    setOpen(matches.length > 0);
  }, [value, suggestions]);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Escape') setOpen(false);
  }

  function select(item) {
    onChange(item);
    setOpen(false);
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        type="text"
        className={`${className} ${hasError ? styles.inputError : ''}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <div className={styles.dropdown}>
          {filtered.map(item => (
            <div
              key={item}
              className={styles.item}
              onMouseDown={() => select(item)}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
