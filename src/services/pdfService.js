const fs = require('fs/promises');
const pdf = require('pdf-parse');

async function extractPdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdf(buffer);
  return {
    text: data.text || '',
    pages: data.numpages || 0,
    info: data.info || {}
  };
}

module.exports = { extractPdf };
