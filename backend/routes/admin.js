'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');
const { authAdmin } = require('../middleware/auth');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

function parseJSON(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return []; }
}

const uploadDir = path.join(__dirname, '../../frontend/assets/uploads/events');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `event-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files are allowed (jpg, png, webp, gif).'));
  },
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required.' });

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM admins WHERE username = ?', [username.trim()],
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'admin' },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '8h' },
    );
    return res.json({ token, admin: { id: admin.id, username: admin.username } });
  } catch (err) {
    console.error('[admin/login]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/events', authAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT e.*, COUNT(r.event_id) AS registration_count
      FROM events e
      LEFT JOIN registrations r ON r.event_id = e.id
      GROUP BY e.id
      ORDER BY e.date ASC, e.start_time ASC
    `);
    return res.json(rows.map(e => ({
      ...e,
      target_colleges:    parseJSON(e.target_colleges),
      target_years:       parseJSON(e.target_years),
      registration_count: Number(e.registration_count) || 0,
    })));
  } catch (err) {
    console.error('[GET admin/events]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/events/:id', authAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT e.*, COUNT(r.event_id) AS registration_count
       FROM events e
       LEFT JOIN registrations r ON r.event_id = e.id
       WHERE e.id = ?
       GROUP BY e.id`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Event not found.' });
    const e = rows[0];
    return res.json({
      ...e,
      target_colleges:    parseJSON(e.target_colleges),
      target_years:       parseJSON(e.target_years),
      registration_count: Number(e.registration_count) || 0,
    });
  } catch (err) {
    console.error('[GET admin/events/:id]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/events', authAdmin, upload.single('event_image'), async (req, res) => {
  let {
    title, description, date, start_time, end_time,
    location, category, capacity,
    target_colleges, target_years,
  } = req.body;

  if (!title || !date || !target_colleges || !target_years) {
    return res.status(400).json({
      error: 'title, date, target_colleges, and target_years are required.',
    });
  }

  const colleges = Array.isArray(target_colleges) ? target_colleges : parseJSON(target_colleges);
  const years    = Array.isArray(target_years)    ? target_years    : parseJSON(target_years);

  if (!colleges.length) return res.status(400).json({ error: 'Select at least one target college.' });
  if (!years.length)    return res.status(400).json({ error: 'Select at least one target year level.' });

  const image_url = req.file
    ? `/assets/uploads/events/${req.file.filename}`
    : null;

  try {
    const [result] = await pool.execute(
      `INSERT INTO events
         (title, description, date, start_time, end_time, location,
          category, capacity, target_colleges, target_years,
          image_url, is_featured, featured_scope)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
      [
        title.trim(),
        description || null,
        date,
        start_time  || null,
        end_time    || null,
        location    || null,
        category    || null,
        capacity    ? Number(capacity) : null,
        JSON.stringify(colleges),
        JSON.stringify(years),
        image_url,
      ],
    );
    return res.status(201).json({ id: result.insertId, message: 'Event published.' });
  } catch (err) {
    console.error('[POST admin/events]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/events/:id', authAdmin, upload.single('event_image'), async (req, res) => {
  const { id } = req.params;
  let {
    title, description, date, start_time, end_time,
    location, category, capacity,
    target_colleges, target_years,
  } = req.body;

  if (!title || !date || !target_colleges || !target_years) {
    return res.status(400).json({
      error: 'title, date, target_colleges, and target_years are required.',
    });
  }

  const colleges = Array.isArray(target_colleges) ? target_colleges : parseJSON(target_colleges);
  const years    = Array.isArray(target_years)    ? target_years    : parseJSON(target_years);

  if (!colleges.length) return res.status(400).json({ error: 'Select at least one target college.' });
  if (!years.length)    return res.status(400).json({ error: 'Select at least one target year level.' });

  try {
    let sql, params;
    if (req.file) {
      const image_url = `/assets/uploads/events/${req.file.filename}`;
      sql = `UPDATE events SET
               title = ?, description = ?, date = ?, start_time = ?, end_time = ?,
               location = ?, category = ?, capacity = ?,
               target_colleges = ?, target_years = ?, image_url = ?
             WHERE id = ?`;
      params = [
        title.trim(), description || null, date,
        start_time || null, end_time || null,
        location || null, category || null,
        capacity ? Number(capacity) : null,
        JSON.stringify(colleges), JSON.stringify(years),
        image_url, id,
      ];
    } else {
      sql = `UPDATE events SET
               title = ?, description = ?, date = ?, start_time = ?, end_time = ?,
               location = ?, category = ?, capacity = ?,
               target_colleges = ?, target_years = ?
             WHERE id = ?`;
      params = [
        title.trim(), description || null, date,
        start_time || null, end_time || null,
        location || null, category || null,
        capacity ? Number(capacity) : null,
        JSON.stringify(colleges), JSON.stringify(years),
        id,
      ];
    }
    const [result] = await pool.execute(sql, params);
    if (!result.affectedRows) return res.status(404).json({ error: 'Event not found.' });
    return res.json({ message: 'Event updated.' });
  } catch (err) {
    console.error('[PUT admin/events/:id]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/events/:id/pin', authAdmin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── Look up the event's audience settings to determine scope ──────────
    const [evts] = await conn.execute(
      'SELECT id, target_colleges, target_years FROM events WHERE id = ?',
      [req.params.id],
    );
    if (!evts.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Event not found.' });
    }

    const cols    = parseJSON(evts[0].target_colleges);
    const years   = parseJSON(evts[0].target_years);

    // Global pin: event created for ALL colleges AND ALL years
    const isGlobal = cols.includes('All') && years.includes('All');

    // featured_scope stored in DB:
    //   'All'                    → global pin (overrides everything, visible to every student)
    //   'Computer Studies'       → only that college sees the featured event
    //   'Computer Studies,Nursing' → multiple specific colleges
    const scope = isGlobal ? 'All' : (cols.length ? cols.join(',') : 'Unknown');

    // ── Step 1: Unpin ALL currently-pinned events (enforce single-pin rule) ─
    await conn.execute(
      'UPDATE events SET is_featured = 0, featured_scope = NULL WHERE is_featured = 1',
    );

    // ── Step 2: Pin the selected event with its determined scope ────────────
    await conn.execute(
      'UPDATE events SET is_featured = 1, featured_scope = ? WHERE id = ?',
      [scope, req.params.id],
    );

    await conn.commit();
    return res.json({
      message: isGlobal
        ? 'Event pinned as featured for all colleges and all years.'
        : `Event pinned as featured for: ${scope}.`,
    });
  } catch (err) {
    await conn.rollback();
    console.error('[PUT admin/events/:id/pin]', err);
    return res.status(500).json({ error: 'Server error.' });
  } finally {
    conn.release();
  }
});

router.put('/events/:id/unpin', authAdmin, async (req, res) => {
  try {
    const [r] = await pool.execute(
      'UPDATE events SET is_featured = 0, featured_scope = NULL WHERE id = ?', [req.params.id],
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Event not found.' });
    return res.json({ message: 'Event unpinned.' });
  } catch (err) {
    console.error('[PUT admin/events/:id/unpin]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/events/:id', authAdmin, async (req, res) => {
  try {
    const [r] = await pool.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Event not found.' });
    return res.json({ message: 'Event deleted.' });
  } catch (err) {
    console.error('[DELETE admin/events/:id]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/registrations', authAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT r.registration_date,
             s.id AS student_db_id, s.student_id AS student_number,
             s.first_name, s.last_name, s.email,
             s.college, s.course, s.major, s.year_level,
             e.id AS event_id, e.title AS event_title,
             e.date AS event_date, e.category
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      JOIN events   e ON r.event_id   = e.id
      ORDER BY e.date ASC, r.registration_date DESC
    `);
    return res.json(rows);
  } catch (err) {
    console.error('[GET admin/registrations]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/registrations/:eventId', authAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT s.id AS student_db_id, s.student_id AS student_number,
             s.first_name, s.last_name, s.email,
             s.college, s.course, s.major, s.year_level,
             r.registration_date
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      WHERE r.event_id = ?
      ORDER BY r.registration_date ASC
    `, [req.params.eventId]);
    return res.json(rows);
  } catch (err) {
    console.error('[GET admin/registrations/:eventId]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/students', authAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, student_id, first_name, last_name, email,
             college, course, major, year_level, created_at
      FROM students ORDER BY created_at DESC
    `);
    return res.json(rows);
  } catch (err) {
    console.error('[GET admin/students]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
