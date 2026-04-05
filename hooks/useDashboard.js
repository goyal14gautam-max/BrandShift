'use client';

import { useState, useEffect } from 'react';
import { getBrandProfile } from '@/lib/supabase';

export function useDashboard() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const brandName = localStorage.getItem('brandshift_active_brand');

        if (!brandName) {
          setError('no_brand');
          setIsLoading(false);
          return;
        }

        const data = await getBrandProfile(brandName);

        if (!data) {
          setError('not_found');
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

  // Derived values
  const todayTask = profile?.tasks?.find(t => t.status === 'todo') || null;

  const currentWeek = profile?.current_week || 1;

  const streak = profile?.pulse_streak || 0;

  const latestBrief = profile?.monday_briefs?.[profile.monday_briefs.length - 1] || null;

  const isBriefNew = latestBrief && !latestBrief.was_opened;

  const scoreHistory = profile?.score_history || [];

  const latestScore = profile?.latest_overall_score || null;

  const previousScore = scoreHistory.length > 1
    ? scoreHistory[scoreHistory.length - 2]?.overall_score
    : null;

  const scoreDelta = latestScore && previousScore
    ? Math.round((latestScore - previousScore) * 10) / 10
    : null;

  const constitutionProgress = (() => {
    if (!profile) return { answered: 0, total: 20 };
    const fields = [
      'brand_mission',
      'brand_personality_words',
      'brand_off_brand_words',
      'brand_best_customer',
      'brand_5_year_association',
      'brand_origin_story',
      'brand_refuses_to',
      'brand_person_description',
      'brand_party_behaviour',
      'brand_owned_phrases',
      'brand_cringe_phrases',
      'brand_customer_belief',
      'brand_customer_feeling',
      'brand_not_for',
      'brand_10_year_dream',
      'brand_admired_brand',
      'brand_competitive_edge',
      'brand_irreplaceability',
      'brand_voice_examples',
      'brand_voice_examples',
    ];
    const answered = fields.filter(
      f => profile[f] && (Array.isArray(profile[f]) ? profile[f].length > 0 : profile[f] !== '')
    ).length;
    return { answered, total: 20 };
  })();

  const todayQuestion = profile?.constitution_queue?.[0] || null;

  async function markTaskDone(taskIndex) {
    const updatedTasks = [...(profile.tasks || [])];
    if (updatedTasks[taskIndex]) {
      updatedTasks[taskIndex].status = 'in_progress';
    }
    setProfile(prev => ({ ...prev, tasks: updatedTasks }));
  }

  async function saveConstitutionAnswer(question, answer) {
    try {
      await fetch('/api/constitution/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName: profile.brand_name, question, answer }),
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

  return {
    profile,
    isLoading,
    error,
    todayTask,
    currentWeek,
    streak,
    latestBrief,
    isBriefNew,
    scoreHistory,
    latestScore,
    scoreDelta,
    constitutionProgress,
    todayQuestion,
    markTaskDone,
    saveConstitutionAnswer,
    markBriefOpened,
  };
}
