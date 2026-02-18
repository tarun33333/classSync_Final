const express = require('express');
const router = express.Router();
const {
    getTeacherRoutines,
    getTeacherTimetable,
    getStudentTimetable,
    getTeacherClasses,
    getAllRoutines,
    createRoutine,
    updateRoutine,
    deleteRoutine
} = require('../controllers/routineController');
const { protect, teacherOnly } = require('../middlewares/authMiddleware');
const { protectAdmin } = require('../middlewares/adminMiddleware');

router.get('/teacher', protect, teacherOnly, getTeacherRoutines);
router.get('/teacher/full', protect, teacherOnly, getTeacherTimetable);
router.get('/teacher/classes', protect, teacherOnly, getTeacherClasses);
router.get('/student/full', protect, getStudentTimetable);

// Admin Routes
router.route('/')
    .get(protectAdmin, getAllRoutines)
    .post(protectAdmin, createRoutine);

router.route('/:id')
    .put(protectAdmin, updateRoutine)
    .delete(protectAdmin, deleteRoutine);

module.exports = router;
