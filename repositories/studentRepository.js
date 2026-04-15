const { pool } = require('../db/connection');

async function getStudentListByEmailList(emailList) {
  if (emailList.length === 0) {
    return [];
  }
  const placeholders = emailList.map(() => '?').join(',');
  const query = `SELECT id, email FROM student WHERE email IN (${placeholders})`;
  const [rows] = await pool.execute(query, emailList);
  return rows;
}

async function getStudentEmailById(id) {
  const [rows] = await pool.execute('SELECT email FROM student WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  return rows[0].email;
}

async function checkIfStudentIsActive(id) {
  const [rows] = await pool.execute('SELECT is_suspended FROM student WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  // Support schemas where active may be stored as NULL or FALSE/0.
  return !Boolean(rows[0].is_suspended);
}

async function getStudentIdByEmail(email){
  const query = 'SELECT id FROM student WHERE email = ?';
  const [row] = await pool.execute(query, [email]);
  if (row.length === 0) return null;
  return row[0].id;
}

async function suspendStudent(studentId){
  const query = 'UPDATE student SET is_suspended = TRUE WHERE id = ? AND (is_suspended = FALSE OR is_suspended IS NULL)';
  const [rows] = await pool .execute(query, [studentId]);
  return rows.affectedRows > 0;
}

module.exports = { getStudentListByEmailList, getStudentEmailById, checkIfStudentIsActive , getStudentIdByEmail , suspendStudent};
