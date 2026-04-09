import { NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claudeClient';
import { getBrandProfile, updateBrandProfile } from '@/lib/supabase';

// The 15 questions delivered via daily pulse
const DAILY_QUEUE = [
  { field: 'brand_origin_story',      label: 'Why did this brand start? Not the official answer — the real one.' },
  { field: 'brand_refuses_to',        label: 'What would have to be true for you to shut this brand down tomorrow?' },
  { field: 'brand_person_description',label: 'If your brand were a person, who would it be? Not a celebrity — describe the person.' },
  { field: 'brand_party_behaviour',   label: 'Your brand walks into a party. What happens?' },
  { field: 'voice_good',              label: 'Write a caption for a product launch the way your brand would actually write it.' },
  { field: 'voice_bad',               label: 'Now write the same caption the way your brand would NEVER write it.' },
  { field: 'brand_owned_phrases',     label: 'What are words or phrases your brand uses that no one else does?' },
  { field: 'brand_cringe_phrases',    label: 'What are words or phrases that make you cringe when other brands use them?' },
  { field: 'brand_customer_belief',   label: "What does your best customer believe that most people don't?" },
  { field: 'brand_customer_feeling',  label: 'What does your customer want to feel when they buy from you?' },
  { field: 'brand_not_for',           label: 'Who is your brand NOT for? Be specific and honest.' },
  { field: 'brand_10_year_dream',     label: 'What do you want to be famous for in 5 years? One sentence.' },
  { field: 'brand_admired_brand',     label: 'Name one brand outside your category whose identity you deeply respect.' },
  { field: 'brand_competitive_edge',  label: 'What is the one thing your competitors are too scared to do or say that you could own?' },
  { field: 'brand_irreplaceability',  label: 'If your brand disappeared tomorrow, what would your best customers genuinely miss?' },
];

const SYSTEM_PROMPT = `You are a brand strategist generating a Brand Constitution document.

CRITICAL RULES:
1. You MUST respond with ONLY valid JSON
2. Do NOT include any text before or after the JSON
3. Do NOT use markdown code fences
4. Do NOT explain your response
5. Do NOT apologise or add commentary
6. Start your response with { and end with }
7. If you cannot complete any field, use an empty string "" — never null
8. Every string value must be in double quotes
9. Every array must use square brackets

Write with conviction for sections that have data. Return exactly "Building..." (the string) for any section lacking sufficient data — never invent or guess answers.

Your entire response must be parseable by JSON.parse() with no preprocessing.`;

function val(v) {
  if (Array.isArray(v)) return v.length ? v.join(', ') : null;
  return v || null;
}

export async function POST(request) {
  const { brandName, coreAnswers } = await request.json();
  console.log('[constitution/generate] brandName:', brandName, '| has coreAnswers:', !!coreAnswers);
  if (!brandName) return NextResponse.json({ error: 'brandName required' }, { status: 400 });

  // Save core answers first if passed directly from form
  if (coreAnswers) {
    try {
      await updateBrandProfile(brandName, coreAnswers);
      console.log('[constitution/generate] core answers saved to Supabase');
    } catch (err) {
      console.error('[constitution/generate] failed to save core answers:', err.message);
    }
  }

  const profile = await getBrandProfile(brandName);
  if (!profile) return NextResponse.json({ error: 'Brand profile not found' }, { status: 404 });

  // Prefer fresh coreAnswers over potentially stale profile fields
  const core = coreAnswers || {};
  const voice = profile.brand_voice_examples?.[0] || {};

  const field = (label, value) =>
    `${label}: ${value ?? '[Not yet answered — write "Building..." for this section]'}`;

  const userPrompt = `Create a Brand Constitution for ${brandName} based on these answers. For any section where the data is marked "[Not yet answered]", return the string "Building..." for that section only — do not invent answers.

${field('Mission', val(core.brand_mission ?? profile.brand_mission))}
${field('Personality words', val(core.brand_personality_words ?? profile.brand_personality_words))}
${field('Off-brand words', val(core.brand_off_brand_words ?? profile.brand_off_brand_words))}
${field('Best customer', val(core.brand_best_customer ?? profile.brand_best_customer))}
${field('5 year association', val(core.brand_5_year_association ?? profile.brand_5_year_association))}
${field('Origin story', val(profile.brand_origin_story))}
${field('Refuses to', val(profile.brand_refuses_to))}
${field('Brand as a person', val(profile.brand_person_description))}
${field('Brand at a party', val(profile.brand_party_behaviour))}
${field('Good voice example', val(voice.good))}
${field('Bad voice example', val(voice.bad))}
${field('Owned phrases', val(profile.brand_owned_phrases))}
${field('Cringe phrases', val(profile.brand_cringe_phrases))}
${field('Customer belief', val(profile.brand_customer_belief))}
${field('Customer feeling', val(profile.brand_customer_feeling))}
${field('Not for', val(profile.brand_not_for))}
${field('5 year fame', val(profile.brand_10_year_dream))}
${field('Admired brand', val(profile.brand_admired_brand))}
${field('Competitive edge', val(profile.brand_competitive_edge))}
${field('Irreplaceability', val(profile.brand_irreplaceability))}

RESPOND WITH ONLY THIS JSON STRUCTURE. NO OTHER TEXT. START WITH { END WITH }:
{
  "who_we_are": "2-3 sentences from mission + origin, or Building...",
  "our_personality": {
    "words": ["the 5 personality words, or empty array"],
    "description": "brand as a person paragraph, or Building..."
  },
  "how_we_speak": {
    "rules": ["3-5 voice rules from examples and phrases"],
    "example_good": "on-brand example or Building...",
    "example_bad": "off-brand example or Building..."
  },
  "who_we_are_for": "2-3 sentences about the real customer, or Building...",
  "what_we_will_never_do": ["3-4 never statements from refuses_to + not_for"],
  "where_we_are_going": "2-3 sentences on vision, or Building..."
}`;

  let parsed;
  try {
    parsed = await callClaudeJSON({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }, 3);
  } catch (err) {
    console.error('[constitution/generate] All attempts failed:', err.message);

    // Fallback: build partial constitution from user inputs
    parsed = {
      who_we_are: val(core.brand_mission ?? profile.brand_mission) || 'Building...',
      our_personality: {
        words: core.brand_personality_words ?? profile.brand_personality_words ?? [],
        description: 'Building...',
      },
      how_we_speak: {
        rules: ['Building...'],
        example_good: val(voice.good) || 'Building...',
        example_bad: val(voice.bad) || 'Building...',
      },
      who_we_are_for: val(core.brand_best_customer ?? profile.brand_best_customer) || 'Building...',
      what_we_will_never_do: ['Building...'],
      where_we_are_going: val(core.brand_5_year_association ?? profile.brand_5_year_association) || 'Building...',
      _partial: true,
    };
    console.log('[constitution/generate] Using fallback partial constitution');
  }

  try {
    await updateBrandProfile(brandName, {
      brand_constitution:     parsed,
      constitution_completed: true,
      constitution_queue:     DAILY_QUEUE,
    });
    console.log('[constitution/generate] constitution saved to Supabase');
  } catch (err) {
    console.error('[constitution/generate] Supabase save error:', err.message);
  }

  return NextResponse.json(parsed);
}
