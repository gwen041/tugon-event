'use strict';
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

/** Pull Bearer token from Authorization header or a named cookie */
function extractToken(req, cookieName) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);

  // Simple cookie parsing without cookie-parser
  const raw = req.headers.cookie || '';
  const m   = raw.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Protect student routes */
function authStudent(req, res, next) {
  const token = extractToken(req, 'tugon_token');
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    req.student = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

/** Protect admin routes */
function authAdmin(req, res, next) {
  const token = extractToken(req, 'tugon_admin_token');
  if (!token) return res.status(401).json({ error: 'Admin authentication required.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
    if (decoded.role !== 'admin') throw new Error('not admin');
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired admin session.' });
  }
}

module.exports = { authStudent, authAdmin };
