const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const ClassHistory = require('../models/ClassHistory');
const Attendance = require('../models/Attendance');
const ClassRoutine = require('../models/ClassRoutine');

// Load env vars
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/attendance-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB Connected for Seeding'))
    .catch(err => console.error(err));

const seedData = async () => {
    try {
        console.log('--- SEEDING ANALYTICS DATA ---');

        // Defined constants
        const teacherEmail = 'teacher2.it@test.com'; // Using Teacher 2

        // 1. Find the Teacher
        const teacher = await User.findOne({ email: teacherEmail });
        if (!teacher) throw new Error(`Teacher ${teacherEmail} not found. Run seed.js first.`);
        console.log(`Seeding for teacher: ${teacher.name}`);

        // 2. Find a valid subject and class details from Routine
        const routine = await ClassRoutine.findOne({
            "timetable.periods.teacher": teacher._id
        });

        if (!routine) {
            console.log('Warning: No routine found for this teacher. Aborting.');
            process.exit(1);
        }

        const dept = routine.dept;
        const semester = routine.semester;
        const section = routine.section || 'A';

        // Find ALL unique subjects taught by this teacher
        const subjects = new Set();
        routine.timetable.forEach(day => {
            day.periods.forEach(p => {
                if (p.teacher.toString() === teacher._id.toString()) {
                    subjects.add(p.subject);
                }
            });
        });

        const uniqueSubjects = Array.from(subjects);
        console.log(`Found subjects: ${uniqueSubjects.join(', ')}`);

        // 3. Find Students
        const students = await User.find({
            role: 'student',
            department: dept,
            currentSemester: semester,
            section: section
        });
        console.log(`Found ${students.length} students.`);

        // 4. Create History Sessions for last 7 days for EACH Subject
        const today = new Date();

        for (const subj of uniqueSubjects) {
            console.log(`Seeding data for Subject: ${subj}`);

            for (let i = 1; i <= 7; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);

                date.setHours(10, 0, 0, 0);
                const endTime = new Date(date);
                endTime.setHours(11, 0, 0, 0);

                const session = await ClassHistory.create({
                    _id: new mongoose.Types.ObjectId(),
                    teacher: teacher._id,
                    subject: subj,
                    dept: dept,
                    semester: semester,
                    section: section,
                    startTime: date,
                    endTime: endTime,
                    date: date,
                    topic: `Topic Day ${i}`
                });

                // 5. Mark Attendance
                for (const student of students) {
                    const isPresent = Math.random() > 0.3;
                    if (isPresent) {
                        await Attendance.create({
                            student: student._id,
                            session: session._id,
                            date: date, // Keep date for query convenience matching, though not strictly in schema maybe? 
                            // Wait, checking schema: timestamp is there. date field is NOT in Attendance schema provided!
                            // Schema has: session, student, status, method, verified, timestamp, deviceMac.
                            // seed checks: date is NOT part of schema shown in file view.
                            // But usually timestamps handles createdAt.
                            // I will rely on 'timestamp' or 'createdAt'.
                            // Passing 'date' might be ignored by mongoose strict mode which is fine.
                            status: 'present',
                            method: 'manual'
                        });
                    }
                }
            }
        }

        console.log('Analytics Data Seeded Successfully!');
        process.exit();

    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
};

seedData();
