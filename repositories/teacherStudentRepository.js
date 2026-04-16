const { pool } = require('../db/connection');

async function registerStudentToTeacher(teacherId, studentIds) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const studentId of studentIds) {
      const [existingRows] = await connection.execute(
        'SELECT 1 FROM teacher_student WHERE teacher_id = ? AND student_id = ? LIMIT 1',
        [teacherId, studentId]
      );

      // Idempotent registration: if link already exists, skip insert.
      if (existingRows.length > 0) {
        continue;
      }

      await connection.execute(
        `INSERT INTO teacher_student (id, teacher_id, student_id)
         VALUES (UUID_TO_BIN(UUID(), 1), ?, ?)`,
        [teacherId, studentId]
      );
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}


async function getStudentsByTeacherId(teacherId) {
  const query = 'SELECT student_id FROM teacher_student WHERE teacher_id = ?';
  const [rows] = await pool.execute(query, [teacherId]);
  return rows.map(row => row.student_id);
}

async function checkIfStudentIsRegisteredToTeacher(studentId, teacherId) {
  const query = 'SELECT * FROM teacher_student WHERE student_id = ? AND teacher_id = ?';
  const [rows] = await pool.execute(query, [studentId, teacherId]);
  return rows.length > 0;
}
module.exports = { registerStudentToTeacher, getStudentsByTeacherId ,checkIfStudentIsRegisteredToTeacher};
