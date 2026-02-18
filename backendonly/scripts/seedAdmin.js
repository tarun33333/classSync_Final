const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const seedAdmin = async () => {
    await connectDB();

    const adminExists = await Admin.findOne({ email: 'admin@example.com' }); // Default admin email
    if (adminExists) {
        console.log('Admin already exists');
        process.exit();
    }

    const admin = new Admin({
        name: 'Super Admin',
        email: 'admin@example.com',
        password: 'adminpassword123' // Change this in production
    });

    await admin.save();
    console.log('Admin account created successfully');
    process.exit();
};

seedAdmin();
