import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { brandName } = await request.json();

    const { data: profile, error } = await supabaseAdmin
      .from('brand_profiles')
      .select('*')
      .ilike('brand_name', brandName)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const prompt = `You are writing a Brand Bible for ${brandName}.

Here are their answers to key brand questions:

PERSONALITY WORDS: ${(profile.c_personality_words || []).join(', ')}
WORDS THEY REFUSE TO BE: ${(profile.c_off_brand_words || []).join(', ')}
THEIR BEST CUSTOMER: ${profile.c_best_customer || 'Not provided'}
WHAT THEY REFUSE TO DO: ${(profile.c_refuses_to || []).join(', ')}
5-YEAR VISION: ${profile.c_5_year_vision || 'Not provided'}
ORIGIN STORY: ${profile.c_origin_story || 'Not provided'}
IF THE BRAND WERE A PERSON: ${profile.c_person_description || 'Not provided'}
PHRASES THEY OWN: ${(profile.c_owned_phrases || []).join(', ')}
PHRASES THEY CRINGE AT: ${(profile.c_cringe_phrases || []).join(', ')}
NOT FOR: ${profile.c_not_for || 'Not provided'}
COMPETITIVE EDGE: ${profile.c_competitive_edge || 'Not provided'}
MISSION: ${profile.c_mission || 'Not provided'}

Write a Brand Bible with these sections:

1. WHO WE ARE (2-3 sentences, present tense, first person plural)
2. WHO WE ARE NOT (2-3 sentences, clear boundaries)
3. WHO WE SERVE (1 paragraph, describe the customer as a person not demographics)
4. HOW WE SPEAK (5 bullet points, specific voice rules)
5. WHAT WE STAND FOR (3-4 sentences, values and mission)
6. WHAT WE WILL NEVER DO (3-5 bullet points, hard limits)
7. OUR COMPETITIVE EDGE (2-3 sentences)
8. ON-BRAND EXAMPLE (One example sentence written in this brand's voice)
9. OFF-BRAND EXAMPLE (One example sentence that violates this brand's voice)

Write in a clear, direct style. Use the brand's actual words where possible.
Make it feel specific to this brand — not generic.

Return plain text with section headers in ALL CAPS followed by a colon.
No markdown, no JSON, no formatting. Just clean readable text.`;

    let bibleContent = '';
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Bible generation attempt ${attempts}`);

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }],
        });

        bibleContent = response.content[0].text;
        break;
      } catch (err) {
        console.error(`Attempt ${attempts} failed:`, err.message);
        if (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, attempts * 2000));
        } else {
          throw err;
        }
      }
    }

    await supabaseAdmin
      .from('brand_profiles')
      .update({
        c_bible_content: bibleContent,
        c_bible_generated_at: new Date().toISOString(),
        c_completed: true,
        c_completed_at: new Date().toISOString(),
      })
      .ilike('brand_name', brandName);

    return NextResponse.json({ success: true, bibleContent });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
