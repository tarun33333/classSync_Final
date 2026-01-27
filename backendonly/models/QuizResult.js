const mongoose = require('mongoose');

const quizResultSchema = mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    answers: [
        {
            questionIndex: Number,
            selectedOption: Number,
            isCorrect: Boolean
        }
    ],
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent multiple submissions for the same quiz instance? 
// For now, allow multiple, maybe teacher wants them to retry. 
// Or valid standard: One submission per student per quiz.
// quizResultSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('QuizResult', quizResultSchema);
