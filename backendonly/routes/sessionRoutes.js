const express = require('express');
const router = express.Router();
const { startSession, endSession, getActiveSession, refreshQrCode } = require('../controllers/sessionController');
const { protect, teacherOnly } = require('../middlewares/authMiddleware');

router.post('/start', protect, teacherOnly, startSession);
router.post('/end', protect, teacherOnly, endSession);
router.get('/active', protect, teacherOnly, getActiveSession);
router.post('/refresh-qr', protect, teacherOnly, refreshQrCode);

module.exports = router;
