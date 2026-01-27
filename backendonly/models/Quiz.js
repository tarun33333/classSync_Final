const mongoose = require('mongoose');

const quizSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    topic: {
        type: String,
        required: true
    },
    questions: [
        {
            question: { type: String, required: true },
            options: [{ type: String, required: true }],
            correctAnswer: { type: Number, required: true } // Index 0-3
        }
    ],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    code: {
        type: String,
        unique: true,
        sparse: true
    },
    status: {
        type: String,
        enum: ['WAITING', 'LIVE', 'ENDED'], // WAITING = Lobby, LIVE = Questions, ENDED = Finished
        default: 'WAITING'
    },
    isActive: { // Keeping for backward compatibility checking
        type: Boolean,
        default: false
    },
    participants: [
        {
            studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: String,
            joinedAt: { type: Date, default: Date.now }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Quiz', quizSchema);
