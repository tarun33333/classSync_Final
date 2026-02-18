const express = require('express');
const router = express.Router();
const { loginAdmin, getAllUsers, createUser, deleteUser, updateUser } = require('../controllers/adminController');
const { protectAdmin } = require('../middlewares/adminMiddleware');

router.post('/login', loginAdmin);
router.route('/users')
    .get(protectAdmin, getAllUsers)
    .post(protectAdmin, createUser);
router.route('/users/:id')
    .delete(protectAdmin, deleteUser)
    .put(protectAdmin, updateUser);

module.exports = router;
