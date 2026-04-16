const request = require('supertest');
const app = require('../index');

jest.mock('../repositories/teacherRepository', () => ({
  getTeacherIdByEmail: jest.fn(),
}));

jest.mock('../repositories/studentRepository', () => ({
  getStudentListByEmailList: jest.fn(),
  getStudentEmailById: jest.fn(),
  getStudentIdByEmail: jest.fn(),
  checkIfStudentIsActive: jest.fn(),
  suspendStudent: jest.fn(),
}));

jest.mock('../repositories/teacherStudentRepository', () => ({
  registerStudentToTeacher: jest.fn(),
  getStudentsByTeacherId: jest.fn(),
  checkIfStudentIsRegisteredToTeacher: jest.fn(),
}));

const teacherRepo = require('../repositories/teacherRepository');
const studentRepo = require('../repositories/studentRepository');
const teacherStudentRepo = require('../repositories/teacherStudentRepository');

describe('API user stories and error paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/register', () => {
    test('registers one or more students to a teacher (204)', async () => {
      teacherRepo.getTeacherIdByEmail.mockResolvedValue({ id: 't1' });
      studentRepo.getStudentListByEmailList.mockResolvedValue([
        { id: 's1', email: 'student1@gmail.com' },
        { id: 's2', email: 'student2@gmail.com' },
      ]);
      teacherStudentRepo.registerStudentToTeacher.mockResolvedValue();

      const response = await request(app).post('/api/register').send({
        teacher: 'teacherken@gmail.com',
        students: ['student1@gmail.com', 'student2@gmail.com'],
      });

      expect(response.status).toBe(204);
      expect(teacherStudentRepo.registerStudentToTeacher).toHaveBeenCalledWith(
        't1',
        ['s1', 's2']
      );
    });

    test('returns 400 when teacher is missing', async () => {
      const response = await request(app).post('/api/register').send({
        students: ['student1@gmail.com'],
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Teacher email is required' });
    });

    test('returns 404 when teacher does not exist', async () => {
      teacherRepo.getTeacherIdByEmail.mockResolvedValue(null);

      const response = await request(app).post('/api/register').send({
        teacher: 'missing@gmail.com',
        students: ['student1@gmail.com'],
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Teacher not found' });
    });

    test('deduplicates repeated students in request payload (idempotent input)', async () => {
      teacherRepo.getTeacherIdByEmail.mockResolvedValue({ id: 't1' });
      studentRepo.getStudentListByEmailList.mockResolvedValue([
        { id: 's1', email: 'student1@gmail.com' },
      ]);
      teacherStudentRepo.registerStudentToTeacher.mockResolvedValue();

      const response = await request(app).post('/api/register').send({
        teacher: 'teacherken@gmail.com',
        students: ['student1@gmail.com', 'student1@gmail.com'],
      });

      expect(response.status).toBe(204);
      expect(studentRepo.getStudentListByEmailList).toHaveBeenCalledWith([
        'student1@gmail.com',
      ]);
      expect(teacherStudentRepo.registerStudentToTeacher).toHaveBeenCalledWith(
        't1',
        ['s1']
      );
    });
  });

  describe('GET /api/commonstudents', () => {
    test('returns students common to all teachers (200)', async () => {
      teacherRepo.getTeacherIdByEmail
        .mockResolvedValueOnce({ id: 't1' })
        .mockResolvedValueOnce({ id: 't2' });
      teacherStudentRepo.getStudentsByTeacherId.mockResolvedValue(['s1', 's2']);
      teacherStudentRepo.checkIfStudentIsRegisteredToTeacher
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      studentRepo.getStudentEmailById.mockResolvedValue('commonstudent@gmail.com');

      const response = await request(app)
        .get('/api/commonstudents')
        .query({ teacher: ['teacherken@gmail.com', 'teacherjoe@gmail.com'] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ students: ['commonstudent@gmail.com'] });
    });

    test('returns 400 when teacher query is missing', async () => {
      const response = await request(app).get('/api/commonstudents');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Teacher list is required' });
    });

    test('returns 404 when at least one teacher does not exist', async () => {
      teacherRepo.getTeacherIdByEmail
        .mockResolvedValueOnce({ id: 't1' })
        .mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/commonstudents')
        .query({ teacher: ['teacherken@gmail.com', 'missing@gmail.com'] });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Teacher not found: missing@gmail.com' });
    });
  });

  describe('POST /api/suspend', () => {
    test('suspends a student (204)', async () => {
      studentRepo.getStudentIdByEmail.mockResolvedValue('s1');
      studentRepo.checkIfStudentIsActive.mockResolvedValue(true);
      studentRepo.suspendStudent.mockResolvedValue(true);

      const response = await request(app).post('/api/suspend').send({
        student: 'studentmary@gmail.com',
      });

      expect(response.status).toBe(204);
      expect(studentRepo.suspendStudent).toHaveBeenCalledWith('s1');
    });

    test('returns 404 when student does not exist', async () => {
      studentRepo.getStudentIdByEmail.mockResolvedValue(null);

      const response = await request(app).post('/api/suspend').send({
        student: 'missingstudent@gmail.com',
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'student not found.' });
    });
  });

  describe('POST /api/retrievefornotifications', () => {
    test('returns active recipients from teacher roster and mentions (200)', async () => {
      teacherRepo.getTeacherIdByEmail.mockResolvedValue({ id: 't1' });
      teacherStudentRepo.getStudentsByTeacherId.mockResolvedValue(['s1', 's2']);
      studentRepo.checkIfStudentIsActive
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      studentRepo.getStudentEmailById.mockResolvedValue('studentbob@gmail.com');
      studentRepo.getStudentIdByEmail.mockResolvedValue('s3');

      const response = await request(app).post('/api/retrievefornotifications').send({
        teacher: 'teacherken@gmail.com',
        notification: 'Hello students! @studentagnes@gmail.com',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        recipients: expect.arrayContaining(['studentbob@gmail.com', 'studentagnes@gmail.com']),
      });
      expect(response.body.recipients).toHaveLength(2);
    });

    test('returns 400 when notification is missing', async () => {
      const response = await request(app).post('/api/retrievefornotifications').send({
        teacher: 'teacherken@gmail.com',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Notification text is required.' });
    });

    test('returns 404 when teacher is unknown', async () => {
      teacherRepo.getTeacherIdByEmail.mockResolvedValue(null);

      const response = await request(app).post('/api/retrievefornotifications').send({
        teacher: 'missing@gmail.com',
        notification: 'hello class',
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Teacher not found.' });
    });
  });
});
