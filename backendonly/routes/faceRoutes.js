const express = require('express');
const router = express.Router();
const faceController = require('../controllers/faceController');
const multer = require('multer');
const path = require('path');
const { protect } = require('../middlewares/authMiddleware');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/temp_faces');
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

router.post('/register', protect, upload.single('image'), faceController.registerFace);
router.post('/verify', protect, upload.single('image'), faceController.verifyFace);

module.exports = router;
