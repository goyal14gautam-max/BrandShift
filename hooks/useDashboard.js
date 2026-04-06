'use client';

import { useState, useEffect } from 'react';

export function useDashboard() {
  const [profile, setProfile]                   = useState(null);
  const [isLoading, setIsLoading]               = useState(true);
  const [error, setError]                       = useState(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const brandName = localStorage.getItem('brandshift_active_brand');

        if (!brandName) {
          setError('no_brand');
          setIsLoading(false);
          return;
        }

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
  }, []);

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

  const latestScore  = profile?.latest_overall_score || null;

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
    const fields = [
      'brand_mission', 'brand_personality_words', 'brand_off_brand_words',
      'brand_best_customer', 'brand_5_year_association', 'brand_origin_story',
      'brand_refuses_to', 'brand_person_description', 'brand_party_behaviour',
      'brand_owned_phrases', 'brand_cringe_phrases', 'brand_customer_belief',
      'brand_customer_feeling', 'brand_not_for', 'brand_10_year_dream',
      'brand_admired_brand', 'brand_competitive_edge', 'brand_irreplaceability',
      'brand_voice_examples', 'brand_voice_examples',
    ];
    const answered = fields.filter(
      f => profile[f] && (Array.isArray(profile[f]) ? profile[f].length > 0 : profile[f] !== '')
    ).length;
    return { answered, total: 20 };
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
  };
}
