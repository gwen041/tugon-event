'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');
const { authStudent } = require('../middleware/auth');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

/* ──────────────────────────────────────────────────────────
   POST /api/auth/signup
   Body: { student_id, first_name, last_name, email, password,
           college, course?, major?, year_level }
────────────────────────────────────────────────────────── */
router.post('/signup', async (req, res) => {
  const {
    student_id, first_name, last_name,
    email, password, college,
    course, major, year_level,
  } = req.body;

  // Required field check
  if (!student_id || !first_name || !last_name || !email || !password || !college || !year_level) {
    return res.status(400).json({ error: 'All required fields must be filled in.' });
  }

  /* Email must be @plpasig.edu.ph */
  const emailLower = (email || '').trim().toLowerCase();
  if (!emailLower.endsWith('@plpasig.edu.ph')) {
    return res.status(400).json({ error: 'Email must be a @plpasig.edu.ph address.' });
  }

  /* Student ID: only digits and hyphens */
  if (!/^[0-9-]+$/.test((student_id || '').trim())) {
    return res.status(400).json({ error: 'Student ID must contain only numbers.' });
  }

  const VALID_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  if (!VALID_YEARS.includes(year_level)) {
    return res.status(400).json({ error: 'Invalid year level.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.execute(
      `INSERT INTO students
         (student_id, first_name, last_name, email, password,
          college, course, major, year_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id.trim(),
        first_name.trim(),
        last_name.trim(),
        email.trim().toLowerCase(),
        hash,
        college,
        course || null,
        major  || null,
        year_level,
      ],
    );
    return res.status(201).json({ message: 'Account created! You can now log in.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.message.includes('uq_student_email'))
        return res.status(409).json({ error: 'That email is already registered.' });
      if (err.message.includes('uq_student_id_num'))
        return res.status(409).json({ error: 'That Student ID is already registered.' });
    }
    console.error('[signup]', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /api/auth/login
   Body: { email, password }
   Returns: { token, student: { id, name, email, college,
              course, major, year_level } }
────────────────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM students WHERE email = ?',
      [email.trim().toLowerCase()],
    );
    if (!rows.length)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const student = rows[0];
    const match   = await bcrypt.compare(password, student.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign(
      {
        id:         student.id,
        email:      student.email,
        college:    student.college,
        year_level: student.year_level,
        name: `${student.first_name} ${student.last_name}`,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );

    return res.json({
      token,
      student: {
        id:         student.id,
        name:       `${student.first_name} ${student.last_name}`,
        first_name: student.first_name,
        last_name:  student.last_name,
        email:      student.email,
        college:    student.college,
        course:     student.course,
        major:      student.major,
        year_level: student.year_level,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /api/auth/logout  (stateless — just a signal)
────────────────────────────────────────────────────────── */
router.post('/logout', (_req, res) => res.json({ message: 'Logged out.' }));

/* ──────────────────────────────────────────────────────────
   GET /api/auth/profile  – fetch current student data
────────────────────────────────────────────────────────── */
router.get('/profile', authStudent, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, student_id, first_name, last_name, email, college, course, major, year_level FROM students WHERE id = ?',
      [req.student.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[GET /auth/profile]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

/* ──────────────────────────────────────────────────────────
   PUT /api/auth/profile  – update student info, returns new token
────────────────────────────────────────────────────────── */
router.put('/profile', authStudent, async (req, res) => {
  const { first_name, last_name, email, college, course, major, year_level } = req.body;
  if (!first_name || !last_name || !email || !college || !year_level)
    return res.status(400).json({ error: 'Required fields missing.' });

  const VALID_YEARS    = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const VALID_COLLEGES = ['Education', 'Computer Studies', 'Nursing', 'Engineering',
                          'Arts and Science', 'Business and Accountancy', 'Hospitality Management'];
  if (!VALID_YEARS.includes(year_level))
    return res.status(400).json({ error: 'Invalid year level.' });
  if (!VALID_COLLEGES.includes(college))
    return res.status(400).json({ error: 'Invalid college.' });

  try {
    await pool.execute(
      `UPDATE students SET first_name=?, last_name=?, email=?, college=?, course=?, major=?, year_level=? WHERE id=?`,
      [first_name.trim(), last_name.trim(), email.trim().toLowerCase(),
       college, course || null, major || null, year_level, req.student.id],
    );
    const [rows] = await pool.execute('SELECT * FROM students WHERE id=?', [req.student.id]);
    const s = rows[0];
    const newToken = jwt.sign(
      { id: s.id, email: s.email, college: s.college, year_level: s.year_level,
        name: `${s.first_name} ${s.last_name}` },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );
    return res.json({
      token: newToken,
      student: {
        id:         s.id,
        name:       `${s.first_name} ${s.last_name}`,
        first_name: s.first_name,
        last_name:  s.last_name,
        email:      s.email,
        college:    s.college,
        course:     s.course,
        major:      s.major,
        year_level: s.year_level,
      },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'That email is already registered.' });
    console.error('[PUT /auth/profile]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
