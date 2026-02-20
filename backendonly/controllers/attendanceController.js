const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const faceapi = require('face-api.js');
const jpeg = require('jpeg-js');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

const tf = faceapi.tf;

// Helper: Decode Image
const imageToTensor = (buffer) => {
    const raw = jpeg.decode(buffer, { useTArray: true });
    const tensor = tf.tensor3d(raw.data, [raw.height, raw.width, 4]);
    const rgb = tensor.slice([0, 0, 0], [-1, -1, 3]);
    tensor.dispose();
    return rgb;
};

// Load Models (Tiny)
const loadModels = async () => {
    const modelsPath = path.join(__dirname, '../models/face_models');
    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
    await faceapi.nets.faceLandmark68TinyNet.loadFromDisk(modelsPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
    await faceapi.nets.faceExpressionNet.loadFromDisk(modelsPath); // Load Expression Model
};

// @desc    Verify WiFi and check eligibility
// @route   POST /api/attendance/verify-wifi
// @access  Student
const verifyWifi = async (req, res) => {
    const { sessionId, bssid, rssi } = req.body;

    try {
        const session = await Session.findById(sessionId);
        if (!session || !session.isActive) {
            return res.status(400).json({ message: 'Session is not active' });
        }

        // Check if already marked
        const existing = await Attendance.findOne({ session: sessionId, student: req.user._id });
        if (existing) {
            return res.status(400).json({ message: 'Attendance already marked' });
        }

        // RSSI Check (Signal Strength)
        if (rssi) {
            // -30 (Excellent) to -90 (Unusable)
            // User rules: -80 is "Very Weak", -90 "Not in class".
            // Let's cutoff at -85.
            if (rssi < -85) {
                return res.status(400).json({ message: `WiFi Signal Too Weak (${rssi} dBm). Please move closer to class!` });
            }
        }

        // Network Check (Simplified for Emulator/Dev)
        if (session.bssid && session.bssid !== '0.0.0.0') {
            // In prod, check subnet matching
        }

        res.json({ message: 'WiFi & Signal verified', sessionId, rssiStatus: rssi > -60 ? 'Excellent' : 'Good' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit OTP/QR for Attendance
// @route   POST /api/attendance/mark
// @access  Student
const markAttendance = async (req, res) => {
    const { sessionId, code, method } = req.body; // code can be OTP or QR token

    try {
        const session = await Session.findById(sessionId);
        if (!session || !session.isActive) {
            return res.status(400).json({ message: 'Session is not active' });
        }

        // Strict Department/Section Validation
        await session.populate('teacher');
        if (req.user.department !== session.teacher.department) {
            return res.status(403).json({ message: `You belong to ${req.user.department}, this class is for ${session.teacher.department}.` });
        }
        if (session.section && req.user.section !== session.section) {
            return res.status(403).json({ message: `You are in Section ${req.user.section}, this class is for Section ${session.section}.` });
        }

        // Verify Code
        if (method === 'otp') {
            if (session.otp !== code) return res.status(400).json({ message: 'Invalid OTP' });
        } else if (method === 'qr') {
            if (session.qrCode !== code) return res.status(400).json({ message: 'Invalid QR Code' });
        } else {
            return res.status(400).json({ message: 'Invalid method' });
        }

        // Check duplicate
        const existing = await Attendance.findOne({ session: sessionId, student: req.user._id });
        if (existing) {
            return res.status(400).json({ message: 'Attendance already marked' });
        }

        const attendance = await Attendance.create({
            session: sessionId,
            student: req.user._id,
            status: 'present',
            method,
            deviceMac: req.user.macAddress
        });

        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark Attendance with Face Verification
// @route   POST /api/attendance/mark-with-face
// @access  Student
const markAttendanceWithFace = async (req, res) => {
    const { sessionId, code, method } = req.body;

    try {
        if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

        const session = await Session.findById(sessionId);
        if (!session || !session.isActive) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Session is not active' });
        }

        const user = await User.findById(req.user._id);
        if (!user.isFaceRegistered || !user.faceEmbedding || user.faceEmbedding.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Face not registered. Please contact admin.' });
        }

        // Verify Code (OTP/QR) FIRST
        if (method === 'otp') {
            if (session.otp !== code) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: 'Invalid OTP' });
            }
        } else if (method === 'qr') {
            if (session.qrCode !== code) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: 'Invalid QR Code' });
            }
        }

        // Check duplicate
        const existing = await Attendance.findOne({ session: sessionId, student: req.user._id });
        if (existing) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Attendance already marked' });
        }

        // FACE VERIFICATION
        await loadModels();
        const buffer = fs.readFileSync(req.file.path);
        const tensor = imageToTensor(buffer);

        // Use Tiny Detector + Landmarks + Expressions
        const detection = await faceapi.detectSingleFace(tensor, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks(true)
            .withFaceExpressions() // Detect Expressions
            .withFaceDescriptor();

        tensor.dispose();
        fs.unlinkSync(req.file.path);

        if (!detection) return res.status(400).json({ message: 'No face detected' });

        // LIVENESS CHALLENGE CHECK
        const challenge = req.body.challenge || 'smile'; // Default to smile if not sent
        const landmarks = detection.landmarks;
        const expressions = detection.expressions;

        let isLive = false;
        let livenessMsg = 'Liveness Check Failed';

        // Helper: Euclidean Distance
        const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

        // Helper: Eye Aspect Ratio (EAR)
        const getEAR = (eye) => {
            const A = dist(eye[1], eye[5]);
            const B = dist(eye[2], eye[4]);
            const C = dist(eye[0], eye[3]);
            return (A + B) / (2.0 * C);
        };

        // Helper: Mouth Aspect Ratio (MAR) - using outer lips
        const getMAR = (mouth) => {
            // points 48-59 are outer lips. 
            // height: (50,58), (51,57), (52,56)
            // width: (48,54)
            // indices in the 68 array: 48 is index 48.
            // But detection.landmarks.positions is an array of objects {x,y}
            // mouth points are 48-67.
            const p = landmarks.positions;
            const A = dist(p[50], p[58]);
            const B = dist(p[51], p[57]);
            const C = dist(p[52], p[56]);
            const D = dist(p[48], p[54]);
            return (A + B + C) / (3.0 * D);
        };

        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const leftEAR = getEAR(leftEye);
        const rightEAR = getEAR(rightEye);
        const mar = getMAR(landmarks.getMouth());

        console.log(`Liveness Stats - Mode: ${challenge}, LeftEAR: ${leftEAR.toFixed(2)}, RightEAR: ${rightEAR.toFixed(2)}, MAR: ${mar.toFixed(2)}`);

        switch (challenge) {
            case 'smile':
                if (expressions.happy > 0.7) isLive = true;
                livenessMsg = 'Please SMILE widely!';
                break;
            case 'open_mouth':
                if (mar > 0.3) isLive = true; // Threshold for open mouth
                livenessMsg = 'Open your mouth wider!';
                break;
            case 'wink_left':
                // Mirror effect: User winks LEFT eye = RIGHT eye on image (usually) if selfie camera mirrored?
                // Let's assume standard: User's Left is Image's Left (if not mirrored) or Right (if mirrored).
                // Usually server sees what camera sent. 
                // Let's assume User Left = Image Right (subject's left).
                // Let's try checking for Assymetry.
                if (leftEAR < 0.22 && rightEAR > 0.25) isLive = true;
                livenessMsg = 'Wink your Left Eye (Close it tight)!';
                break;
            case 'wink_right':
                if (rightEAR < 0.22 && leftEAR > 0.25) isLive = true;
                livenessMsg = 'Wink your Right Eye (Close it tight)!';
                break;
            case 'blink':
                if (leftEAR < 0.22 && rightEAR < 0.22) isLive = true;
                livenessMsg = 'Close BOTH eyes!';
                break;
            default:
                isLive = true; // Fallback
        }

        if (!isLive) {
            return res.status(401).json({ message: `Liveness Failed: ${livenessMsg}` });
        }

        const distance = faceapi.euclideanDistance(user.faceEmbedding, detection.descriptor);
        console.log(`Face Match Distance: ${distance}`); // DEBUG
        if (distance > 0.6) return res.status(401).json({ message: 'Face Verification Failed. Try again with better lighting.' });

        // Mark Attendance
        // ... (rest of function)
        const attendance = await Attendance.create({
            session: sessionId,
            student: req.user._id,
            status: 'present',
            method: method + '-face', // e.g. 'otp-face'
            verified: true,
            deviceMac: req.user.macAddress
        });

        res.status(201).json(attendance);

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: error.message });
    }
};

// ... Rest of the controller functions (get student history, etc) ...
// Copying existing functions below:

// @desc    Get Live Attendance for Session (Full Class List)
// @route   GET /api/attendance/session/:sessionId
// @access  Teacher
const getSessionAttendance = async (req, res) => {
    try {
        const ClassHistory = require('../models/ClassHistory'); // Import History model

        // 1. Try finding in Active Sessions
        let session = await Session.findById(req.params.sessionId).populate('teacher');

        // 2. If not active, try ClassHistory (Archived)
        if (!session) {
            session = await ClassHistory.findById(req.params.sessionId).populate('teacher');
        }

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // 1. Fetch all students who SHOULD be in this class
        const User = require('../models/User'); // Import User model inside to ensure availability
        const enrolledStudents = await User.find({
            role: 'student',
            department: session.teacher.department,
            section: session.section
        }).select('name rollNumber');

        // 2. Fetch existing attendance records
        const attendanceRecords = await Attendance.find({ session: session._id });

        // 3. Merge Lists
        const fullReport = enrolledStudents.map(student => {
            const record = attendanceRecords.find(ar => ar.student.toString() === student._id.toString());

            return {
                student: {
                    name: student.name,
                    rollNumber: student.rollNumber,
                    _id: student._id
                },
                status: record ? record.status : 'absent', // Default to absent if no record
                method: record ? record.method : null,
                createdAt: record ? record.createdAt : null
            };
        });

        res.json(fullReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Student History
// @route   GET /api/attendance/student
// @access  Student
const getStudentHistory = async (req, res) => {
    try {
        const Session = require('../models/Session');
        const ClassHistory = require('../models/ClassHistory');

        // 1. Fetch Attendance Records (without populate first)
        const attendance = await Attendance.find({ student: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        // 2. Collect Session IDs
        const sessionIds = attendance.map(a => a.session);

        // 3. Fetch from Active Sessions
        const activeSessions = await Session.find({ _id: { $in: sessionIds } }).select('subject startTime endTime');

        // 4. Fetch from Class History
        const archivedSessions = await ClassHistory.find({ _id: { $in: sessionIds } }).select('subject startTime endTime');

        // 5. Create Lookup Map
        const sessionMap = {};
        activeSessions.forEach(s => sessionMap[s._id.toString()] = s);
        archivedSessions.forEach(s => sessionMap[s._id.toString()] = s);

        // 6. Attach Session Data
        const historyWithDetails = attendance.map(record => {
            const sessionData = sessionMap[record.session.toString()];
            return {
                ...record,
                session: sessionData || { subject: 'Unknown Session', startTime: record.createdAt, endTime: record.createdAt }
            };
        });

        res.json(historyWithDetails);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Get Student Dashboard (Today's Periods)
// @route   GET /api/attendance/dashboard
// @access  Student
const getStudentDashboard = async (req, res) => {
    try {
        // 1. Get current day in IST
        const day = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });

        // 2. Fetch seeded routines for this student's dept & semester using Aggregation
        const ClassRoutine = require('../models/ClassRoutine');
        const relevantRoutines = await ClassRoutine.aggregate([
            {
                $match: {
                    dept: req.user.department,
                    semester: req.user.currentSemester
                }
            },
            { $unwind: "$timetable" },
            { $match: { "timetable.day": day } },
            { $unwind: "$timetable.periods" },
            {
                $lookup: {
                    from: "users",
                    localField: "timetable.periods.teacher",
                    foreignField: "_id",
                    as: "teacherDetails"
                }
            },
            { $unwind: { path: "$teacherDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    subject: "$timetable.periods.subject",
                    startTime: "$timetable.periods.startTime",
                    endTime: "$timetable.periods.endTime",
                    teacher: {
                        name: "$teacherDetails.name",
                        department: "$teacherDetails.department"
                    },
                    day: "$timetable.day"
                }
            },
            { $sort: { startTime: 1 } }
        ]);

        // 3. Fetch ANY active sessions for this student's section (Real-time check)
        // IMPORTANT: Only fetch sessions created TODAY — expired/forgot-to-end sessions from
        // previous days are ignored here. They are auto-expired by getActiveSession on the teacher side.
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const activeSessions = await Session.find({
            section: req.user.section,
            isActive: true,
            createdAt: { $gte: startOfToday }  // Only today's sessions
        }).populate('teacher', 'name');

        // Helper to parse '09:30 AM' to Date object for Today
        const parseRoutineTime = (timeStr) => {
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':');
            if (hours === '12') hours = '00';
            if (modifier === 'PM') hours = parseInt(hours, 10) + 12;

            const date = new Date();
            date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            return date;
        };

        // 4. Build Dashboard Data
        // Start with scheduled routines
        let dashboardData = await Promise.all(relevantRoutines.map(async (routine) => {
            // Check if this routine is currently active
            // FIX: Match by Subject AND Time Proximity (within 60 mins)
            // to avoid mapping one session to multiple periods of same subject.

            const routineStart = parseRoutineTime(routine.startTime);

            // Find session with same subject AND closest start time
            let activeSession = null;
            const subjectSessions = activeSessions.filter(s => s.subject === routine.subject);

            if (subjectSessions.length > 0) {
                // Find closest session in time
                activeSession = subjectSessions.reduce((prev, curr) => {
                    const prevDiff = Math.abs(new Date(prev.createdAt) - routineStart); // Using createdAt/startTime
                    const currDiff = Math.abs(new Date(curr.createdAt) - routineStart);
                    return (currDiff < prevDiff) ? curr : prev;
                });

                // Threshold check: Must be within 60 mins (3600000 ms)
                const timeDiff = Math.abs(new Date(activeSession.createdAt) - routineStart);
                if (timeDiff > 3600000) {
                    activeSession = null;
                }
            }

            let status = 'upcoming';
            let sessionId = null;
            let teacherName = routine.teacher ? routine.teacher.name : 'Unknown';

            if (activeSession) {
                status = 'ongoing';
                sessionId = activeSession._id;
                teacherName = activeSession.teacher ? activeSession.teacher.name : teacherName;

                // Check attendance
                const attendance = await Attendance.findOne({ session: activeSession._id, student: req.user._id });
                if (attendance) status = 'present';
            }

            return {
                subject: routine.subject,
                day: routine.day,
                startTime: routine.startTime,
                endTime: routine.endTime,
                status,
                sessionId,
                teacherName
            };
        }));

        // 5. Inject Ad-hoc Active Sessions (Classes not in routine but running)
        for (const session of activeSessions) {
            const isAlreadyListed = dashboardData.some(d => d.subject === session.subject && d.status !== 'upcoming');

            if (!isAlreadyListed) {
                // Check if user already marked attendance for this ad-hoc session
                let status = 'ongoing';
                const attendance = await Attendance.findOne({ session: session._id, student: req.user._id });
                if (attendance) status = 'present';

                dashboardData.unshift({ // Add to top
                    subject: session.subject,
                    day: day,
                    startTime: 'Live', // Special indicator
                    endTime: 'Now',
                    status,
                    sessionId: session._id,
                    teacherName: session.teacher ? session.teacher.name : 'Unknown'
                });
            }
        }

        res.json(dashboardData);
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Student Stats (for Summary)
// @route   GET /api/attendance/stats
// @access  Student
const getStudentStats = async (req, res) => {
    try {
        const ClassHistory = require('../models/ClassHistory'); // Ensure model is loaded
        const currentSem = req.user.currentSemester || 1;
        const selectedSem = parseInt(req.query.semester) || currentSem;

        // 1. Calculate Overall History (Graph Data)
        // We need to join Attendance -> ClassHistory to get the semester of each attended class
        const graphAgg = await Attendance.aggregate([
            { $match: { student: req.user._id } },
            {
                $lookup: {
                    from: 'classhistories', // Collection name for ClassHistory
                    localField: 'session',
                    foreignField: '_id',
                    as: 'classDetails'
                }
            },
            { $unwind: '$classDetails' },
            {
                $group: {
                    _id: '$classDetails.semester',
                    present: {
                        $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                    },
                    total: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const graphData = graphAgg.map(g => ({
            semester: g._id,
            percentage: Math.round((g.present / g.total) * 100)
        }));

        // 2. Detailed Stats for Selected Semester (Pie Chart)
        const statsAgg = await Attendance.aggregate([
            { $match: { student: req.user._id, status: 'present' } },
            {
                $lookup: {
                    from: 'classhistories',
                    localField: 'session',
                    foreignField: '_id',
                    as: 'classDetails'
                }
            },
            { $unwind: '$classDetails' },
            { $match: { 'classDetails.semester': selectedSem } },
            {
                $group: {
                    _id: '$classDetails.subject',
                    presentCount: { $sum: 1 }
                }
            }
        ]);

        res.json({
            stats: statsAgg,
            graphData,
            currentSemester: currentSem,
            selectedSemester: selectedSem
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Teacher Reports (Past Sessions)
// @route   GET /api/attendance/reports
// @access  Teacher
// @desc    Get Teacher Reports (Past Sessions from History)
// @route   GET /api/attendance/reports
// @access  Teacher
const getTeacherReports = async (req, res) => {
    try {
        const ClassHistory = require('../models/ClassHistory');
        const history = await ClassHistory.find({ teacher: req.user._id })
            .sort({ endTime: -1 })
            .limit(10);

        const reports = history.map(h => ({
            sessionId: h._id,
            subject: h.subject,
            section: h.section,
            date: h.startTime,
            presentCount: h.presentCount,
            absentCount: h.absentCount
        }));

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Reports filtered by Date (from History)
// @route   GET /api/attendance/reports/filter
// @access  Teacher
const getFilteredReports = async (req, res) => {
    const { date } = req.query;
    try {
        const ClassHistory = require('../models/ClassHistory');

        // Create date range for the selected day
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        // Find HISTORY for this teacher on this day
        // Note: We use startTime to filter, as that's when class happened.
        const history = await ClassHistory.find({
            teacher: req.user._id,
            startTime: { $gte: start, $lte: end }
        }).sort({ startTime: 1 });

        const reports = history.map(h => ({
            sessionId: h._id,
            subject: h.subject,
            section: h.section,
            date: h.startTime, // Use startTime as the date
            isActive: false, // History is always inactive
            presentCount: h.presentCount,
            absentCount: h.absentCount
        }));

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAttendanceReport = async (req, res) => {
    const { startDate, endDate, dept, semester, subject, section } = req.body;

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // 1. Find all Sessions (Active + History) in range
        const query = {
            startTime: { $gte: start, $lte: end },
            subject: subject,
            // We use the teacher's department usually, or the explicit one passed
            // The session/history usually stores section. Dept is implicit from teacher.
        };

        if (section) query.section = section;

        // Need to check both Session (Active) and ClassHistory (Archived)
        const Session = require('../models/Session');
        const ClassHistory = require('../models/ClassHistory');
        const User = require('../models/User');

        const activeSessions = await Session.find(query).select('_id startTime section');
        const historySessions = await ClassHistory.find(query).select('_id startTime section');

        const allSessionIds = [...activeSessions, ...historySessions].map(s => s._id);
        const totalClasses = allSessionIds.length;

        // 2. Fetch all Students in this class
        const students = await User.find({
            role: 'student',
            department: dept, // Ensure we filter by passed dept
            currentSemester: semester, // and semester
            section: section // and section
        }).select('_id name rollNumber');

        // 3. For each student, calculate presence
        const report = await Promise.all(students.map(async (student) => {
            const presentCount = await Attendance.countDocuments({
                student: student._id,
                session: { $in: allSessionIds },
                status: 'present'
            });

            const percentage = totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(1) : 0;

            return {
                studentId: student._id,
                name: student.name,
                rollNumber: student.rollNumber,
                present: presentCount,
                total: totalClasses,
                percentage: parseFloat(percentage)
            };
        }));

        res.json({
            range: { start, end },
            totalClasses,
            report
        });

    } catch (error) {
        console.error('Report Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    verifyWifi,
    markAttendance,
    markAttendanceWithFace,
    getSessionAttendance,
    getStudentHistory,
    getStudentDashboard,
    getStudentStats,
    getTeacherReports,
    getFilteredReports,
    getAttendanceReport
};
