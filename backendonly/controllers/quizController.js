const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const User = require('../models/User');

// @desc    Create a new Quiz (from AI or Manual)
// @route   POST /api/quiz/create
// @access  Private (Teacher)
const createQuiz = async (req, res) => {
    try {
        const { title, topic, questions } = req.body;

        const quiz = await Quiz.create({
            title,
            topic,
            questions,
            createdBy: req.user._id,
        });

        res.status(201).json(quiz);
    } catch (error) {
        console.error('Create Quiz Error:', error);
        res.status(500).json({ message: 'Failed to save quiz' });
    }
};

// @desc    Activate/Host a Quiz (Generate Code)
// @route   POST /api/quiz/host/:id
// @access  Private (Teacher)
// @desc    Activate/Host a Quiz (Generate Code)
// @route   POST /api/quiz/host/:id
// @access  Private (Teacher)
const hostQuiz = async (req, res) => {
    try {
        const quizId = req.params.id;

        // Generate valid 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        const quiz = await Quiz.findByIdAndUpdate(
            quizId,
            { isActive: true, status: 'WAITING', code: code, participants: [] }, // Reset participants on new host
            { new: true }
        );

        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        res.json({ message: 'Quiz lobby open!', code: quiz.code, quiz });

    } catch (error) {
        console.error('Host Quiz Error:', error);
        res.status(500).json({ message: 'Failed to host quiz' });
    }
};

// @desc    Student joins a quiz using code
// @route   POST /api/quiz/join
// @access  Private (Student)
const joinQuiz = async (req, res) => {
    try {
        const { code } = req.body;
        // Find quiz by code and ensure it's either WAITING or LIVE
        const quiz = await Quiz.findOne({
            code,
            status: { $in: ['WAITING', 'LIVE'] }
        }).select('-questions.correctAnswer');

        if (!quiz) {
            return res.status(404).json({ message: 'Invalid code or quiz ended.' });
        }

        // Add student to participants if not already joined
        const isParticipant = quiz.participants.some(p => p.studentId.toString() === req.user._id.toString());
        if (!isParticipant) {
            quiz.participants.push({
                studentId: req.user._id,
                name: req.user.name
            });
            await quiz.save();
        }

        res.json(quiz); // Returns status 'WAITING' or 'LIVE'

    } catch (error) {
        console.error('Join Quiz Error:', error);
        res.status(500).json({ message: 'Failed to join quiz' });
    }
};

// @desc    Worker: Change status from WAITING to LIVE
// @route   POST /api/quiz/start/:id
// @access  Private (Teacher)
const startQuizSession = async (req, res) => {
    try {
        const quizId = req.params.id;
        const quiz = await Quiz.findByIdAndUpdate(
            quizId,
            { status: 'LIVE' },
            { new: true }
        );
        res.json({ message: 'Quiz Started!', status: 'LIVE' });
    } catch (error) {
        res.status(500).json({ message: 'Error starting quiz' });
    }
};

// @desc    Polling: Get Status & Participants
// @route   GET /api/quiz/status/:id
// @access  Private (Teacher/Student)
const getQuizStatus = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id).select('status participants code questions.length');
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching status' });
    }
};

// @desc    Submit Quiz Answers
// @route   POST /api/quiz/submit
// @access  Private (Student)
const submitQuiz = async (req, res) => {
    try {
        const { quizId, answers } = req.body;
        // answers: [{ questionIndex: 0, selectedOption: 1 }, ...]

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        let score = 0;
        const resultsDetails = [];

        answers.forEach(ans => {
            const question = quiz.questions[ans.questionIndex];
            if (question) {
                const isCorrect = question.correctAnswer === ans.selectedOption;
                if (isCorrect) score++;

                resultsDetails.push({
                    questionIndex: ans.questionIndex,
                    selectedOption: ans.selectedOption,
                    isCorrect
                });
            }
        });

        const result = await QuizResult.create({
            quizId,
            studentId: req.user._id,
            score,
            total: quiz.questions.length,
            answers: resultsDetails
        });

        res.json({ score, total: quiz.questions.length, resultId: result._id });

    } catch (error) {
        console.error('Submit Quiz Error:', error);
        res.status(500).json({ message: 'Failed to submit quiz' });
    }
};

// @desc    Get Live Results/Stats for a Quiz
// @route   GET /api/quiz/results/:id
// @access  Private (Teacher)
const getQuizResults = async (req, res) => {
    try {
        const quizId = req.params.id;
        const results = await QuizResult.find({ quizId })
            .populate('studentId', 'name email rollNumber')
            .sort({ score: -1 });

        res.json(results);
    } catch (error) {
        console.error('Get Results Error:', error);
        res.status(500).json({ message: 'Failed to get results' });
    }
};

// @desc    End/Stop a Quiz
// @route   POST /api/quiz/end/:id
// @access  Private (Teacher)
const endQuiz = async (req, res) => {
    try {
        const quizId = req.params.id;
        await Quiz.findByIdAndUpdate(quizId, { isActive: false, code: null });
        res.json({ message: 'Quiz ended successfully' });
    } catch (error) {
        console.error('End Quiz Error:', error);
        res.status(500).json({ message: 'Failed to end quiz' });
    }
};

// @desc    Get all quizzes created by the teacher
// @route   GET /api/quiz/teacher
// @access  Private (Teacher)
const getMyQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
        res.json(quizzes);
    } catch (error) {
        console.error('Get My Quizzes Error:', error);
        res.status(500).json({ message: 'Failed to fetch quizzes' });
    }
};

// @desc    Update a Quiz (Edit questions/title)
// @route   PUT /api/quiz/:id
// @access  Private (Teacher)
const updateQuiz = async (req, res) => {
    try {
        const quizId = req.params.id;
        const { title, questions } = req.body;

        const quiz = await Quiz.findOneAndUpdate(
            { _id: quizId, createdBy: req.user._id },
            { title, questions },
            { new: true }
        );

        if (!quiz) return res.status(404).json({ message: 'Quiz not found or unauthorized' });

        res.json(quiz);
    } catch (error) {
        console.error('Update Quiz Error:', error);
        res.status(500).json({ message: 'Failed to update quiz' });
    }
};

// @desc    Delete a Quiz
// @route   DELETE /api/quiz/:id
// @access  Private (Teacher)
const deleteQuiz = async (req, res) => {
    try {
        const quizId = req.params.id;
        const quiz = await Quiz.findOneAndDelete({ _id: quizId, createdBy: req.user._id });

        if (!quiz) return res.status(404).json({ message: 'Quiz not found or unauthorized' });

        // Optionally delete results associated with this quiz
        await QuizResult.deleteMany({ quizId });

        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Delete Quiz Error:', error);
        res.status(500).json({ message: 'Failed to delete quiz' });
    }
};

module.exports = {
    createQuiz,
    hostQuiz,
    joinQuiz,
    submitQuiz,
    getQuizResults,
    endQuiz,
    getMyQuizzes,
    updateQuiz,
    deleteQuiz,
    startQuizSession,
    getQuizStatus
};
