const express = require('express');
const router = express.Router();
const { getTeacherRoutines, getTeacherTimetable, getStudentTimetable, getTeacherClasses } = require('../controllers/routineController');
const { protect, teacherOnly } = require('../middlewares/authMiddleware');

router.get('/teacher', protect, teacherOnly, getTeacherRoutines);
router.get('/teacher/full', protect, teacherOnly, getTeacherTimetable);
router.get('/teacher/classes', protect, teacherOnly, getTeacherClasses);
router.get('/student/full', protect, getStudentTimetable);

module.exports = router;
