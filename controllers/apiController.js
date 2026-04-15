const { getTeacherIdByEmail } = require('../repositories/teacherRepository');
const {
  getStudentListByEmailList,
  getStudentEmailById,
  getStudentIdByEmail,
  checkIfStudentIsActive,
  suspendStudent
} = require('../repositories/studentRepository');
const { registerStudentToTeacher, getStudentsByTeacherId , checkIfStudentIsRegisteredToTeacher} = require('../repositories/teacherStudentRepository');

async function registerStudent(req, res) {
  const { teacher, students } = req.body;

  if (!teacher || typeof teacher !== 'string') {
    return res.status(400).json({ error: 'Teacher email is required' });
  }
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: 'Students list is required' });
  }

  try {
    const teacherRow = await getTeacherIdByEmail(teacher);
    if (!teacherRow) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const uniqueStudentEmails = [...new Set(students)];
    const studentRows = await getStudentListByEmailList(uniqueStudentEmails);
    if (studentRows.length !== uniqueStudentEmails.length) {
      return res.status(400).json({ error: 'Some students not found' });
    }

    const idByEmail = new Map(studentRows.map((row) => [row.email, row.id]));
    const studentIds = uniqueStudentEmails.map((email) => idByEmail.get(email));
    await registerStudentToTeacher(teacherRow.id, studentIds);
    return res.status(204).send();
  } catch (error) {
    console.error('Error registering student:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error in getting teacher or students' });
  }
}


async function getStudentListByTeacherList(req, res) {
    let teachers = req.query.teacher;
  
    if (!teachers) {
      return res.status(400).json({ error: 'Teacher list is required' });
    }
  
    if (!Array.isArray(teachers)) {
      teachers = [teachers];
    }
  
    try {
      const teacherRows = await Promise.all(
        teachers.map((email) => getTeacherIdByEmail(email))
      );

      const missingIndex = teacherRows.findIndex((row) => !row);
      if (missingIndex !== -1) {
        return res.status(404).json({
          error: `Teacher not found: ${teachers[missingIndex]}`,
        });
      }

      const teacherIds = teacherRows.map((row) => row.id);
      const [firstTeacherId, ...restTeacherIds] = teacherIds;

      const baseStudents = await getStudentsByTeacherId(firstTeacherId);
  
      // Step 3: filter students
      const commonStudents = [];
  
      for (const studentId of baseStudents) {
        let isCommon = true;
  
        for (const teacherId of restTeacherIds) {
          const exists = await checkIfStudentIsRegisteredToTeacher(
            studentId,
            teacherId
          );
  
          if (!exists) {
            isCommon = false;
            break;
          }
        }
  
        if (isCommon) {
          commonStudents.push(studentId);
        }
      }
  
      // Step 4: convert to emails
      const studentEmails = await Promise.all(
        commonStudents.map(id => getStudentEmailById(id))
      );
  
      return res.status(200).json({ students: studentEmails });
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  }



  async function sendNotification(req, res) {
    const { teacher, notification } = req.body;
  
    if (!teacher || typeof teacher !== 'string') {
      return res.status(400).json({ message: 'Teacher email is required.' });
    }
  
    if (!notification || typeof notification !== 'string') {
      return res.status(400).json({ message: 'Notification text is required.' });
    }
  
    try {
      const teacherRow = await getTeacherIdByEmail(teacher);
      if (!teacherRow) {
        return res.status(404).json({ message: 'Teacher not found.' });
      }

      const studentIds = await getStudentsByTeacherId(teacherRow.id);

      const activeStudentIds = [];
      for (const id of studentIds) {
        const isActive = await checkIfStudentIsActive(id);
        if (isActive) activeStudentIds.push(id);
      }

      const registeredEmails = (
        await Promise.all(activeStudentIds.map((id) => getStudentEmailById(id)))
      ).filter(Boolean);

      const mentionedEmails =
        notification.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g) || [];

      const activeMentionedEmails = [];

      for (const email of mentionedEmails) {
        const studentId = await getStudentIdByEmail(email);
        if (!studentId) continue;

        const isActive = await checkIfStudentIsActive(studentId);
        if (isActive) activeMentionedEmails.push(email);
      }

      const recipients = [...new Set([...registeredEmails, ...activeMentionedEmails])];

      return res.status(200).json({ recipients });
    } catch (error) {
      console.error('Error sending notification recipients:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async function suspend(req, res){
    const studentEmail = req.body.student;
    if (!studentEmail || typeof studentEmail !== 'string') {
      return res.status(400).json({ error: 'student email is required.'})
    }
    try
    {
      const studentId = await getStudentIdByEmail(studentEmail);
      if (!studentId) {
        return res.status(404).json({ error: 'student not found.'})
      }
      const isActive = await checkIfStudentIsActive(studentId);
      if (!isActive) {
        return res.status(400).json({ error: 'student is already suspended.'})
      }
      const suspendResult = await suspendStudent(studentId);
      if (!suspendResult) {
        return res.status(500).json({ error: 'Failed to suspend student.'})
      }
      return res.status(204).send({message: 'Student suspended successfully.'});
    }
    catch(error){
      console.error('Error suspending student:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

  }

module.exports = { registerStudent ,getStudentListByTeacherList, sendNotification, suspend};
