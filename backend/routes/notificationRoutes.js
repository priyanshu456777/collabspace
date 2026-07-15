const express = require('express');
const { protect } = require('../middleware/auth');
const notif = require('../controllers/notificationController');

const router = express.Router();

router.use(protect);
router.get('/', notif.getNotifications);
router.patch('/read', notif.markAsRead);

module.exports = router;
