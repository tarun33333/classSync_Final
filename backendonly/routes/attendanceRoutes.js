const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/temp_attendance');
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

router.post('/verify-wifi', protect, authorize('student'), attendanceController.verifyWifi);
router.post('/mark', protect, authorize('student'), attendanceController.markAttendance);
router.post('/mark-with-face', protect, authorize('student'), upload.single('image'), attendanceController.markAttendanceWithFace);

router.get('/session/:sessionId', protect, authorize('teacher'), attendanceController.getSessionAttendance);
router.get('/student', protect, authorize('student'), attendanceController.getStudentHistory);
router.get('/dashboard', protect, authorize('student'), attendanceController.getStudentDashboard);
router.get('/stats', protect, authorize('student'), attendanceController.getStudentStats);
router.get('/reports', protect, authorize('teacher'), attendanceController.getTeacherReports);
router.get('/reports/filter', protect, authorize('teacher'), attendanceController.getFilteredReports);
router.post('/report/export', protect, authorize('teacher'), attendanceController.getAttendanceReport);

module.exports = router;
