const fs = require('fs/promises');
const path = require('path');
const { extractPdf } = require('./pdfService');
const { compareAndCollect, aggregateReport, exactPhraseMatches } = require('./similarityService');

async function getReferenceFiles(referenceDir) {
  const files = await fs.readdir(referenceDir, { withFileTypes: true });
  return files
    .filter(f => f.isFile() && f.name.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(referenceDir, f.name));
}

function originalityFromSimilarity(similarity) {
  return +(100 - similarity).toFixed(2);
}

async function checkPdf({ sourcePath, referenceDir }) {
  const source = await extractPdf(sourcePath);
  if (!source.text || source.text.trim().length < 100) {
    throw new Error('В PDF почти нет извлекаемого текста. Возможно, это скан. Для сканов нужен OCR-модуль.');
  }

  const referenceFiles = await getReferenceFiles(referenceDir);
  const comparisons = [];

  for (const filePath of referenceFiles) {
    if (path.resolve(filePath) === path.resolve(sourcePath)) continue;
    try {
      const ref = await extractPdf(filePath);
      if (!ref.text || ref.text.trim().length < 100) continue;
      const result = compareAndCollect(source.text, ref.text);
      comparisons.push({
        file: path.basename(filePath),
        pages: ref.pages,
        percent: result.percent,
        containment: result.containment,
        jaccard: result.jaccard,
        matches: result.matches,
        exactPhrases: exactPhraseMatches(source.text, ref.text),
        matchedShingles: result.matchedShingles
      });
    } catch (e) {
      comparisons.push({ file: path.basename(filePath), error: e.message, matchedShingles: [] });
    }
  }

  comparisons.sort((a, b) => (b.percent || 0) - (a.percent || 0));
  const similarity = aggregateReport(source.text, comparisons);

  return {
    checkedAt: new Date().toISOString(),
    source: {
      file: path.basename(sourcePath),
      pages: source.pages,
      characters: source.text.length
    },
    referenceCount: referenceFiles.length,
    similarityPercent: similarity,
    originalityPercent: originalityFromSimilarity(similarity),
    verdict: similarity < 10 ? 'Низкий уровень текстовых совпадений' : similarity < 25 ? 'Умеренный уровень текстовых совпадений' : similarity < 50 ? 'Высокий уровень текстовых совпадений' : 'Очень высокий уровень текстовых совпадений',
    comparisons: comparisons.map(({ matchedShingles, ...rest }) => rest),
    methodology: {
      shingleSizeWords: 7,
      sentenceMatchThreshold: 0.72,
      note: 'Это оценка текстового сходства с локальной базой reference-pdfs, а не официальный результат Антиплагиат/Turnitin.'
    }
  };
}

module.exports = { checkPdf };
