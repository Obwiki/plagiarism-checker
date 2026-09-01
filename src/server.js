const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const { checkPdf } = require('./services/checkerService');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, '..');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const REFERENCE_DIR = path.join(ROOT, 'reference-pdfs');
const REPORT_DIR = path.join(ROOT, 'reports');

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, '_')}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) cb(null, true);
    else cb(new Error('Можно загружать только PDF'));
  }
});

app.use(express.json());
app.use(express.static(path.join(ROOT, 'public')));

app.get('/api/status', async (_, res) => {
  const refs = (await fs.readdir(REFERENCE_DIR)).filter(x => x.toLowerCase().endsWith('.pdf'));
  res.json({ ok: true, referencePdfCount: refs.length });
});

app.post('/api/check', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'PDF не загружен' });
  try {
    const report = await checkPdf({ sourcePath: req.file.path, referenceDir: REFERENCE_DIR });
    const reportName = `report-${Date.now()}.json`;
    await fs.writeFile(path.join(REPORT_DIR, reportName), JSON.stringify(report, null, 2), 'utf8');
    res.json({ ...report, reportFile: reportName });
  } catch (e) {
    res.status(422).json({ error: e.message });
  } finally {
    await fs.unlink(req.file.path).catch(() => {});
  }
});

app.get('/api/reports/:name', async (req, res) => {
  const safeName = path.basename(req.params.name);
  if (!safeName.endsWith('.json')) return res.status(400).json({ error: 'Некорректное имя отчета' });
  res.sendFile(path.join(REPORT_DIR, safeName));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Ошибка запроса' });
});

app.listen(PORT, () => {
  console.log(`Plagiarism checker: http://localhost:${PORT}`);
  console.log(`Reference PDFs: ${REFERENCE_DIR}`);
});
