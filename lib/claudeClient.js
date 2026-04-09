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

export default anthropic;
