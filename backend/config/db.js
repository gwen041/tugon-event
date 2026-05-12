'use strict';
const mysql = require('mysql2/promise');

// .env is one folder above backend/
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASS     || '',
  database:           process.env.DB_NAME     || 'tugon_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
});

// Verify on startup
pool.getConnection()
  .then(conn => {
    console.log('✅  MySQL connected →', process.env.DB_NAME || 'tugon_db');
    conn.release();
  })
  .catch(err => {
    console.error('❌  MySQL connection failed:', err.message);
    process.exit(1);
  });

module.exports = pool;
