const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { chatWithDocument, generateQuiz } = require('../controllers/aiController');
const { protect } = require('../middlewares/authMiddleware');

// Configure Multer for temp storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)) // Append extension
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Chat Route (with file upload)
router.post('/chat', protect, upload.single('doc'), chatWithDocument);

// Quiz Route
// Quiz Route
router.post('/quiz', protect, upload.single('doc'), generateQuiz);

module.exports = router;
