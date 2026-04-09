'use client';

import { useState, useEffect } from 'react';

export function useDashboard() {
  const [profile, setProfile]                   = useState(null);
  const [isLoading, setIsLoading]               = useState(true);
  const [error, setError]                       = useState(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [refreshKey, setRefreshKey]             = useState(0);

  function refreshProfile() {
    setRefreshKey(prev => prev + 1);
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        // Priority 1: brand from authenticated account
        let brandName = null;
        try {
          const accountRes = await fetch('/api/auth/account');
          if (accountRes.ok) {
            const accountData = await accountRes.json();
            brandName = accountData.account?.primary_brand || null;
            console.log('Brand from account:', brandName);
          }
        } catch (err) {
          console.log('Could not fetch account:', err.message);
        }

        // Priority 2: fall back to localStorage
        if (!brandName) {
          brandName = localStorage.getItem('brandshift_active_brand') || null;
          console.log('Brand from localStorage:', brandName);
        }

        if (!brandName) {
          console.log('No brand found anywhere');
          setError('no_brand');
          setIsLoading(false);
          return;
        }

        // Keep localStorage in sync
        localStorage.setItem('brandshift_active_brand', brandName);

        const res  = await fetch(`/api/profile?brandName=${encodeURIComponent(brandName)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'failed');
          setIsLoading(false);
          return;
        }

        setProfile(data);
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError('failed');
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [refreshKey]);

  // ── Tool data derived from profile ───────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];

  const contentIdea = (() => {
    const idea = profile?.latest_content_idea;
    if (!idea) return null;
    return idea.generated_at?.startsWith(todayStr) ? idea : null;
  })();

  const trends = (() => {
    if (!profile?.latest_trends || !profile?.trends_generated_at) return null;
    const daysSince = (Date.now() - new Date(profile.trends_generated_at).getTime()) / 86400000;
    return daysSince < 7 ? profile.latest_trends : null;
  })();

  const voiceCheckUsage = {
    count: profile?.voice_check_date === todayStr ? (profile?.voice_check_count || 0) : 0,
    limit: 10,
  };

  // ── Derived values ───────────────────────────────────────────
  const todayTask   = profile?.tasks?.find(t => t.status === 'todo') || null;
  const currentWeek = profile?.current_week || 1;
  const streak      = profile?.pulse_streak  || 0;
  const latestBrief = profile?.monday_briefs?.[profile.monday_briefs.length - 1] || null;
  const isBriefNew  = latestBrief && !latestBrief.was_opened;
  // Fix 3 — deduplicate score_history by calendar day
  const scoreHistory = (() => {
    const history = profile?.score_history || [];
    if (!history.length) return [];
    const byDate = {};
    history.forEach(entry => {
      const date = entry.date
        ? entry.date.split('T')[0]
        : new Date().toISOString().split('T')[0];
      byDate[date] = entry;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, entry]) => ({ ...entry, date }));
  })();

  const latestScore = profile?.latest_overall_score || (() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('brandshift_score') : null;
      return raw ? JSON.parse(raw).overall_score : null;
    } catch { return null; }
  })();

  // Fix 1 — pull individual dimension scores from latest score_history entry
  const latestDimensions = (() => {
    if (!profile?.score_history?.length) return null;
    const latest = profile.score_history[profile.score_history.length - 1];
    return latest?.dimensions || null;
  })();
  const previousScore = scoreHistory.length > 1
    ? scoreHistory[scoreHistory.length - 2]?.overall_score
    : null;
  const scoreDelta = latestScore && previousScore
    ? Math.round((latestScore - previousScore) * 10) / 10
    : null;

  const constitutionProgress = (() => {
    if (!profile) return { answered: 0, total: 20 };

    console.log('Constitution fields check:', {
      brand_personality_words: profile?.brand_personality_words,
      brand_off_brand_words:   profile?.brand_off_brand_words,
      brand_best_customer:     profile?.brand_best_customer,
      brand_5_year_association: profile?.brand_5_year_association,
      brand_mission:           profile?.brand_mission,
      brand_origin_story:      profile?.brand_origin_story,
      brand_refuses_to:        profile?.brand_refuses_to,
      brand_person_description: profile?.brand_person_description,
    });

    const checks = [
      // Array fields
      { field: profile.brand_personality_words, isArray: true },
      { field: profile.brand_off_brand_words,   isArray: true },
      { field: profile.brand_refuses_to,        isArray: true },
      { field: profile.brand_owned_phrases,     isArray: true },
      { field: profile.brand_cringe_phrases,    isArray: true },
      // Text fields
      { field: profile.brand_best_customer,      isArray: false },
      { field: profile.brand_5_year_association, isArray: false },
      { field: profile.brand_origin_story,       isArray: false },
      { field: profile.brand_person_description, isArray: false },
      { field: profile.brand_mission,            isArray: false },
      { field: profile.brand_customer_belief,    isArray: false },
      { field: profile.brand_customer_feeling,   isArray: false },
      { field: profile.brand_not_for,            isArray: false },
      { field: profile.brand_10_year_dream,      isArray: false },
      { field: profile.brand_admired_brand,      isArray: false },
      { field: profile.brand_competitive_edge,   isArray: false },
      { field: profile.brand_irreplaceability,   isArray: false },
      { field: profile.brand_on_brand_example,   isArray: false },
      { field: profile.brand_off_brand_example,  isArray: false },
      { field: profile.brand_voice_archetype || profile.brand_3_words, isArray: false },
    ];

    const answered = checks.filter(check => {
      if (check.isArray) {
        return Array.isArray(check.field) && check.field.length > 0;
      }
      return typeof check.field === 'string' && check.field.trim().length > 3;
    }).length;

    console.log('Constitution progress:', answered, '/', checks.length);

    return { answered, total: checks.length };
  })();

  const todayQuestion = profile?.constitution_queue?.[0] || null;

  // ── Actions ──────────────────────────────────────────────────
  async function markTaskDone(taskIndex, exitData) {
    try {
      const task = profile.tasks[taskIndex];

      const response = await fetch('/api/tasks/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          brandName:        profile.brand_name,
          taskId:           task.id,
          taskIndex,
          did_it:           exitData.did_it,
          what_happened:    exitData.what_happened,
          what_differently: exitData.what_differently,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const updatedTasks = [...profile.tasks];
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          status:       'done',
          completed_at: new Date().toISOString(),
        };

        setProfile(prev => ({
          ...prev,
          tasks:        updatedTasks,
          pulse_streak: result.newStreak,
        }));

        // Check if week should advance
        await fetch('/api/tasks/update-week', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ brandName: profile.brand_name }),
        });
      }
    } catch (err) {
      console.error('markTaskDone error:', err);
    }
  }

  async function saveConstitutionAnswer(question, answer) {
    try {
      await fetch('/api/constitution/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brandName: profile.brand_name, question, answer }),
      });
      setProfile(prev => ({
        ...prev,
        constitution_queue: prev.constitution_queue?.slice(1) || [],
      }));
    } catch (err) {
      console.error('Save answer failed:', err);
    }
  }

  async function markBriefOpened() {
    if (!latestBrief) return;
    const updatedBriefs = [...(profile.monday_briefs || [])];
    updatedBriefs[updatedBriefs.length - 1].was_opened = true;
    setProfile(prev => ({ ...prev, monday_briefs: updatedBriefs }));
  }

  async function generateBriefNow() {
    setIsGeneratingBrief(true);
    try {
      const response = await fetch('/api/monday-brief/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brandName: profile.brand_name }),
      });
      const result = await response.json();

      if (result.success) {
        setProfile(prev => ({
          ...prev,
          monday_briefs: [...(prev.monday_briefs || []), result.brief],
        }));
      }
    } catch (err) {
      console.error('Generate brief error:', err);
    } finally {
      setIsGeneratingBrief(false);
    }
  }

  return {
    profile,
    setProfile,
    isLoading,
    error,
    contentIdea,
    trends,
    voiceCheckUsage,
    todayTask,
    currentWeek,
    streak,
    latestBrief,
    isBriefNew,
    scoreHistory,
    latestScore,
    latestDimensions,
    scoreDelta,
    constitutionProgress,
    todayQuestion,
    isGeneratingBrief,
    markTaskDone,
    saveConstitutionAnswer,
    markBriefOpened,
    generateBriefNow,
    refreshProfile,
  };
}
