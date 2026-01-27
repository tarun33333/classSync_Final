require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const ClassRoutine = require('../models/ClassRoutine');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const ClassHistory = require('../models/ClassHistory');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/attendance-app')
    .then(() => console.log('MongoDB Connected for Seeding'))
    .catch(err => console.error(err));

const seedData = async () => {
    try {
        console.log('--- RESETTING DATABASE ---');
        await User.deleteMany({});
        await ClassRoutine.deleteMany({});
        await Session.deleteMany({});
        await Attendance.deleteMany({});
        await ClassHistory.deleteMany({});
        console.log('All previous data cleared.');

        const DEPT = 'IT';
        const BATCH = '2022-2026';
        const SEMESTER = 3; // Current semester
        const SECTION = 'A';

        // 1. Create 10 Teachers
        console.log('Creating 10 Teachers...');
        const teachers = [];
        for (let i = 1; i <= 10; i++) {
            const isAdvisor = i === 1; // First teacher is advisor
            const teacher = await User.create({
                name: `Teacher IT ${i}${isAdvisor ? ' (Advisor)' : ''}`,
                email: `teacher${i}.it@test.com`,
                password: '111',
                role: 'teacher',
                department: DEPT,
                isAdvisor: isAdvisor,
                advisorBatch: isAdvisor ? BATCH : undefined,
                advisorDept: isAdvisor ? DEPT : undefined
            });
            teachers.push(teacher);
        }
        console.log('Teachers created. Advisor: teacher1.it@test.com');

        // 2. Create 5 Students
        console.log('Creating 5 Students...');
        for (let i = 1; i <= 5; i++) {
            await User.create({
                name: `Student IT ${i}`,
                email: `student${i}.it@test.com`,
                password: '111',
                role: 'student',
                rollNumber: `IT10${i}`,
                department: DEPT,
                section: SECTION,
                currentSemester: SEMESTER,
                batch: BATCH
            });
        }
        console.log('Students created.');

        // 3. Create Routine
        console.log('Creating Routine (7 Periods, 4 Teachers/Day)...');

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const timeSlots = [
            { start: '09:00', end: '10:00' },
            { start: '10:00', end: '11:00' },
            { start: '11:00', end: '12:00' },
            { start: '12:00', end: '13:00' },
            { start: '13:00', end: '14:00' },
            { start: '14:00', end: '15:00' },
            { start: '15:00', end: '16:00' }
        ];

        const timetable = [];

        for (const day of days) {
            const periods = [];

            // Pick 4 distinct teachers for this day
            // We shuffle the teachers array and take the first 4
            const shuffledTeachers = teachers.slice().sort(() => 0.5 - Math.random());
            const daysTeachers = shuffledTeachers.slice(0, 4);

            for (let slot = 0; slot < 7; slot++) {
                // Distribute the 4 teachers across 7 slots
                // e.g. T1, T2, T3, T4, T1, T2, T3
                const teacher = daysTeachers[slot % 4];

                periods.push({
                    periodNo: slot + 1,
                    startTime: timeSlots[slot].start,
                    endTime: timeSlots[slot].end,
                    subject: `IT Subject ${slot + 1}`, // Generic subject names
                    teacher: teacher._id
                });
            }
            timetable.push({ day, periods });
        }

        await ClassRoutine.create({
            dept: DEPT,
            batch: BATCH, // Required for fetching student schedules
            semester: SEMESTER,
            class: 2, // Just an internal ID
            section: SECTION, // Add this if your routine model supports it, otherwise logic depends on batch/sem
            timetable
        });

        console.log('Routine Created!');
        console.log('--------------------------------------------------');
        console.log('SEEDING COMPLETE');
        console.log('Credentials:');
        console.log('  Advisor: teacher1.it@test.com / 111');
        console.log('  Teacher: teacher2.it@test.com / 111');
        console.log('  Student: student1.it@test.com / 111');
        console.log('--------------------------------------------------');

        process.exit();

    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
};

seedData();
