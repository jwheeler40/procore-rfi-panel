import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as procore from './procore.js';
import { extractFromPdf } from './extract.js';
import { targets } from './targets/index.js';

const app = express();
const upload = multer({ limits: { fileSize: 30 * 1024 * 1024 } });
app.use(express.json());
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), '../public')));

// ---- Auth: popup OAuth; the panel keeps a random session id (no third-party cookies needed in the iframe)
app.post('/auth/start', (_req, res) => {
  const sid = crypto.randomBytes(24).toString('hex');
  procore.startSession(sid);
  res.json({ sid, url: procore.authUrl(sid) });
});
app.get('/auth/callback', async (req, res) => {
  try {
    if (!procore.hasPending(req.query.state)) throw new Error('Unknown session');
    await procore.completeSession(req.query.state, req.query.code);
    res.send('<script>opener&&opener.postMessage("procore-auth-ok","*");close()</script>Signed in. You can close this window.');
  } catch (e) { res.status(400).send('Sign-in failed: ' + e.message); }
});

// ---- API
const guard = (req, res, next) => {
  const sid = (req.headers.authorization || '').replace('Bearer ', '');
  if (!procore.isSignedIn(sid)) return res.status(401).json({ error: 'Sign in to Procore' });
  req.ctx = {
    target: targets[req.params.target],
    companyId: req.query.company_id || req.body?.company_id,
    projectId: req.query.project_id || req.body?.project_id,
  };
  if (!req.ctx.target) return res.status(404).json({ error: 'Unknown target' });
  req.p = procore.clientFor(sid, req.ctx.companyId);
  next();
};
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => res.status(e.status || 500).json({ error: e.message }));

app.get('/api/targets', (_req, res) =>
  res.json(Object.values(targets).map(({ id, label, fields, supportsAppend }) => ({ id, label, fields, supportsAppend }))));

app.post('/api/extract', upload.single('file'), wrap(async (req, res) => {
  const t = targets[req.body.target];
  if (!t || !req.file) return res.status(400).json({ error: 'Missing file or target' });
  if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ error: 'Only PDF files are supported' });
  res.json({ fields: await extractFromPdf(req.file.buffer, t) });
}));

app.get('/api/:target/items', guard, wrap(async (req, res) => {
  const items = await req.ctx.target.list(req.p, req.ctx);
  res.json(items.map((i) => ({ id: i.id, label: req.ctx.target.itemLabel(i), subject: i.subject })));
}));
app.post('/api/:target/create', guard, wrap(async (req, res) => res.json(await req.ctx.target.create(req.p, req.ctx, req.body.fields))));
app.post('/api/:target/append/:id', guard, wrap(async (req, res) => res.json(await req.ctx.target.append(req.p, req.ctx, req.params.id, req.body.fields))));

app.listen(process.env.PORT || 3000, () => console.log('Panel running on :' + (process.env.PORT || 3000)));
