const { tokenize, splitSentences, makeShingles, normalizeText } = require('../utils/text');

function jaccard(a, b) {
  if (!a.size && !b.size) return 1;
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  const small = a.size <= b.size ? a : b;
  const large = a.size <= b.size ? b : a;
  for (const item of small) if (large.has(item)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

function containment(a, b) {
  if (!a.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection++;
  return intersection / a.size;
}

function diceCoefficient(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const t of a) if (b.has(t)) common++;
  return (2 * common) / (a.size + b.size);
}

function sentenceMatches(sourceText, refText, threshold = 0.72) {
  const sourceSentences = splitSentences(sourceText);
  const refSentences = splitSentences(refText);
  const refPrepared = refSentences.map(s => ({ text: s, tokens: tokenize(s) })).filter(x => x.tokens.length >= 5);
  const result = [];

  for (const sentence of sourceSentences) {
    const st = tokenize(sentence);
    if (st.length < 5) continue;
    let best = null;
    for (const r of refPrepared) {
      const score = diceCoefficient(st, r.tokens);
      if (score >= threshold && (!best || score > best.score)) {
        best = { score, reference: r.text };
      }
    }
    if (best) result.push({ sentence, ...best });
  }

  return result.sort((x, y) => y.score - x.score).slice(0, 50);
}

function compareTexts(sourceText, referenceText, options = {}) {
  const shingleSize = options.shingleSize || 7;
  const sourceTokens = tokenize(sourceText);
  const refTokens = tokenize(referenceText);
  const sourceShingles = makeShingles(sourceTokens, shingleSize);
  const refShingles = makeShingles(refTokens, shingleSize);

  const jac = jaccard(sourceShingles, refShingles);
  const cont = containment(sourceShingles, refShingles);
  const matches = sentenceMatches(sourceText, referenceText, options.sentenceThreshold || 0.72);

  // Containment answers the useful question: what part of the checked work
  // appears in the reference. Jaccard dampens false positives for very large refs.
  const similarity = Math.min(1, cont * 0.8 + jac * 0.2);

  return {
    similarity,
    percent: +(similarity * 100).toFixed(2),
    jaccard: +(jac * 100).toFixed(2),
    containment: +(cont * 100).toFixed(2),
    sourceTokenCount: sourceTokens.length,
    referenceTokenCount: refTokens.length,
    sourceShingleCount: sourceShingles.size,
    matches
  };
}

function aggregateReport(sourceText, comparisons) {
  const sourceTokens = tokenize(sourceText);
  const sourceShingles = makeShingles(sourceTokens, 7);
  const covered = new Set();

  // More defensible aggregate: union of source shingles found in ANY reference.
  for (const c of comparisons) {
    for (const shingle of c.matchedShingles || []) covered.add(shingle);
  }

  const overall = sourceShingles.size ? covered.size / sourceShingles.size : 0;
  return +(overall * 100).toFixed(2);
}

function compareAndCollect(sourceText, referenceText, options = {}) {
  const result = compareTexts(sourceText, referenceText, options);
  const sourceShingles = makeShingles(tokenize(sourceText), options.shingleSize || 7);
  const refShingles = makeShingles(tokenize(referenceText), options.shingleSize || 7);
  result.matchedShingles = [...sourceShingles].filter(x => refShingles.has(x));
  return result;
}

function exactPhraseMatches(sourceText, referenceText, minWords = 8) {
  const source = normalizeText(sourceText);
  const ref = normalizeText(referenceText);
  const sourceWords = source.split(' ');
  const phrases = [];
  for (let i = 0; i <= sourceWords.length - minWords; i++) {
    const phrase = sourceWords.slice(i, i + minWords).join(' ');
    if (phrase.length > 50 && ref.includes(phrase)) phrases.push(phrase);
  }
  return [...new Set(phrases)].slice(0, 100);
}

module.exports = { compareTexts, compareAndCollect, aggregateReport, exactPhraseMatches };
