/**
 * Removes lone Unicode surrogate characters that cause JSON parse errors
 * in the Anthropic API (e.g. from malformed UTF-16 in scraped HTML).
 */
function stripLoneSurrogates(str) {
  // Replace any lone high or low surrogate with the replacement character
  return str.replace(/[\uD800-\uDFFF]/g, '\uFFFD');
}

/**
 * Cleans markdown/scraped text by removing noise, duplicates, and boilerplate.
 */
export function cleanMarkdown(text) {
  if (!text || typeof text !== 'string') return '';

  // Must run before any other processing — lone surrogates break JSON
  text = stripLoneSurrogates(text);

  const lines = text.split('\n');
  const seen = new Set();
  const cleaned = [];

  // Sections to strip (footer boilerplate)
  const footerTriggers = [
    'Order & Support',
    'Information',
    'Contact Us',
    'Caution Notice',
    'Report Fraud',
  ];

  // Regex patterns for lines to drop
  const dropPatterns = [
    /^\s*\[!\[/,                            // lines starting with [![
    /^\s*!\[/,                              // lines starting with ![
    /cdn\.shopify\.com/,                    // Shopify CDN
    /cloudfront\.net/,                      // CloudFront CDN
    /App Store|Google Play|Download on the/, // App store badges
    /kwikpass|gokwik/i,                     // kwikpass/gokwik lines
    /^\s*https?:\/\/\S+\s*$/,              // bare URL lines
  ];

  // Track whether we are inside the language-selection block
  let inLangBlock = false;
  // Track whether we are in a footer block
  let inFooter = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // --- Language block suppression ---
    if (/Select Language/i.test(trimmed)) {
      inLangBlock = true;
    }
    if (inLangBlock) {
      if (/Google Translate/i.test(trimmed)) {
        inLangBlock = false; // consume "Google Translate" line and resume
      }
      continue;
    }

    // --- Footer block suppression ---
    if (!inFooter && footerTriggers.some(t => trimmed.startsWith(t))) {
      inFooter = true;
    }
    if (inFooter) continue;

    // --- Pattern-based line drops ---
    if (dropPatterns.some(p => p.test(line))) continue;

    // --- Duplicate paragraph suppression ---
    if (trimmed.length > 30) {
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
    }

    cleaned.push(line);
  }

  return cleaned.join('\n').trim();
}
