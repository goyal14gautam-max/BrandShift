import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = false;

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    console.log('Loading semantic model...');
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
    console.log('Semantic model ready');
  }
  return embedder;
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getEmbedding(text) {
  const model = await getEmbedder();
  const result = await model(
    text.slice(0, 300),
    { pooling: 'mean', normalize: true }
  );
  return Array.from(result.data);
}

export async function getSimilarity(text1, text2) {
  try {
    const [emb1, emb2] = await Promise.all([
      getEmbedding(text1),
      getEmbedding(text2),
    ]);
    return cosineSimilarity(emb1, emb2);
  } catch (err) {
    console.error('Similarity error:', err.message);
    return 0;
  }
}

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
};

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

  // PASS 3 — Semantic similarity
  try {
    const score = await getSimilarity(textLower, wordLower);
    if (score >= semanticThreshold) {
      return { matched: true, via: 'semantic', word, matchedAs: word, confidence: score >= 0.8 ? 'high' : 'medium', score };
    }
  } catch (err) {
    console.error('Semantic fallback failed:', err.message);
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
