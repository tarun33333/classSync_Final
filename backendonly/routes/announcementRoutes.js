const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect } = require('../middlewares/authMiddleware');

// GET all announcements (filtered by student profile)
router.get('/', protect, async (req, res) => {
    try {
        let query = {};

        // If Student, filter by targeting
        if (req.user.role === 'student') {
            query = {
                $and: [
                    { $or: [{ targetDept: null }, { targetDept: req.user.department }] },
                    { $or: [{ targetSemester: null }, { targetSemester: req.user.currentSemester }] },
                    // Section is optional in targeting, but if set, must match
                    { $or: [{ targetSection: null }, { targetSection: req.user.section }] }
                ]
            };
        }

        const announcements = await Announcement.find(query).sort({ date: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create a new announcement
router.post('/create', protect, async (req, res) => {
    const { title, message, authorName, authorRole, targetDept, targetSemester, targetSection, targetSubject } = req.body;

    const newAnnouncement = new Announcement({
        title,
        message,
        authorName,
        authorRole,
        teacherId: req.user._id, // Link to creator
        targetDept,
        targetSemester,
        targetSection,
        targetSubject
    });

    try {
        const savedAnnouncement = await newAnnouncement.save();
        res.status(201).json(savedAnnouncement);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update an announcement
router.put('/:id', async (req, res) => {
    try {
        const { title, message } = req.body;
        const updatedAnnouncement = await Announcement.findByIdAndUpdate(
            req.params.id,
            { title, message },
            { new: true }
        );
        if (!updatedAnnouncement) return res.status(404).json({ message: 'Announcement not found' });
        res.json(updatedAnnouncement);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE an announcement
router.delete('/:id', async (req, res) => {
    try {
        const deletedAnnouncement = await Announcement.findByIdAndDelete(req.params.id);
        if (!deletedAnnouncement) return res.status(404).json({ message: 'Announcement not found' });
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
