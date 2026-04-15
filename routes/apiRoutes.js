const express = require('express');
const {
  registerStudent,
  getStudentListByTeacherList,
  sendNotification,
  suspend,
} = require('../controllers/apiController');

const router = express.Router();

router.post('/register', registerStudent);
router.get('/commonstudents', getStudentListByTeacherList);
router.post('/retrievefornotifications', sendNotification);
router.post('/suspend', suspend);

module.exports = router;
