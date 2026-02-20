const express = require('express');
const router = express.Router();
const { register, login, updateProfilePhoto, updateTheme } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
const { protect } = require('../middlewares/authMiddleware');
router.get('/verify', protect, require('../controllers/authController').verify);
router.put('/profile-photo', protect, updateProfilePhoto);
router.put('/theme', protect, updateTheme);

module.exports = router;
