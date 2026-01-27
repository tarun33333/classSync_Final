const express = require('express');
const router = express.Router();
const {
    createQuiz, hostQuiz, joinQuiz, submitQuiz, getQuizResults, endQuiz,
    getMyQuizzes, updateQuiz, deleteQuiz, startQuizSession, getQuizStatus
} = require('../controllers/quizController');
const { protect } = require('../middlewares/authMiddleware');

// Teacher Routes
router.post('/create', protect, createQuiz);
router.get('/teacher', protect, getMyQuizzes); // Get all my quizzes
router.put('/:id', protect, updateQuiz); // Update quiz
router.delete('/:id', protect, deleteQuiz); // Delete quiz
router.post('/host/:id', protect, hostQuiz); // Generate code & start lobby
router.post('/start/:id', protect, startQuizSession); // Start the game (Lobby -> Live)
router.get('/status/:id', protect, getQuizStatus); // Poll status/participants
router.get('/results/:id', protect, getQuizResults); // Live leaderboard
router.post('/end/:id', protect, endQuiz); // Stop quiz

// Student Routes
router.post('/join', protect, joinQuiz); // Enter code
router.post('/submit', protect, submitQuiz); // Send answers

module.exports = router;
