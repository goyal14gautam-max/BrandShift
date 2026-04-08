// Pure JS semantic similarity — no native dependencies
// Uses synonym dictionary + n-gram overlap for intelligent matching

export const SYNONYMS = {
  'bold': ['daring','brave','powerful','confident','fearless','assertive','strong','gutsy','audacious'],
  'fun': ['playful','entertaining','amusing','lively','joyful','cheerful','light-hearted','witty','spirited'],
  'innovative': ['creative','pioneering','original','cutting-edge','modern','fresh','disruptive','forward-thinking','revolutionary'],
  'premium': ['luxury','high-end','exclusive','upscale','elite','superior','finest','crafted','artisanal','top-tier'],
  'authentic': ['genuine','real','honest','transparent','true','sincere','original','raw','unfiltered','pure'],
  'expert': ['professional','knowledgeable','authoritative','specialist','skilled','experienced','proven','qualified','credible'],
  'friendly': ['warm','approachable','welcoming','caring','supportive','kind','helpful','inclusive','open'],
  'youthful': ['young','energetic','vibrant','fresh','trendy','hip','cool','millennial','gen-z','dynamic'],
  'serious': ['professional','formal','corporate','stern','solemn','no-nonsense','business-like','focused'],
  'cheap': ['affordable','budget','low-cost','economical','value','inexpensive','pocket-friendly','frugal','bargain'],
  'discount': ['sale','offer','deal','markdown','clearance','promotional','reduced','saving','cut-price'],
  'aggressive': ['pushy','hard-sell','pressure','urgent','hurry','limited time','act now','dont miss out','rush'],
  'generic': ['ordinary','common','standard','typical','average','regular','basic','nothing special','bland'],
  'humour': ['funny','joke','comedy','laugh','hilarious','witty','pun','meme','sarcastic','satirical','comic'],
  'fear': ['scare','worry','anxiety','danger','threat','warning','beware','risk','alarming','frightening'],
  'luxury': ['premium','exclusive','high-end','opulent','lavish','indulgent','sophisticated','elite','upscale'],
  'community': ['tribe','together','collective','belonging','family','movement','squad','crew','people'],
  'festival': ['diwali','holi','eid','navratri','durga puja','onam','pongal','celebration','occasion','festive'],
  'empowerment': ['strong','independent','confident','unstoppable','powerful','fearless','own it','boss','leader'],
  'trust': ['reliable','dependable','safe','secure','credible','proven','trusted','tested','guaranteed'],
  'minimal': ['clean','simple','understated','subtle','elegant','refined','less is more','stripped back'],
  'rebellious': ['edgy','punk','anti-establishment','counterculture','provocative','unconventional','rule-breaking'],
  'nostalgic': ['retro','vintage','classic','throwback','heritage','timeless','old-school','traditional'],
  'sustainable': ['eco','green','organic','ethical','conscious','responsible','planet','earth-friendly','recyclable'],
  'indian': ['desi','swadeshi','bharat','hindustani','local','homegrown','made in india','indian-made'],
};

// Build a reverse lookup: synonym -> parent word
const REVERSE_SYNONYMS = {};
Object.entries(SYNONYMS).forEach(([parent, syns]) => {
  syns.forEach(s => {
    if (!REVERSE_SYNONYMS[s]) REVERSE_SYNONYMS[s] = [];
    REVERSE_SYNONYMS[s].push(parent);
  });
});

// N-gram based text similarity (pure JS, no ML model)
function ngramSet(text, n = 2) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const grams = new Set();
  words.forEach(w => {
    for (let i = 0; i <= w.length - n; i++) grams.add(w.slice(i, i + n));
  });
  return grams;
}

function jaccardSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  setA.forEach(g => { if (setB.has(g)) intersection++; });
  return intersection / (setA.size + setB.size - intersection);
}

// Word overlap similarity (bag of words)
function wordOverlap(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  if (!words1.size || !words2.size) return 0;
  let overlap = 0;
  words1.forEach(w => { if (words2.has(w)) overlap++; });
  return overlap / Math.min(words1.size, words2.size);
}

export async function getSimilarity(text1, text2) {
  const ngramScore = jaccardSimilarity(ngramSet(text1), ngramSet(text2));
  const overlapScore = wordOverlap(text1, text2);
  // Weighted combination
  return ngramScore * 0.4 + overlapScore * 0.6;
}

export async function smartMatch(campaignText, word, semanticThreshold = 0.65) {
  const textLower = campaignText.toLowerCase();
  const wordLower = word.toLowerCase();

  // PASS 1 — Direct string match
  if (textLower.includes(wordLower)) {
    return { matched: true, via: 'direct', word, matchedAs: word, confidence: 'high', score: 1.0 };
  }

  // PASS 2 — Synonym map (instant)
  const synonyms = SYNONYMS[wordLower] || [];
  const synonymMatch = synonyms.find(syn => textLower.includes(syn.toLowerCase()));
  if (synonymMatch) {
    return { matched: true, via: 'synonym', word, matchedAs: synonymMatch, confidence: 'high', score: 0.9 };
  }

  // PASS 2b — Reverse synonym lookup (check if word is a synonym of something in the text)
  const textWords = textLower.split(/\s+/);
  const parents = REVERSE_SYNONYMS[wordLower] || [];
  const reverseMatch = parents.find(p => textLower.includes(p));
  if (reverseMatch) {
    return { matched: true, via: 'synonym', word, matchedAs: reverseMatch, confidence: 'high', score: 0.85 };
  }

  // PASS 2c — Cross-check: any text word is a synonym of our target word
  for (const tw of textWords) {
    if (tw.length < 3) continue;
    const twSyns = SYNONYMS[tw] || [];
    if (twSyns.includes(wordLower)) {
      return { matched: true, via: 'synonym', word, matchedAs: tw, confidence: 'high', score: 0.85 };
    }
  }

  // PASS 3 — N-gram + word overlap similarity (pure JS, no ML)
  try {
    const score = await getSimilarity(textLower, wordLower);
    if (score >= semanticThreshold) {
      return { matched: true, via: 'semantic', word, matchedAs: word, confidence: score >= 0.8 ? 'high' : 'medium', score };
    }
  } catch (err) {
    console.error('Similarity fallback failed:', err.message);
  }

  return { matched: false, word, score: 0 };
}

export async function matchWordList(campaignText, wordList = [], threshold = 0.65) {
  if (!wordList.length) return { matched: [], missing: [], matchRate: 0 };

  const results = await Promise.all(
    wordList.map(word => smartMatch(campaignText, word, threshold))
  );

  const matched = results.filter(r => r.matched);
  const missing = results.filter(r => !r.matched).map(r => r.word);

  return { matched, missing, matchRate: matched.length / wordList.length, results };
}
