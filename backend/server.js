'use strict';
const path    = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');

const app = express();

/* ── Core middleware ────────────────────────────────────── */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Serve the frontend ─────────────────────────────────── */
// Everything inside ../frontend/ is served statically.
// e.g.  /pages/login.html, /styles/home.css, /assets/icons/icon.png
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// Also serve the root index.html redirect
app.use(express.static(path.join(__dirname, '..')));

/* ── API routes ─────────────────────────────────────────── */
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/admin',  require('./routes/admin'));

/* ── Root → login ───────────────────────────────────────── */
app.get('/', (_req, res) => res.redirect('/pages/login.html'));

/* ── 404 ────────────────────────────────────────────────── */
app.use((req, res) => {
  if (req.path.startsWith('/api'))
    return res.status(404).json({ error: 'API route not found.' });
  res.status(404).redirect('/pages/login.html');
});

/* ── Global error handler ───────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Unhandled]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

/* ── Start ──────────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀  TUGON server running → http://localhost:${PORT}`);
  console.log(`    Student login  : http://localhost:${PORT}/pages/login.html`);
  console.log(`    Admin panel    : http://localhost:${PORT}/pages/admin_dashboard.html\n`);
});
