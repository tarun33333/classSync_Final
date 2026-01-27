require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const ClassRoutine = require('../models/ClassRoutine');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const ClassHistory = require('../models/ClassHistory');

// Connect to DB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/classsync')
    .then(() => console.log('MongoDB Connected for Check Seeding'))
    .catch(err => console.error(err));

const seedCheckData = async () => {
    try {
        console.log('Clearing existing data...');
        // We clear everything to ensure relationships (IDs) are clean/valid
        await User.deleteMany({});
        await ClassRoutine.deleteMany({});
        await Session.deleteMany({});
        await Attendance.deleteMany({});
        await ClassHistory.deleteMany({});

        // --- Create Teacher ---
        console.log('Creating Teacher...');
        const teacher = await User.create({
            name: 'Teacher check',
            email: 'teacher@test.com',
            password: '111', // Simple password
            role: 'teacher',
            department: 'CSE',
            isAdvisor: true,
            advisorBatch: '2022-2026',
            advisorDept: 'CSE'
        });

        // --- Create Students ---
        console.log('Creating Students...');
        const student1 = await User.create({
            name: 'Student One',
            email: 'student1@test.com',
            password: '111',
            role: 'student',
            rollNumber: 'CSE101',
            department: 'CSE',
            section: 'A',
            currentSemester: 3,
            batch: '2022-2026'
        });

        const student2 = await User.create({
            name: 'Student Two',
            email: 'student2@test.com',
            password: '111',
            role: 'student',
            rollNumber: 'CSE102',
            department: 'CSE',
            section: 'A',
            currentSemester: 3,
            batch: '2022-2026'
        });

        const students = [student1, student2];

        // --- Create History for Sem 1 & 2 ---
        console.log('Creating Historical Attendance (Sem 1 & 2)...');

        const createHistoryForSemester = async (sem, startDate, numDays) => {
            const date = new Date(startDate);
            for (let i = 0; i < numDays; i++) {
                // Create 2 sessions per day
                for (let j = 0; j < 2; j++) {
                    const sessionID = new mongoose.Types.ObjectId();
                    const startTime = new Date(date);
                    startTime.setHours(9 + j, 0, 0); // 9:00, 10:00
                    const endTime = new Date(startTime);
                    endTime.setHours(10 + j, 0, 0);

                    // Randomize attendance
                    let presentCount = 0;
                    let absentCount = 0;

                    for (const student of students) {
                        const isPresent = Math.random() > 0.2; // 80% attendance
                        if (isPresent) presentCount++; else absentCount++;

                        await Attendance.create({
                            session: sessionID,
                            student: student._id,
                            status: isPresent ? 'present' : 'absent',
                            method: 'manual',
                            verified: true,
                            timestamp: startTime
                        });
                    }

                    await ClassHistory.create({
                        _id: sessionID,
                        teacher: teacher._id,
                        subject: `Subject ${j + 1} (Sem ${sem})`,
                        section: 'A',
                        semester: sem,
                        startTime: startTime,
                        endTime: endTime,
                        presentCount,
                        absentCount
                    });
                }
                date.setDate(date.getDate() + 1); // Next day
            }
        };

        // Sem 1: 1 Year ago, 10 days of data
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        await createHistoryForSemester(1, oneYearAgo, 10);

        // Sem 2: 6 Months ago, 10 days of data
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        await createHistoryForSemester(2, sixMonthsAgo, 10);

        // Sem 3: Recent data (Current Month) - Last 15 days
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        await createHistoryForSemester(3, fifteenDaysAgo, 15);


        // --- Create Class Routine for Today ---
        console.log('Creating Class Routine...');

        // Generates a routine for 6 days (Mon-Sat) to match Schema validation
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const timetable = [];

        // Time slots
        const timeSlots = [
            { start: '09:00', end: '10:00' },
            { start: '10:00', end: '11:00' },
            { start: '11:00', end: '12:00' },
            { start: '14:00', end: '15:00' },
            { start: '20:00', end: '23:59' } // Testing Slot for Night
        ];

        for (const day of days) {
            const periods = [];
            for (let i = 0; i < timeSlots.length; i++) {
                periods.push({
                    periodNo: i + 1,
                    startTime: timeSlots[i].start,
                    endTime: timeSlots[i].end,
                    subject: `Subject ${i + 1}`,
                    teacher: teacher._id
                });
            }
            timetable.push({ day, periods });
        }

        await ClassRoutine.create({
            dept: 'CSE',
            batch: '2022-2026',
            semester: 3, // Current semester
            class: 2,
            timetable
        });

        console.log('------------------------------------------------');
        console.log('SEED CHECK COMPLETE');
        console.log('------------------------------------------------');
        console.log('Teacher: teacher@test.com / 111');
        console.log('Student 1: student1@test.com / 111');
        console.log('Student 2: student2@test.com / 111');
        console.log('Added 20 historical sessions for Sem 1 and Sem 2');
        console.log('------------------------------------------------');

        process.exit();

    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
};

seedCheckData();
