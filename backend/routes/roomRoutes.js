const express = require('express');
const { protect } = require('../middleware/auth');
const room = require('../controllers/roomController');
const router = express.Router();
router.use(protect); // every room route requires authentication
router.post('/', room.createRoom);
router.get('/', room.getMyRooms);
router.post('/join', room.joinRoom);
router.get('/:id', room.getRoom);
router.post('/:id/leave', room.leaveRoom);
router.get('/:id/activity', room.getActivity);
router.patch('/:id/members/:userId/role', room.updateMemberRole);
module.exports = router;