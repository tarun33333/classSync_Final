const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Try finding user first
            req.user = await User.findById(decoded.id).select('-password');

            // If not found, try finding Admin
            if (!req.user) {
                const Admin = require('../models/Admin');
                const admin = await Admin.findById(decoded.id).select('-password');
                if (admin) {
                    req.user = admin;
                    req.user.role = 'admin'; // Ensure role is set
                }
            }

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const teacherOnly = (req, res, next) => {
    if (req.user && req.user.role === 'teacher') {
        next();
    } else {
        console.log('Teacher Auth Failed for User:', req.user ? req.user._id : 'null', 'Role:', req.user ? req.user.role : 'N/A');
        res.status(403).json({ message: 'Not authorized, teachers only' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, no user found' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = { protect, teacherOnly, authorize };
