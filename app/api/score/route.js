import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/claudeClient';

export const maxDuration = 60;
import { SCORING_SYSTEM_PROMPT, SCORING_USER_PROMPT } from '@/lib/prompts';
import { saveAudit, getBrandProfile, createBrandProfile, saveScoreToHistory } from '@/lib/supabase';

function fillPrompt(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? '');
}

async function callClaudeForScore(prompt) {
  const response = await callClaude({
    model: 'claude-sonnet-5',
    max_tokens: 3000,
    system: SCORING_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content.find(b => b.type === 'text')?.text || '';
}

function tagEvidenceSentiment(quotes) {
  if (!Array.isArray(quotes)) return quotes;
  const positiveWords = [
    'strong', 'good', 'great', 'excellent', 'consistent', 'effective',
    'high', 'above', 'well', 'clear', 'distinctive',
  ];
  const negativeWords = [
    'weak', 'poor', 'lack', 'missing', 'generic', 'inconsistent', 'low',
    'below', 'unclear', 'absent', 'fails', 'drops', 'hurts', 'gap', 'problem',
  ];
  return quotes.map(q => {
    const text = ((q.observation || '') + ' ' + (q.quote || '')).toLowerCase();
    const posScore = positiveWords.filter(w => text.includes(w)).length;
    const negScore = negativeWords.filter(w => text.includes(w)).length;
    return { ...q, sentiment: negScore > posScore ? 'negative' : 'positive' };
  });
}

function extractJSON(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {}
  // Try extracting JSON block
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }
  return null;
}

// Build a constitution context from a brand profile (reads c_* first, falls
// back to legacy brand_* columns). Returns null if no constitution data exists.
function buildConstitutionContext(profile) {
  if (!profile) return null;

  const pick = (cKey, legacyKey, fallback = '') =>
    profile[cKey] ?? profile[legacyKey] ?? fallback;

  const pickArr = (cKey, legacyKey) => {
    const cVal = profile[cKey];
    if (Array.isArray(cVal) && cVal.length > 0) return cVal;
    const lVal = profile[legacyKey];
    if (Array.isArray(lVal) && lVal.length > 0) return lVal;
    return [];
  };

  const personalityWords = pickArr('c_personality_words', 'brand_personality_words');
  const offBrandWords    = pickArr('c_off_brand_words', 'brand_off_brand_words');
  const refusesTo        = pickArr('c_refuses_to', 'brand_refuses_to');
  const ownedPhrases     = pickArr('c_owned_phrases', 'brand_owned_phrases');
  const cringePhrases    = pickArr('c_cringe_phrases', 'brand_cringe_phrases');

  const hasAny =
    personalityWords.length > 0 || offBrandWords.length > 0 ||
    !!pick('c_best_customer', 'brand_best_customer') ||
    !!pick('c_mission', 'brand_mission');

  if (!hasAny) return null;

  return {
    personalityWords: personalityWords.join(', ') || 'Not defined',
    offBrandWords:    offBrandWords.join(', ')    || 'Not defined',
    bestCustomer:     pick('c_best_customer', 'brand_best_customer', 'Not defined'),
    refusesTo:        refusesTo.join(', ')        || 'Not defined',
    competitiveEdge:  pick('c_competitive_edge', 'brand_competitive_edge', 'Not defined'),
    mission:          pick('c_mission', 'brand_mission', 'Not defined'),
    ownedPhrases:     ownedPhrases.join(', ')     || 'None defined',
    cringePhrases:    cringePhrases.join(', ')    || 'None defined',
  };
}

function buildConstitutionPromptBlock(ctx) {
  if (!ctx) return 'BRAND CONSTITUTION: Not completed yet';
  return `BRAND CONSTITUTION DATA:
This brand has completed their Brand Constitution. Use this to inform your scoring — especially Brand Voice, Audience Alignment, and Competitor Positioning dimensions.

Personality words: ${ctx.personalityWords}
Words they refuse to be: ${ctx.offBrandWords}
Their best customer: ${ctx.bestCustomer}
What they refuse to do: ${ctx.refusesTo}
Their competitive edge: ${ctx.competitiveEdge}
Brand mission: ${ctx.mission}
Owned phrases: ${ctx.ownedPhrases}
Cringe phrases: ${ctx.cringePhrases}`;
}

function buildVoiceCheck(ctx) {
  if (!ctx) return 'CONSTITUTION CHECK FOR BRAND VOICE: No constitution data available.';
  return `CONSTITUTION CHECK FOR BRAND VOICE:
Personality words defined: ${ctx.personalityWords}
Check scraped content for these words or their synonyms.
  +5 if found in Instagram captions or website copy.
  -5 if NOT found anywhere (brand says one thing and communicates another).

Cringe phrases to avoid: ${ctx.cringePhrases}
  -8 if any cringe phrase appears in scraped content. Quote the specific phrase found.

Owned phrases: ${ctx.ownedPhrases}
  +5 if any owned phrase appears in scraped content.`;
}

function buildAudienceCheck(ctx) {
  if (!ctx) return 'CONSTITUTION CHECK FOR AUDIENCE: No constitution data available.';
  return `CONSTITUTION CHECK FOR AUDIENCE:
Brand's described best customer: "${ctx.bestCustomer}"

Compare this description to what the scraped content actually targets.
  +10 strong match (same life stage, values, language).
  No adjustment for partial match.
  -10 mismatch — targeting different person than described. Flag this explicitly in the justification.`;
}

export async function POST(request) {
  try {
  const body = await request.json();
  const {
    brandName, industry, brandAge, targetAudience, challenge,
    scraped_homepage, scraped_about, scraped_blog, scraped_instagram,
    scraped_linkedin,
    comp1Name, scraped_comp1, comp2Name, scraped_comp2,
  } = body;

  // Fetch existing profile to pull constitution data (if any)
  let existingProfile = null;
  try {
    existingProfile = await getBrandProfile(brandName);
  } catch (err) {
    console.log('Pre-score profile fetch failed (will continue without constitution data):', err.message);
  }

  const constitutionContext = buildConstitutionContext(existingProfile);
  console.log('Constitution context:', constitutionContext ? 'available' : 'not available');

  const filledPrompt = fillPrompt(SCORING_USER_PROMPT, {
    brand_name: brandName,
    industry,
    brand_age: brandAge,
    target_audience: targetAudience,
    challenge,
    scraped_homepage:  scraped_homepage  || 'No data',
    scraped_about:     scraped_about     || 'No data',
    scraped_blog:      scraped_blog      || 'No data',
    scraped_instagram: scraped_instagram || 'No data',
    scraped_linkedin:  scraped_linkedin  || 'Not provided',
    comp1_name:  comp1Name  || 'Competitor 1',
    scraped_comp1: scraped_comp1 || 'No data',
    comp2_name:  comp2Name  || 'Competitor 2',
    scraped_comp2: scraped_comp2 || 'No data',
    constitution_block:        buildConstitutionPromptBlock(constitutionContext),
    constitution_check_voice:    buildVoiceCheck(constitutionContext),
    constitution_check_audience: buildAudienceCheck(constitutionContext),
  });

  let text = await callClaudeForScore(filledPrompt);
  let parsed = extractJSON(text);

  // Retry once if parsing failed
  if (!parsed) {
    text = await callClaudeForScore(filledPrompt);
    parsed = extractJSON(text);
  }

  if (!parsed) {
    return NextResponse.json({ error: 'Failed to parse score response' }, { status: 500 });
  }

  try {
    await saveAudit({
      brandName, industry, brandAge, targetAudience, challenge,
      websiteUrl: body.websiteUrl || '',
      instagramHandle: body.instagramHandle || '',
      scraped_homepage, scraped_about, scraped_blog, scraped_instagram,
      scraped_comp1, scraped_comp2,
      scoreData: parsed,
    });
  } catch (err) {
    console.error('saveAudit failed:', err.message);
  }

  let brandProfileId = null;
  try {
    const existing = existingProfile || await getBrandProfile(brandName);
    if (!existing) {
      brandProfileId = await createBrandProfile({
        brandName,
        industry,
        brandAge,
        targetAudience,
        websiteUrl:      body.websiteUrl      || '',
        instagramHandle: body.instagramHandle || '',
        marketFocus:     body.marketFocus     || '',
        competitors: [
          { name: body.comp1Name || '', url: body.comp1Url || '' },
          { name: body.comp2Name || '', url: body.comp2Url || '' },
        ].filter(c => c.name || c.url),
      });
    } else {
      brandProfileId = existing.id;
    }
    await saveScoreToHistory(brandName, parsed);
  } catch (err) {
    console.error('brand_profiles save failed:', err.message);
  }

  if (parsed.evidence_quotes) {
    parsed.evidence_quotes = tagEvidenceSentiment(parsed.evidence_quotes);
  }

  // ── Competitor dimension scoring (optional) ───────────────────
  if (comp1Name && scraped_comp1) {
    try {
      const competitorPrompt = `You are scoring a competitor brand for comparison purposes only.

Competitor name: ${comp1Name}
Competitor scraped content:
${scraped_comp1.slice(0, 2000)}

Main brand being compared against: ${brandName}
Main brand scores for reference:
${JSON.stringify(parsed.dimensions)}

Score the competitor on the same 5 dimensions. Be consistent with how you scored the main brand. Use the same scale.

Return ONLY this JSON, no other text:
{
  "visual_identity": number,
  "tone_voice": number,
  "trend_relevance": number,
  "competitor_positioning": number,
  "audience_alignment": number
}`;

      const compRes = await callClaude({
        model: 'claude-sonnet-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: competitorPrompt }],
      });
      const compText = compRes.content.find(b => b.type === 'text')?.text || '';
      const compParsed = extractJSON(compText);
      if (compParsed) {
        parsed.competitor_scores = { name: comp1Name, dimensions: compParsed };
      }
    } catch (err) {
      console.error('Competitor scoring failed (non-critical):', err.message);
    }
  }

  return NextResponse.json({ ...parsed, brandProfileId });
  } catch (err) {
    console.error('Score API error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
