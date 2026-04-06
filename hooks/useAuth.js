'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadAccount();
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadAccount();

          if (event === 'SIGNED_IN') {
            const pendingBrand = localStorage.getItem('brandshift_active_brand');
            if (pendingBrand) {
              try {
                await fetch('/api/auth/associate-brand', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ brandName: pendingBrand }),
                });
              } catch {}
            }
          }
        } else {
          setAccount(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadAccount() {
    try {
      const res = await fetch('/api/auth/account');
      if (res.ok) {
        const data = await res.json();
        setAccount(data.account);
      }
    } catch (err) {
      console.error('loadAccount:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    localStorage.removeItem('brandshift_active_brand');
    window.location.href = '/';
  }

  const isPaid = account?.plan === 'starter' || account?.plan === 'agency';
  const isAgency = account?.plan === 'agency';

  return (
    <AuthContext.Provider value={{ user, account, isLoading, isPaid, isAgency, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
