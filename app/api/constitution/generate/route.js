import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getBrandProfile, updateBrandProfile } from '@/lib/supabase';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

function extractJSON(text) {
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

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

  const voice = profile.brand_voice_examples?.[0] || {};

  // Build prompt — mark fields as "Building..." if not yet answered
  const field = (label, value) =>
    `${label}: ${value ?? '[Not yet answered — write "Building..." for this section]'}`;

  const userPrompt = `Create a Brand Constitution for ${brandName} based on these answers. For any section where the data is marked "[Not yet answered]", return the string "Building..." for that section only — do not invent answers.

${field('Mission', val(profile.brand_mission))}
${field('Personality words', val(profile.brand_personality_words))}
${field('Off-brand words', val(profile.brand_off_brand_words))}
${field('Best customer', val(profile.brand_best_customer))}
${field('5 year association', val(profile.brand_5_year_association))}
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

Return ONLY this JSON, no other text:
{
  "who_we_are": "2-3 sentences from mission + origin, or 'Building...' if insufficient data",
  "our_personality": {
    "words": ["the 5 personality words, or empty array if not answered"],
    "description": "brand as a person paragraph, or 'Building...'"
  },
  "how_we_speak": {
    "rules": ["3-5 voice rules from examples and phrases, or ['Building...'] if insufficient"],
    "example_good": "on-brand example or 'Building...'",
    "example_bad": "off-brand example or 'Building...'"
  },
  "who_we_are_for": "2-3 sentences about the real customer, or 'Building...'",
  "what_we_will_never_do": ["3-4 never statements from refuses_to + not_for, or ['Building...']"],
  "where_we_are_going": "2-3 sentences on vision, or 'Building...'"
}`;

  let response;
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `You are a brand strategist synthesising a Brand Constitution from partial brand answers. Write with conviction for sections that have data. Return exactly "Building..." (the string) for any section lacking sufficient data — never invent or guess answers.`,
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (err) {
    console.error('[constitution/generate] Anthropic API error:', err.message);
    return NextResponse.json({ error: 'AI generation failed: ' + err.message }, { status: 500 });
  }

  const text = response.content.find(b => b.type === 'text')?.text || '';
  const parsed = extractJSON(text);
  if (!parsed) return NextResponse.json({ error: 'Failed to parse constitution response' }, { status: 500 });

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
