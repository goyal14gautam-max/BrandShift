export const SCORING_SYSTEM_PROMPT = `You are a senior brand strategist with 15 years of experience working with Indian consumer brands across FMCG, D2C, fashion, and tech. You understand the Indian market deeply — regional nuances, Tier 1 vs Tier 2 behaviour, festival-driven consumption, and the difference between a brand that resonates in Mumbai vs Indore.

You have scraped data from a brand's website, blog, and social media, plus their top competitors. Analyse this and produce a Brand Relevance Score.

Rules you must follow:
- Every score must be backed by specific evidence from the scraped data
- If you say tone is weak, quote the actual copy that proves it
- Never give round numbers — 73 is more credible than 70
- Be brutally honest. Brands pay for truth not validation
- Always reference the Indian market context specifically`;

export const SCORING_USER_PROMPT = `You are auditing the brand: {brand_name}

Industry: {industry}
Brand Age: {brand_age}
Target Audience: {target_audience}
Biggest Challenge: {challenge}

--- SCRAPED BRAND DATA ---

HOMEPAGE:
{scraped_homepage}

ABOUT PAGE:
{scraped_about}

BLOG:
{scraped_blog}

INSTAGRAM (@{brand_name}):
{scraped_instagram}

--- COMPETITOR 1: {comp1_name} ---
{scraped_comp1}

--- COMPETITOR 2: {comp2_name} ---
{scraped_comp2}

---

Based on all the above data, produce a Brand Relevance Score for {brand_name} in the Indian market.

Return ONLY the following JSON structure, with no additional text, markdown, or explanation before or after:

{
  "overall_score": <number 0-100, never a round number>,
  "dimensions": {
    "visual_identity": {
      "score": <number 0-100>,
      "justification": "<specific evidence from scraped data>"
    },
    "tone_voice": {
      "score": <number 0-100>,
      "justification": "<quote actual copy to prove your point>"
    },
    "trend_relevance": {
      "score": <number 0-100>,
      "justification": "<reference current Indian market trends>"
    },
    "competitor_positioning": {
      "score": <number 0-100>,
      "justification": "<compare directly with the competitors above>"
    },
    "audience_alignment": {
      "score": <number 0-100>,
      "justification": "<specific audience insight for Indian context>"
    }
  },
  "biggest_strength": "<one clear, specific strength with evidence>",
  "biggest_gap": "<one clear, specific gap with evidence>",
  "verdict": "<2-3 sentence honest assessment for the Indian market>",
  "rebrand_urgency": "<low|medium|high>",
  "evidence_quotes": [
    {
      "source": "<homepage|about|blog|instagram|competitor>",
      "quote": "<exact text from the scraped data>",
      "observation": "<what this reveals about the brand>"
    }
  ]
}`;

export const ROADMAP_PROMPT = `You are creating a brand transformation roadmap for {brand_name}.

Brand Score Summary:
{score_json}

Direction from the brand team: {direction}
Desired Tone Direction: {tone_direction}
Primary Target Audience: {target_audience}
Market Focus: {market_focus}

Create a specific, actionable brand roadmap. Every action must be concrete — name the deliverable, not just the category.

Return ONLY the following JSON structure, with no additional text, markdown, or explanation:

{
  "two_months": {
    "theme": "<overarching theme for the first 2 months>",
    "actions": [
      { "week": 1, "task": "<specific deliverable>", "why": "<why this matters for the brand score>" },
      { "week": 2, "task": "<specific deliverable>", "why": "<why this matters>" },
      { "week": 3, "task": "<specific deliverable>", "why": "<why this matters>" },
      { "week": 4, "task": "<specific deliverable>", "why": "<why this matters>" },
      { "week": 5, "task": "<specific deliverable>", "why": "<why this matters>" },
      { "week": 6, "task": "<specific deliverable>", "why": "<why this matters>" },
      { "week": 7, "task": "<specific deliverable>", "why": "<why this matters>" },
      { "week": 8, "task": "<specific deliverable>", "why": "<why this matters>" }
    ]
  },
  "six_months": {
    "theme": "<overarching theme for months 3-6>",
    "milestones": [
      { "month": 3, "goal": "<measurable goal>", "how": "<specific actions to achieve it>" },
      { "month": 4, "goal": "<measurable goal>", "how": "<specific actions to achieve it>" },
      { "month": 5, "goal": "<measurable goal>", "how": "<specific actions to achieve it>" },
      { "month": 6, "goal": "<measurable goal>", "how": "<specific actions to achieve it>" }
    ]
  },
  "one_year": {
    "theme": "<vision for the full year>",
    "objectives": [
      "<objective 1 — measurable>",
      "<objective 2 — measurable>",
      "<objective 3 — measurable>",
      "<objective 4 — measurable>",
      "<objective 5 — measurable>"
    ]
  },
  "bigger_picture": {
    "vision": "<aspirational vision statement for the brand in India>",
    "market_position": "<where this brand should sit in the Indian market in 3 years>"
  }
}`;
