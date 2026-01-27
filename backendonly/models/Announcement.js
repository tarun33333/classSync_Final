const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    authorName: {
        type: String,
        required: true
    },
    authorRole: {
        type: String,
        enum: ['teacher', 'admin'],
        default: 'teacher'
    },
    date: {
        type: Date,
        default: Date.now
    },
    // Targeting Fields
    targetDept: { type: String },
    targetSemester: { type: Number },
    targetSection: { type: String },
    targetSubject: { type: String },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Link to teacher who created it
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);
