import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

// ─── Admin client (server-side only, uses service key) ───────────
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function getClient() {
  return supabaseAdmin;
}

// ─── Server client (server components / route handlers) ──────────
// Pass cookieStore in from the caller — do not import next/headers here
export function createSupabaseServerClient(cookieStore) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );
}

// ─── Auth helpers ─────────────────────────────────────────────────
export async function getAccountByUserId(userId) {
  const { data } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function updateAccount(userId, updates) {
  const { data, error } = await supabaseAdmin
    .from('accounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) { console.error('updateAccount error:', error); return null; }
  return data;
}

export async function associateBrandWithUser(brandName, userId) {
  try {
    await supabaseAdmin
      .from('brand_profiles')
      .update({ owner_user_id: userId })
      .ilike('brand_name', brandName);

    const { data: profile } = await supabaseAdmin
      .from('brand_profiles')
      .select('id')
      .ilike('brand_name', brandName)
      .single();

    if (!profile) return false;

    const account = await getAccountByUserId(userId);
    if (!account) return false;

    await supabaseAdmin
      .from('brand_memberships')
      .upsert({ account_id: account.id, brand_profile_id: profile.id, role: 'owner' });

    await updateAccount(userId, { primary_brand: brandName });
    return true;
  } catch (err) {
    console.error('associateBrandWithUser:', err);
    return false;
  }
}

export async function getBrandsForUser(userId) {
  const account = await getAccountByUserId(userId);
  if (!account) return [];

  const { data } = await supabaseAdmin
    .from('brand_memberships')
    .select(`brand_profile_id, role, brand_profiles (id, brand_name, industry, latest_overall_score, latest_score_date)`)
    .eq('account_id', account.id)
    .eq('is_active', true);

  return data?.map(m => ({ ...m.brand_profiles, role: m.role })) || [];
}

// ─── brand_audits ────────────────────────────────────────────────

export async function saveAudit({
  brandName, industry, brandAge, targetAudience,
  websiteUrl, instagramHandle, challenge,
  scraped_homepage, scraped_about, scraped_blog,
  scraped_instagram, scraped_comp1, scraped_comp2,
  scoreData,
}) {
  const supabase = getClient();
  const { error } = await supabase.from('brand_audits').insert({
    brand_name:        brandName,
    industry,
    brand_age:         brandAge,
    target_audience:   targetAudience,
    website_url:       websiteUrl,
    instagram_handle:  instagramHandle,
    challenge,
    scraped_homepage,
    scraped_about,
    scraped_blog,
    scraped_instagram,
    scraped_comp1,
    scraped_comp2,
    score_json:        scoreData,
    overall_score:     scoreData?.overall_score ?? null,
    rebrand_urgency:   scoreData?.rebrand_urgency ?? null,
    data_confidence:   scoreData?.data_confidence ?? null,
  });
  if (error) throw error;
}

export async function getPreviousAudits(brandName) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('brand_audits')
    .select('id, created_at, overall_score, rebrand_urgency, data_confidence, score_json')
    .ilike('brand_name', brandName)
    .order('created_at', { ascending: false })
    .limit(3);
  if (error) {
    console.error('getPreviousAudits error:', error.message);
    return [];
  }
  return data ?? [];
}

// ─── brand_profiles ──────────────────────────────────────────────

export async function createBrandProfile({
  brandName, industry, brandAge, targetAudience,
  websiteUrl, instagramHandle, marketFocus, competitors,
}) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('brand_profiles')
    .insert({
      brand_name:       brandName,
      industry,
      brand_age:        brandAge,
      target_audience:  targetAudience,
      website_url:      websiteUrl,
      instagram_handle: instagramHandle,
      market_focus:     marketFocus || null,
      competitors:      competitors || [],
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function getBrandProfile(brandName) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('*')
    .ilike('brand_name', brandName)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // no rows found
    throw error;
  }
  return data;
}

export async function updateBrandProfile(brandName, updates) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('brand_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .ilike('brand_name', brandName)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveScoreToHistory(brandName, scoreData) {
  const supabase = getClient();

  const profile = await getBrandProfile(brandName);
  if (!profile) throw new Error(`No brand profile found for: ${brandName}`);

  const existing = profile.score_history ?? [];
  const newEntry = {
    date:             new Date().toISOString(),
    overall_score:    scoreData.overall_score,
    dimensions:       scoreData.dimensions,
    rebrand_urgency:  scoreData.rebrand_urgency,
    data_confidence:  scoreData.data_confidence,
  };

  // Keep last 52 entries
  const updated = [...existing, newEntry].slice(-52);

  const { data, error } = await supabase
    .from('brand_profiles')
    .update({
      score_history:        updated,
      latest_overall_score: scoreData.overall_score,
      latest_score_date:    newEntry.date,
      updated_at:           newEntry.date,
    })
    .ilike('brand_name', brandName)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveTaskUpdate(brandName, weekNumber, taskIndex, updates) {
  const supabase = getClient();

  const profile = await getBrandProfile(brandName);
  if (!profile) throw new Error(`No brand profile found for: ${brandName}`);

  const tasks = profile.tasks ?? [];
  const idx = tasks.findIndex(t => t.week === weekNumber && tasks.indexOf(t) === taskIndex);
  const targetIndex = idx !== -1 ? idx : tasks.findIndex((t, i) => t.week === weekNumber && i === taskIndex);

  if (targetIndex === -1) throw new Error(`Task not found: week ${weekNumber}, index ${taskIndex}`);

  tasks[targetIndex] = { ...tasks[targetIndex], ...updates };

  const { data, error } = await supabase
    .from('brand_profiles')
    .update({ tasks, updated_at: new Date().toISOString() })
    .ilike('brand_name', brandName)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function savePulseToHistory(brandName, pulseData) {
  const supabase = getClient();

  const profile = await getBrandProfile(brandName);
  if (!profile) throw new Error(`No brand profile found for: ${brandName}`);

  const existing = profile.pulse_history ?? [];
  const today = new Date().toISOString().split('T')[0];

  // Check streak: did yesterday have a pulse?
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const hadYesterday = existing.some(p => p.date === yesterday);
  const newStreak = hadYesterday ? (profile.pulse_streak ?? 0) + 1 : 1;

  // Replace today's entry if it exists, otherwise append
  const withoutToday = existing.filter(p => p.date !== today);
  const updated = [...withoutToday, { ...pulseData, date: today }].slice(-30);

  const { data, error } = await supabase
    .from('brand_profiles')
    .update({
      pulse_history:   updated,
      pulse_streak:    newStreak,
      last_pulse_date: today,
      updated_at:      new Date().toISOString(),
    })
    .ilike('brand_name', brandName)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveAnsweredQuestion(brandName, question, answer) {
  const supabase = getClient();

  const profile = await getBrandProfile(brandName);
  if (!profile) throw new Error(`No brand profile found for: ${brandName}`);

  const today = new Date().toISOString().split('T')[0];
  const existing = profile.daily_questions_answered ?? [];
  const newEntry = { date: today, question, answer };

  // Update today's pulse entry with the answer
  const pulseHistory = (profile.pulse_history ?? []).map(p =>
    p.date === today ? { ...p, question_answer: answer } : p
  );

  const { data, error } = await supabase
    .from('brand_profiles')
    .update({
      daily_questions_answered: [...existing, newEntry],
      pulse_history:            pulseHistory,
      updated_at:               new Date().toISOString(),
    })
    .ilike('brand_name', brandName)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveMondayBrief(brandName, briefData) {
  const supabase = getClient();

  const profile = await getBrandProfile(brandName);
  if (!profile) throw new Error(`No brand profile found for: ${brandName}`);

  const existing = profile.monday_briefs ?? [];
  const updated = [...existing, { ...briefData, date: new Date().toISOString().split('T')[0] }].slice(-12);

  const { data, error } = await supabase
    .from('brand_profiles')
    .update({ monday_briefs: updated, updated_at: new Date().toISOString() })
    .ilike('brand_name', brandName)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveContentSignal(brandName, signalData) {
  const supabase = getClient();

  const profile = await getBrandProfile(brandName);
  if (!profile) throw new Error(`No brand profile found for: ${brandName}`);

  const existing = profile.content_signals ?? [];
  const updated = [...existing, { ...signalData, date: new Date().toISOString().split('T')[0] }];

  const { data, error } = await supabase
    .from('brand_profiles')
    .update({ content_signals: updated, updated_at: new Date().toISOString() })
    .ilike('brand_name', brandName)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveInstagramSnapshot(brandName, snapshotData) {
  const supabase = getClient();

  const profile = await getBrandProfile(brandName);
  if (!profile) throw new Error(`No brand profile found for: ${brandName}`);

  const existing = profile.instagram_snapshots ?? [];
  const updated = [
    ...existing,
    { ...snapshotData, date: new Date().toISOString().split('T')[0] },
  ].slice(-52);

  const { data, error } = await supabase
    .from('brand_profiles')
    .update({ instagram_snapshots: updated, updated_at: new Date().toISOString() })
    .ilike('brand_name', brandName)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── task_history ────────────────────────────────────────────────

export async function saveTaskHistory(data) {
  try {
    const supabase = getClient();
    const { error } = await supabase.from('task_history').insert(data);
    if (error) console.error('saveTaskHistory error:', error);
  } catch (err) {
    console.error('saveTaskHistory caught:', err);
  }
}

// Alias used by API routes that need admin access (same client — uses SERVICE_KEY)
export const getBrandProfileAdmin = getBrandProfile;

// Get all brand profiles that have a roadmap (for cron)
export async function getAllProfilesWithRoadmap() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('brand_name, industry, current_week, latest_overall_score')
    .not('current_roadmap', 'is', null);
  if (error) {
    console.error('getAllProfilesWithRoadmap error:', error);
    return [];
  }
  return data ?? [];
}

// ─── constitution_queue ──────────────────────────────────────────

// Returns the next queued question without removing it (peek)
export async function getNextConstitutionQuestion(brandName) {
  const profile = await getBrandProfile(brandName);
  if (!profile) return null;
  const queue = profile.constitution_queue ?? [];
  return queue.length ? queue[0] : null;
}

// Called after brand answers a daily constitution question:
// saves the answer to the correct column and pops it from the queue
export async function answerConstitutionQuestion(brandName, field, answer) {
  const supabase = getClient();

  const profile = await getBrandProfile(brandName);
  if (!profile) throw new Error(`No brand profile found for: ${brandName}`);

  const queue = profile.constitution_queue ?? [];
  const updatedQueue = queue.filter(q => q.field !== field);

  // For voice examples, merge into the jsonb array
  let fieldUpdates = { [field]: answer };
  if (field === 'voice_good' || field === 'voice_bad') {
    const existing = profile.brand_voice_examples?.[0] || {};
    fieldUpdates = {
      brand_voice_examples: [{ ...existing, [field === 'voice_good' ? 'good' : 'bad']: answer }],
    };
  }

  const { data, error } = await supabase
    .from('brand_profiles')
    .update({
      ...fieldUpdates,
      constitution_queue: updatedQueue,
      updated_at: new Date().toISOString(),
    })
    .ilike('brand_name', brandName)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── shared_reports ─────────────────────────────────────────────

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export async function createSharedReport(data) {
  const supabase = getClient();
  const shareToken = generateToken();

  const { data: report, error } = await supabase
    .from('shared_reports')
    .insert({
      share_token:  shareToken,
      brand_name:   data.brandName,
      industry:     data.industry || null,
      score_data:   data.scoreData,
      intake_data:  data.intakeData || null,
      scraped_data: data.scrapedData || null,
      created_by:   data.createdBy || 'manual',
    })
    .select()
    .single();

  if (error) {
    console.error('createSharedReport:', error);
    return null;
  }
  return report;
}

export async function getSharedReport(token) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('shared_reports')
    .select('*')
    .eq('share_token', token)
    .eq('is_active', true)
    .single();

  if (error) return null;

  // Track view
  await supabase
    .from('shared_reports')
    .update({
      viewed_at:  new Date().toISOString(),
      view_count: (data.view_count || 0) + 1,
    })
    .eq('share_token', token);

  return data;
}

export async function listSharedReports() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('shared_reports')
    .select('id, share_token, brand_name, industry, score_data, created_at, viewed_at, view_count, is_active')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('listSharedReports:', error);
    return [];
  }
  return data ?? [];
}

// Count how many of 20 constitution questions are answered
export function countConstitutionAnswers(profile) {
  if (!profile) return 0;
  const allFields = [
    'brand_mission', 'brand_personality_words', 'brand_off_brand_words',
    'brand_best_customer', 'brand_5_year_association', 'brand_origin_story',
    'brand_refuses_to', 'brand_person_description', 'brand_party_behaviour',
    'brand_owned_phrases', 'brand_cringe_phrases', 'brand_customer_belief',
    'brand_customer_feeling', 'brand_not_for', 'brand_10_year_dream',
    'brand_admired_brand', 'brand_competitive_edge', 'brand_irreplaceability',
  ];
  const voiceAnswered = (profile.brand_voice_examples?.[0]?.good ? 1 : 0) +
                        (profile.brand_voice_examples?.[0]?.bad  ? 1 : 0);
  const answered = allFields.filter(f => {
    const v = profile[f];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }).length;
  return answered + voiceAnswered;
}
