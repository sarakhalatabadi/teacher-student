const { pool } = require('../db/connection');

async function getTeacherIdByEmail(email) {
  const query = 'SELECT id FROM teacher WHERE email = ?';
  const [rows] = await pool.execute(query, [email]);
  return rows[0] ?? null;
}

module.exports = { getTeacherIdByEmail };
