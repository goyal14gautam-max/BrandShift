import { smartMatch, matchWordList, getSimilarity } from './semanticSimilarity';

// ── INDIAN CALENDAR ──────────────────────────────────────────

const INDIAN_CALENDAR = [
  { name: 'IPL Season', months: [3,4,5], emoji: '\u{1F3CF}',
    goodFor: ['sports','youth','entertainment','snacks','beverages','gaming','fashion','tech','d2c','energy'],
    badFor: ['luxury','formal','b2b','finance','healthcare','serious'] },
  { name: 'Summer', months: [4,5,6], emoji: '\u2600\uFE0F',
    goodFor: ['cooling','beverages','travel','skincare','fashion','outdoor','sunscreen','refreshing','light'],
    badFor: [] },
  { name: 'Monsoon', months: [7,8,9], emoji: '\u{1F327}\uFE0F',
    goodFor: ['food','beverages','home','comfort','hygiene','cozy','indoor','delivery','warm'],
    badFor: ['outdoor','travel','adventure','sports','active'] },
  { name: 'Festive Season', months: [9,10,11], emoji: '\u{1FA94}',
    goodFor: ['gifting','fashion','jewellery','home','electronics','food','beauty','d2c','premium','celebration','family'],
    badFor: ['minimalism','diet','weight loss','sad','dark','negative'] },
  { name: 'Wedding Season', months: [11,12,1,2], emoji: '\u{1F48D}',
    goodFor: ['fashion','jewellery','beauty','gifting','hospitality','food','decor','luxury','occasion'],
    badFor: [] },
  { name: 'New Year', months: [1], emoji: '\u{1F389}',
    goodFor: ['fitness','health','fresh start','goals','new','change','better','resolution','transformation'],
    badFor: [] },
  { name: 'Board Exam Season', months: [2,3], emoji: '\u{1F4DA}',
    goodFor: ['edtech','stationery','food','health','focus','productivity','study','nutrition','energy'],
    badFor: ['entertainment','party','luxury','travel','distraction'] },
];

const OBJECTIVE_TO_DIMENSION = {
  awareness: 'visual_identity',
  sales: 'competitor_positioning',
  loyalty: 'audience_alignment',
  cultural: 'trend_relevance',
};

// ── CHECK 1 — PERSONALITY (15%) ─────────────────────────────

async function checkPersonality(campaignText, personalityWords = []) {
  if (!personalityWords?.length) {
    return { score: 55, status: 'warning', message: 'Brand personality not defined. Complete your Brand Constitution to enable this check.', matched: [], missing: [], hasData: false };
  }
  const { matched, missing, matchRate } = await matchWordList(campaignText, personalityWords, 0.62);
  const score = Math.round(matchRate * 100);
  const matchDescriptions = matched.map(m => m.via === 'direct' ? m.word : `${m.word} \u2192 "${m.matchedAs}"`);

  return {
    score,
    status: score >= 60 ? 'pass' : score >= 30 ? 'warning' : 'fail',
    message: score >= 60
      ? `Campaign captures your brand personality: ${matchDescriptions.join(', ')}`
      : score >= 30
      ? `Campaign partially captures your personality. Missing: ${missing.slice(0, 3).join(', ')}`
      : `Campaign doesn't feel like your brand. Define personality: ${personalityWords.join(', ')}`,
    matched: matchDescriptions, missing, hasData: true,
  };
}

// ── CHECK 2 — OFF-BRAND LANGUAGE (12%) ──────────────────────

async function checkOffBrand(campaignText, offBrandWords = [], cringePhrases = []) {
  const allOffBrand = [...(offBrandWords || []), ...(cringePhrases || [])].filter(Boolean);
  if (!allOffBrand.length) {
    return { score: 65, status: 'warning', message: 'No off-brand words defined in Brand Constitution.', violations: [], hasData: false };
  }
  const results = await Promise.all(allOffBrand.map(word => smartMatch(campaignText, word, 0.70)));
  const violations = results.filter(r => r.matched).map(r => ({ offBrandWord: r.word, foundAs: r.matchedAs, via: r.via, confidence: r.confidence }));
  const score = violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 22);
  const violationText = violations.slice(0, 2).map(v => v.via === 'direct' ? `"${v.offBrandWord}"` : `"${v.foundAs}" (close to "${v.offBrandWord}")`).join(', ');

  return {
    score,
    status: violations.length === 0 ? 'pass' : violations.length <= 1 ? 'warning' : 'fail',
    message: violations.length === 0 ? 'No off-brand language detected' : `Off-brand language found: ${violationText}`,
    violations, hasData: true,
  };
}

// ── CHECK 3 — HARD NOS (20%) ────────────────────────────────

async function checkHardNos(campaignText, brandRefusesTo = []) {
  if (!brandRefusesTo?.length) {
    return { score: 65, status: 'warning', message: 'Brand hard limits not defined in Brand Constitution.', violations: [], hasData: false };
  }
  const results = await Promise.all(brandRefusesTo.map(async refusal => {
    const conceptMatch = await smartMatch(campaignText, refusal, 0.60);
    const keywords = refusal.split(' ').filter(w => w.length > 4);
    const keywordResults = await Promise.all(keywords.map(kw => smartMatch(campaignText, kw, 0.72)));
    const keywordMatch = keywordResults.find(r => r.matched);
    const matched = conceptMatch.matched || !!keywordMatch;
    return {
      refusal, matched,
      via: conceptMatch.matched ? 'conceptual' : keywordMatch ? `keyword "${keywordMatch.matchedAs}"` : null,
      confidence: conceptMatch.matched ? conceptMatch.confidence : 'medium',
    };
  }));
  const violations = results.filter(r => r.matched);

  return {
    score: violations.length === 0 ? 100 : 0,
    status: violations.length === 0 ? 'pass' : 'fail',
    message: violations.length === 0 ? 'Campaign respects all brand limits' : `Conflicts with brand limit: "${violations[0].refusal}"`,
    violations: violations.map(v => v.refusal), violationDetails: violations, hasData: true,
  };
}

// ── CHECK 4 — AUDIENCE ALIGNMENT (10%) ──────────────────────

async function checkAudience(campaignAudience, targetAudience = '', bestCustomer = '') {
  if (!campaignAudience) return { score: 50, status: 'warning', message: 'No campaign audience specified' };
  const brandAudience = (targetAudience + ' ' + bestCustomer).trim();
  if (!brandAudience.trim()) return { score: 55, status: 'warning', message: 'Brand audience not defined in constitution' };

  const conceptualScore = await getSimilarity(campaignAudience, brandAudience);
  const audienceKeywords = brandAudience.split(' ').filter(w => w.length > 3);
  const { matched } = await matchWordList(campaignAudience, audienceKeywords, 0.65);
  const keywordScore = audienceKeywords.length ? matched.length / audienceKeywords.length : 0;
  const combinedScore = Math.round((conceptualScore * 0.6 + keywordScore * 0.4) * 100);

  return {
    score: Math.min(100, combinedScore + 20),
    status: combinedScore >= 40 ? 'pass' : combinedScore >= 20 ? 'warning' : 'fail',
    message: combinedScore >= 40
      ? 'Campaign audience aligns with your core customer'
      : "Campaign targets a different audience than your brand's core customer. Risk of mixed signals.",
    conceptualScore: Math.round(conceptualScore * 100), hasData: true,
  };
}

// ── CHECK 5 — OBJECTIVE vs GAPS (8%) ────────────────────────

function checkObjective(objective, campaignText, dimensions = {}) {
  const dimScores = Object.entries(dimensions).map(([key, val]) => ({ key, score: val?.score || 50 })).sort((a, b) => a.score - b.score);
  if (!dimScores.length) return { score: 60, status: 'warning', message: 'Run a brand audit first to unlock this check', hasData: false };

  const weakest = dimScores[0];
  const targetDimension = OBJECTIVE_TO_DIMENSION[objective];
  const addressesWeakness = targetDimension === weakest.key;
  const dimName = weakest.key.replace(/_/g, ' ');

  return {
    score: addressesWeakness ? 85 : 60,
    status: addressesWeakness ? 'pass' : 'warning',
    message: addressesWeakness
      ? `This campaign type can strengthen your weakest area: ${dimName} (${weakest.score}/100)`
      : `Opportunity missed: your weakest score is ${dimName} (${weakest.score}/100). A different objective could address this.`,
    weakestDimension: weakest.key, weakestScore: weakest.score, hasData: true,
  };
}

// ── CHECK 6 — SCORE MOMENTUM (8%) ──────────────────────────

function checkMomentum(scoreHistory = []) {
  if (scoreHistory.length < 2) return { score: 60, status: 'warning', message: 'Not enough score history yet', hasData: false };
  const recent = scoreHistory.slice(-4);
  const trend = recent[recent.length - 1].overall_score - recent[0].overall_score;

  return {
    score: trend < -8 ? 35 : trend > 2 ? 90 : 65,
    status: trend < -8 ? 'fail' : trend > 2 ? 'pass' : 'warning',
    message: trend < -8
      ? `Score dropped ${Math.abs(Math.round(trend))} points recently. Investigate before launching.`
      : trend > 2
      ? `Brand score is improving (+${Math.round(trend)}). Good momentum to launch from.`
      : 'Score is stable. Campaign could push it either direction.',
    trend: Math.round(trend), hasData: true,
  };
}

// ── CHECK 7 — CALENDAR TIMING (7%) ─────────────────────────

function checkCalendar(startDate, industry = '', campaignText = '') {
  const date = startDate ? new Date(startDate) : new Date();
  const month = date.getMonth() + 1;
  const activeEvents = INDIAN_CALENDAR.filter(e => e.months.includes(month));
  if (!activeEvents.length) return { score: 70, status: 'pass', message: 'No major cultural calendar conflicts this month', activeEvents: [] };

  const combinedText = (industry + ' ' + campaignText).toLowerCase();
  let score = 70;
  const insights = [], opportunities = [], conflicts = [];

  activeEvents.forEach(event => {
    const isGood = event.goodFor.some(g => combinedText.includes(g));
    const isBad = event.badFor.some(b => combinedText.includes(b));
    if (isGood) { score = Math.min(100, score + 15); opportunities.push(event.name); insights.push({ type: 'positive', message: `${event.emoji} ${event.name} is a strong fit \u2014 lean into it` }); }
    if (isBad) { score = Math.max(20, score - 20); conflicts.push(event.name); insights.push({ type: 'warning', message: `${event.emoji} ${event.name} may work against this campaign's tone` }); }
    if (!isGood && !isBad) { insights.push({ type: 'neutral', message: `${event.emoji} ${event.name} is active \u2014 consider if you can tap this moment` }); }
  });

  return {
    score,
    status: score >= 70 ? 'pass' : score >= 50 ? 'warning' : 'fail',
    message: opportunities.length ? `Good timing \u2014 ${opportunities.join(', ')} works in your favour` : conflicts.length ? `Timing concern \u2014 ${conflicts[0]} may conflict` : `${activeEvents[0].emoji} ${activeEvents[0].name} is active \u2014 check if relevant`,
    activeEvents: activeEvents.map(e => ({ name: e.name, emoji: e.emoji })), insights, hasData: true,
  };
}

// ── CHECK 8 — EXECUTION RISK (8%) ──────────────────────────

function checkExecution(tasks = [], channels = []) {
  const withInterviews = tasks.filter(t => t.exit_interview);
  if (withInterviews.length < 3) return { score: 60, status: 'warning', message: `Complete more roadmap tasks to enable execution risk scoring (${withInterviews.length}/3 done)`, hasData: false };

  const signals = withInterviews.map(t => t.exit_interview.result_signal);
  const positiveRate = signals.filter(s => s === 'positive').length / signals.length;
  const isMultiChannel = (channels || []).length >= 2;
  let score = Math.round(positiveRate * 100);
  if (isMultiChannel && positiveRate < 0.6) score -= 10;

  return {
    score: Math.max(0, Math.min(100, score)),
    status: score >= 70 ? 'pass' : score >= 50 ? 'warning' : 'fail',
    message: score >= 70 ? `Strong execution history \u2014 ${Math.round(positiveRate * 100)}% task success rate` : score >= 50 ? 'Mixed execution history. Add review checkpoints.' : 'Low execution rate. Simplify this campaign first.',
    positiveRate, tasksAnalysed: withInterviews.length, hasData: true,
  };
}

// ── CHECK 9 — CONTENT PATTERNS (7%) ────────────────────────

function checkContentPatterns(channels = [], campaignText, contentIdeas = [], voiceCheckCount = 0) {
  if (contentIdeas.length < 3) return { score: 60, status: 'warning', message: `Generate more content ideas to enable this check (${contentIdeas.length}/3)`, hasData: false };

  const formatCounts = {}, themeCounts = {};
  contentIdeas.forEach(idea => {
    if (idea.format) formatCounts[idea.format] = (formatCounts[idea.format] || 0) + 1;
    if (idea.theme) themeCounts[idea.theme] = (themeCounts[idea.theme] || 0) + 1;
  });
  const topFormats = Object.entries(formatCounts).sort(([,a],[,b]) => b - a).slice(0, 2).map(([f]) => f);
  const topThemes = Object.entries(themeCounts).sort(([,a],[,b]) => b - a).slice(0, 2).map(([t]) => t);

  const textLower = campaignText.toLowerCase();
  const channelText = (channels || []).join(' ').toLowerCase();
  const formatMatch = topFormats.some(f => textLower.includes(f.toLowerCase()) || channelText.includes(f.toLowerCase()));
  const themeMatch = topThemes.some(t => textLower.includes(t.toLowerCase()));

  let score = 60;
  if (formatMatch) score += 20;
  if (themeMatch) score += 15;
  if (voiceCheckCount > 5) score += 5;

  return {
    score: Math.min(100, score),
    status: score >= 70 ? 'pass' : score >= 50 ? 'warning' : 'fail',
    message: score >= 70 ? `Campaign aligns with your content patterns (${topFormats.join(', ')})` : `Campaign diverges from your usual content patterns. Your strengths: ${topFormats.join(', ')}`,
    topFormats, topThemes, hasData: true,
  };
}

// ── CHECK 10 — MARKET TIMING (5%) ──────────────────────────

function checkMarket(briefs = [], campaignText) {
  if (briefs.length < 3) return { score: 60, status: 'warning', message: `Generate Monday Briefs to enable market intelligence (${briefs.length}/3)`, hasData: false };

  const recentBriefs = briefs.slice(-6);
  const textLower = campaignText.toLowerCase();
  const allPulse = recentBriefs.map(b => b.category_pulse || '').join(' ').toLowerCase();
  const allCompetitor = recentBriefs.map(b => b.competitor_move || '').join(' ').toLowerCase();

  const pulseWords = allPulse.split(/\s+/).filter(w => w.length > 5).reduce((acc, w) => { acc[w] = (acc[w] || 0) + 1; return acc; }, {});
  const trendingTopics = Object.entries(pulseWords).filter(([,c]) => c >= 2).sort(([,a],[,b]) => b - a).slice(0, 5).map(([w]) => w);
  const competitorWords = allCompetitor.split(/\s+/).filter(w => w.length > 5).reduce((acc, w) => { acc[w] = (acc[w] || 0) + 1; return acc; }, {});
  const competitorTopics = Object.entries(competitorWords).filter(([,c]) => c >= 2).slice(0, 3).map(([w]) => w);

  const alignsWithCategory = trendingTopics.some(t => textLower.includes(t));
  const overlapWithCompetitor = competitorTopics.some(t => textLower.includes(t));

  let score = 70;
  if (alignsWithCategory) score += 15;
  if (overlapWithCompetitor) score -= 20;

  return {
    score: Math.min(100, Math.max(0, score)),
    status: score >= 70 ? 'pass' : score >= 50 ? 'warning' : 'fail',
    message: alignsWithCategory ? 'Campaign aligns with trending topics in your category' : overlapWithCompetitor ? 'Campaign overlaps with competitor activity. Risk of looking like a follower.' : 'No strong market signal match from recent briefs',
    trendingTopics, overlapWithCompetitor, hasData: true,
  };
}

// ── TREND TERRITORY MODIFIER ────────────────────────────────

async function checkTrends(campaignText, trends = []) {
  if (!trends?.length) return { modifier: 0, insights: [] };
  let modifier = 0;
  const insights = [];

  for (const trend of trends) {
    if (!trend.name) continue;
    const match = await smartMatch(campaignText, trend.name, 0.62);
    if (!match.matched) continue;

    if (trend.fit === 'avoid') {
      modifier -= 10;
      insights.push({ type: 'fail', message: `Enters "${trend.name}" territory \u2014 flagged AVOID. ${trend.reason || ''}` });
    } else if (trend.fit === 'use') {
      modifier += 8;
      insights.push({ type: 'positive', message: `Leverages "${trend.name}" \u2014 flagged USE. ${trend.how_to_use || ''}` });
    } else {
      insights.push({ type: 'neutral', message: `Touches "${trend.name}" \u2014 flagged TEST. Measure carefully.` });
    }
  }

  return { modifier, insights };
}

// ── MAIN FUNCTION ───────────────────────────────────────────

export async function runPreFlightCheck(campaign, profile) {
  // Supabase returns null (not undefined) for empty columns — coerce all to safe defaults
  const brand_personality_words = profile.brand_personality_words || [];
  const brand_off_brand_words = profile.brand_off_brand_words || [];
  const brand_refuses_to = profile.brand_refuses_to || [];
  const brand_cringe_phrases = profile.brand_cringe_phrases || [];
  const brand_best_customer = profile.brand_best_customer || '';
  const target_audience = profile.target_audience || '';
  const industry = profile.industry || '';
  const tasks = profile.tasks || [];
  const monday_briefs = profile.monday_briefs || [];
  const latest_trends = profile.latest_trends || [];
  const score_history = profile.score_history || [];
  const voice_check_count = profile.voice_check_count || 0;

  const latestScore = score_history.length ? score_history[score_history.length - 1] : null;
  const dimensions = latestScore?.dimensions || {};
  const contentIdeas = profile.content_ideas_history || (profile.latest_content_idea ? [profile.latest_content_idea] : []);

  const [personality, offBrand, hardNos, audience, objective, contentPatterns, trends] = await Promise.all([
    checkPersonality(campaign.description, brand_personality_words),
    checkOffBrand(campaign.description, brand_off_brand_words, brand_cringe_phrases),
    checkHardNos(campaign.description, brand_refuses_to),
    checkAudience(campaign.targetAudience, target_audience, brand_best_customer),
    Promise.resolve(checkObjective(campaign.objective, campaign.description, dimensions)),
    Promise.resolve(checkContentPatterns(campaign.channels, campaign.description, contentIdeas, voice_check_count)),
    checkTrends(campaign.description, latest_trends),
  ]);

  const momentum = checkMomentum(score_history);
  const calendar = checkCalendar(campaign.startDate, industry, campaign.description);
  const execution = checkExecution(tasks, campaign.channels);
  const market = checkMarket(monday_briefs, campaign.description);

  const checks = { personality, offBrand, hardNos, audience, objective, momentum, calendar, execution, contentPatterns, market };

  const hasTaskHistory = tasks.filter(t => t.exit_interview).length >= 3;
  const hasBriefs = monday_briefs.length >= 3;
  const hasContent = contentIdeas.length >= 3;
  const hasScores = score_history.length >= 2;
  const hasTrends = latest_trends.length > 0;

  const weights = {
    hardNos: 0.22, personality: 0.16, offBrand: 0.13, audience: 0.10, objective: 0.09,
    momentum: hasScores ? 0.08 : 0.04, calendar: 0.07, execution: hasTaskHistory ? 0.08 : 0.03,
    contentPatterns: hasContent ? 0.07 : 0.02, market: hasBriefs ? 0.05 : 0.01,
  };

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const norm = Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, v / total]));
  const weighted = Object.entries(norm).reduce((sum, [k, w]) => sum + (checks[k].score * w), 0);
  const finalScore = Math.min(100, Math.max(0, Math.round(weighted) + trends.modifier));

  const recommendation = finalScore >= 75 ? 'GO' : finalScore >= 55 ? 'CAUTION' : 'RETHINK';

  const findings = [];
  const checkLabels = {
    personality: 'Brand Personality', offBrand: 'Off-Brand Language', hardNos: 'Brand Limits',
    audience: 'Audience Alignment', objective: 'Strategic Objective', momentum: 'Score Momentum',
    calendar: 'Calendar Timing', execution: 'Execution Risk', contentPatterns: 'Content Patterns', market: 'Market Intelligence',
  };

  Object.entries(checks).forEach(([key, result]) => {
    if (result.status === 'fail') findings.push({ severity: 'high', label: checkLabels[key] || key, message: result.message, data: result });
    else if (result.status === 'warning') findings.push({ severity: 'medium', label: checkLabels[key] || key, message: result.message, data: result });
  });

  trends.insights.filter(i => i.type === 'fail' || i.type === 'warning').forEach(i => findings.push({ severity: i.type === 'fail' ? 'high' : 'medium', label: 'Trend Territory', message: i.message }));

  const sortedFindings = findings.sort((a, b) => ({ high: 0, medium: 1 }[a.severity] || 0) - ({ high: 0, medium: 1 }[b.severity] || 0)).filter((f, i, arr) => arr.findIndex(x => x.message === f.message) === i).slice(0, 5);

  const positives = [];
  Object.entries(checks).forEach(([key, result]) => {
    if (result.status === 'pass' && result.message && result.hasData !== false) positives.push({ label: key, message: result.message });
  });
  trends.insights.filter(i => i.type === 'positive').forEach(i => positives.push({ label: 'Trend Territory', message: i.message }));

  const dataPoints = [hasTaskHistory, hasBriefs, hasContent, hasScores, hasTrends].filter(Boolean).length;

  return {
    overallScore: finalScore,
    recommendation,
    recommendationMessage: { GO: 'Campaign is well-aligned with your brand. Proceed with confidence.', CAUTION: 'Some concerns worth addressing before launch. Review findings below.', RETHINK: 'Significant brand alignment issues. Address these before spending budget.' }[recommendation],
    findings: sortedFindings,
    positives: positives.slice(0, 4),
    checks, trends,
    dataConfidence: dataPoints >= 4 ? 'high' : dataPoints >= 2 ? 'medium' : 'low',
    dataPoints, hasTaskHistory, hasBriefs, hasContent, hasScores, hasTrends,
    scoredAt: new Date().toISOString(),
  };
}
