import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callClaude(params, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Claude attempt ${attempt} of ${maxRetries}`);
      return await anthropic.messages.create(params);
    } catch (err) {
      lastError = err;
      console.error(`Claude attempt ${attempt} failed:`, err.message);

      const shouldRetry =
        err.status === 529 ||
        err.status === 429 ||
        err.message?.includes('overloaded') ||
        err.message?.includes('rate_limit');

      if (shouldRetry && attempt < maxRetries) {
        const wait = attempt * 3000;
        console.log(`Waiting ${wait}ms before retry...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

/**
 * Bulletproof JSON extraction from Claude responses.
 * Handles markdown fences, trailing commas, control chars, etc.
 */
export function extractJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response from AI');
  }

  // Remove markdown code fences
  let cleaned = rawText
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();

  // Try 1 — parse directly
  try { return JSON.parse(cleaned); } catch {}

  // Try 2 — find JSON object anywhere
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }

  // Try 3 — find JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch {}
  }

  // Try 4 — fix common JSON issues
  try {
    const fixed = cleaned
      .replace(/,(\s*[}\]])/g, '$1')   // trailing commas
      .replace(/'/g, '"')               // single quotes
      .replace(/[\x00-\x1F\x7F]/g, ' '); // control chars
    const fixedMatch = fixed.match(/\{[\s\S]*\}/);
    if (fixedMatch) {
      return JSON.parse(fixedMatch[0]);
    }
  } catch {}

  console.error('Could not extract JSON from:', rawText.slice(0, 200));
  throw new Error('AI returned an unexpected format. Please try again.');
}

/**
 * Call Claude and extract JSON from the response, with retry on parse failure.
 * Use for routes that need structured JSON output.
 */
export async function callClaudeJSON(params, maxAttempts = 3) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const response = await callClaude(params);
      const raw = response.content.find(b => b.type === 'text')?.text || '';
      console.log(`JSON extraction attempt ${i}, raw length: ${raw.length}`);

      const data = extractJSON(raw);

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON shape');
      }

      return data;
    } catch (err) {
      console.error(`callClaudeJSON attempt ${i} failed:`, err.message);

      if (i < maxAttempts) {
        const wait = i * 2000;
        console.log(`Waiting ${wait}ms before JSON retry...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      throw err;
    }
  }
}

export default anthropic;
