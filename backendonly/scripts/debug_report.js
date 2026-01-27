const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const ClassHistory = require('../models/ClassHistory');
const User = require('../models/User');
const Session = require('../models/Session');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log("Connected. Simulating Report Generation...");

    // 1. Setup Parameters (Mocking Frontend Selection)
    const teacherEmail = 'teacher2.it@test.com';
    const teacher = await User.findOne({ email: teacherEmail });

    if (!teacher) { console.log("Teacher not found"); process.exit(); }

    // Mock Payload
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days
    const endDate = new Date();

    const payload = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dept: 'IT',
        semester: 3,
        section: 'A',
        // We need to pick a valid subject. Seed script said 'IT Subject 2' or similar.
        // Let's find one from history to be sure what to test.
        subject: null
    };

    const sampleHistory = await ClassHistory.findOne({ teacher: teacher._id });
    if (sampleHistory) {
        payload.subject = sampleHistory.subject;
        console.log("Found sample subject from history:", payload.subject);
    } else {
        console.log("No history found for this teacher at all!");
        process.exit();
    }

    console.log("--- MOCK PAYLOAD ---");
    console.log(payload);

    // 2. Run Logic from attendanceController.js (getAttendanceReport)
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    end.setHours(23, 59, 59, 999);

    const query = {
        startTime: { $gte: start, $lte: end },
        subject: payload.subject,
        section: payload.section
    };

    console.log("--- DB QUERY ---");
    console.log(query);

    const activeSessions = await Session.find(query).select('_id startTime section');
    const historySessions = await ClassHistory.find(query).select('_id startTime section');

    console.log(`Sessions Found -> Active: ${activeSessions.length}, History: ${historySessions.length}`);

    const allSessionIds = [...activeSessions, ...historySessions].map(s => s._id);

    // Check Students
    const students = await User.find({
        role: 'student',
        department: payload.dept,
        currentSemester: payload.semester,
        section: payload.section
    }).select('_id name');

    console.log(`Students Found: ${students.length}`);

    if (students.length > 0 && allSessionIds.length > 0) {
        // Check exact attendance match for first student
        const firstStudent = students[0];
        const count = await Attendance.countDocuments({
            student: firstStudent._id,
            session: { $in: allSessionIds },
            status: 'present' // Only counting present
        });
        console.log(`Attendance for ${firstStudent.name}: ${count} / ${allSessionIds.length}`);
    } else {
        console.log("Cannot check attendance counts (missing students or sessions).");
    }

    process.exit();
});
