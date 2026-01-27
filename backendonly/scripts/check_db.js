const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const session = require('../models/Session');
const classhistory = require('../models/ClassHistory');

dotenv.config({ path: '../.env' });

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/attendance-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
        console.log('Connected.');

        // Check Users
        const users = await User.find({}, 'name email role department');
        console.log('--- USERS ---');
        users.forEach(u => console.log(`${u.role}: ${u.name} (${u.email}) - ${u.department}`));

        // Check History (Explicitly print details)
        const history = await classhistory.find({});
        console.log(`\n--- CLASS HISTORY (${history.length}) ---`);
        history.forEach(h => {
            console.log(`ID: ${h._id}`);
            console.log(`  Date: ${h.startTime ? h.startTime.toISOString() : 'N/A'}`);
            console.log(`  Subject: '${h.subject}'`);
            console.log(`  Dept: '${h.dept}'`);
            console.log(`  Sem: ${h.semester}`);
            console.log(`  Section: '${h.section}'`);
            console.log(`  Teacher: ${h.teacher}`);
        });

        process.exit();
    })
    .catch(err => console.error(err));
