require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const ClassRoutine = require('../models/ClassRoutine');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const ClassHistory = require('../models/ClassHistory');

// Connect to DB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/classsync')
    .then(() => console.log('MongoDB Connected for IT Class Seeding'))
    .catch(err => console.error(err));

const seedITClass = async () => {
    try {
        console.log('Clearing existing data...');
        // Clear all relevant collections
        await User.deleteMany({});
        await ClassRoutine.deleteMany({});
        await Session.deleteMany({});
        await Attendance.deleteMany({});
        await ClassHistory.deleteMany({});

        // --- Create Teachers ---
        console.log('Creating Teachers...');
        const teacher1 = await User.create({
            name: 'John Doe (Teacher 1)',
            email: 'teacher1@it.com',
            password: '123',
            role: 'teacher',
            department: 'IT',
            isAdvisor: true,
            advisorBatch: '2022-2026',
            advisorDept: 'IT'
        });

        const teacher2 = await User.create({
            name: 'Jane Smith (Teacher 2)',
            email: 'teacher2@it.com',
            password: '123',
            role: 'teacher',
            department: 'IT',
            isAdvisor: false
        });

        // --- Create Students ---
        console.log('Creating 3 Students...');
        const students = await User.create([
            {
                name: 'Alice Johnson',
                email: 'student1@it.com',
                password: '123',
                role: 'student',
                rollNumber: 'IT001',
                department: 'IT',
                section: 'A',
                currentSemester: 3,
                batch: '2022-2026'
            },
            {
                name: 'Bob Williams',
                email: 'student2@it.com',
                password: '123',
                role: 'student',
                rollNumber: 'IT002',
                department: 'IT',
                section: 'A',
                currentSemester: 3,
                batch: '2022-2026'
            },
            {
                name: 'Charlie Brown',
                email: 'student3@it.com',
                password: '123',
                role: 'student',
                rollNumber: 'IT003',
                department: 'IT',
                section: 'A',
                currentSemester: 3,
                batch: '2022-2026'
            }
        ]);


        // --- Create Class Routine (Timetable) ---
        console.log('Creating Class Routine with 7 periods...');

        // Defined Schedule with Breaks
        // P1: 09:00 - 09:50
        // P2: 09:50 - 10:40
        // Break: 10:40 - 11:00
        // P3: 11:00 - 11:50
        // P4: 11:50 - 12:40
        // Lunch: 12:40 - 13:40
        // P5: 13:40 - 14:30
        // P6: 14:30 - 15:20
        // Break: 15:20 - 15:40
        // P7: 15:40 - 16:30

        // Assignments:
        // Teacher 1: P1, P2, P3, P4
        // Teacher 2: P5, P6, P7

        const periodsTemplate = [
            { periodNo: 1, start: '09:00', end: '09:50', subject: 'Data Structures', teacher: teacher1._id },
            { periodNo: 2, start: '09:50', end: '10:40', subject: 'Data Structures', teacher: teacher1._id },
            { periodNo: 3, start: '11:00', end: '11:50', subject: 'Algorithms', teacher: teacher1._id },
            { periodNo: 4, start: '11:50', end: '12:40', subject: 'Algorithms', teacher: teacher1._id },

            { periodNo: 5, start: '13:40', end: '14:30', subject: 'Operating Systems', teacher: teacher2._id },
            { periodNo: 6, start: '14:30', end: '15:20', subject: 'Operating Systems', teacher: teacher2._id },
            { periodNo: 7, start: '15:40', end: '16:30', subject: 'Database Systems', teacher: teacher2._id }
        ];

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const timetable = days.map(day => ({
            day,
            periods: periodsTemplate.map(p => ({
                periodNo: p.periodNo,
                startTime: p.start,
                endTime: p.end,
                subject: p.subject,
                teacher: p.teacher
            }))
        }));

        await ClassRoutine.create({
            dept: 'IT',
            batch: '2022-2026',
            semester: 3,
            class: 2, // 2nd year
            timetable
        });

        // --- Generate Historical Data (Past 30 Days) ---
        console.log('Generating Historical Data for the past 30 days...');

        const today = new Date();
        const past30Days = new Date();
        past30Days.setDate(today.getDate() - 30);

        let currentDate = new Date(past30Days);

        while (currentDate <= today) {
            // Skip Sundays
            if (currentDate.getDay() === 0) {
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }

            // For each day, generate sessions based on the template
            for (const p of periodsTemplate) {
                // Parse Time
                const [startHour, startMin] = p.start.split(':').map(Number);
                const [endHour, endMin] = p.end.split(':').map(Number);

                const sessionStart = new Date(currentDate);
                sessionStart.setHours(startHour, startMin, 0);

                const sessionEnd = new Date(currentDate);
                sessionEnd.setHours(endHour, endMin, 0);

                // Create Session ID (reused for ClassHistory)
                const sessionId = new mongoose.Types.ObjectId();

                // Generate Random Attendance
                let presentCount = 0;
                let absentCount = 0;

                for (const student of students) {
                    const isPresent = Math.random() > 0.15; // 85% attendance chance
                    if (isPresent) presentCount++;
                    else absentCount++;

                    await Attendance.create({
                        session: sessionId,
                        student: student._id,
                        status: isPresent ? 'present' : 'absent',
                        method: 'manual',
                        verified: true,
                        timestamp: sessionStart
                    });
                }

                await ClassHistory.create({
                    _id: sessionId,
                    teacher: p.teacher,
                    subject: p.subject,
                    section: 'A',
                    semester: 3,
                    startTime: sessionStart,
                    endTime: sessionEnd,
                    presentCount,
                    absentCount
                });
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        console.log('------------------------------------------------');
        console.log('SEED IT CLASS COMPLETE');
        console.log('------------------------------------------------');
        console.log('Teacher 1: teacher1@it.com / 123');
        console.log('Teacher 2: teacher2@it.com / 123');
        console.log('Students: student1@it.com, student2@it.com, student3@it.com / 123');
        console.log('Routine: 7 Periods, Lunch 12:40-13:40, Breaks 10:40-11:00 & 15:20-15:40');
        console.log('------------------------------------------------');

        process.exit();
    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
};

seedITClass();
