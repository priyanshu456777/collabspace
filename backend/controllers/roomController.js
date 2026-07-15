const crypto = require('crypto');
const Room = require('../models/Room');
const Document = require('../models/Document');
const Activity = require('../models/Activity');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex'); // e.g. "a1b2c3d4"
}

// POST /api/rooms
exports.createRoom = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;
  if (!name || name.trim().length < 2) {
    return next(new AppError('Room name must be at least 2 characters.', 400));
  }

  let inviteCode;
  let attempts = 0;
  do {
    inviteCode = generateInviteCode();
    attempts += 1;
    // eslint-disable-next-line no-await-in-loop
    var existing = await Room.findOne({ inviteCode });
  } while (existing && attempts < 5);

  const room = await Room.create({
    name: name.trim(),
    description: description?.trim() || '',
    inviteCode,
    owner: req.user._id,
    members: [{ user: req.user._id, role: 'owner' }],
  });

  const document = await Document.create({
    room: room._id,
    title: `${room.name} - Document`,
    content: '',
  });

  room.document = document._id;
  await room.save();

  await Activity.create({ room: room._id, user: req.user._id, type: 'room_created' });

  const populated = await Room.findById(room._id).populate('members.user', 'name email avatarColor isOnline');

  res.status(201).json({ success: true, room: populated });
});

// GET /api/rooms  -> rooms the current user is a member of
exports.getMyRooms = catchAsync(async (req, res) => {
  const { search } = req.query;
  const query = { 'members.user': req.user._id };
  if (search) {
    query.$text = { $search: search };
  }

  const rooms = await Room.find(query)
    .populate('members.user', 'name email avatarColor isOnline')
    .populate('owner', 'name email')
    .sort({ updatedAt: -1 });

  res.status(200).json({ success: true, count: rooms.length, rooms });
});

// GET /api/rooms/:id
exports.getRoom = catchAsync(async (req, res, next) => {
  const room = await Room.findById(req.params.id)
    .populate('members.user', 'name email avatarColor isOnline lastSeen')
    .populate('owner', 'name email')
    .populate('document');

  if (!room) return next(new AppError('Room not found.', 404));

  const isMember = room.members.some((m) => m.user._id.equals(req.user._id));
  if (!isMember) return next(new AppError('You are not a member of this room.', 403));

  res.status(200).json({ success: true, room });
});

// POST /api/rooms/join  { inviteCode }
exports.joinRoom = catchAsync(async (req, res, next) => {
  const { inviteCode } = req.body;
  if (!inviteCode) return next(new AppError('An invite code is required.', 400));

  const room = await Room.findOne({ inviteCode: inviteCode.trim().toLowerCase() });
  if (!room) return next(new AppError('Invalid invite code.', 404));

  const alreadyMember = room.members.some((m) => m.user.equals(req.user._id));
  if (!alreadyMember) {
    room.members.push({ user: req.user._id, role: 'editor' });
    await room.save();
    await Activity.create({ room: room._id, user: req.user._id, type: 'join' });
  }

  const populated = await Room.findById(room._id).populate('members.user', 'name email avatarColor isOnline');

  res.status(200).json({ success: true, room: populated });
});

// POST /api/rooms/:id/leave
exports.leaveRoom = catchAsync(async (req, res, next) => {
  const room = await Room.findById(req.params.id);
  if (!room) return next(new AppError('Room not found.', 404));

  if (room.owner.equals(req.user._id)) {
    return next(new AppError('Room owner cannot leave. Delete the room instead, or transfer ownership.', 400));
  }

  room.members = room.members.filter((m) => !m.user.equals(req.user._id));
  await room.save();
  await Activity.create({ room: room._id, user: req.user._id, type: 'leave' });

  res.status(200).json({ success: true, message: 'You left the room.' });
});

// GET /api/rooms/:id/activity
exports.getActivity = catchAsync(async (req, res, next) => {
  const activity = await Activity.find({ room: req.params.id })
    .populate('user', 'name avatarColor')
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({ success: true, activity });
});
// PATCH /api/rooms/:id/members/:userId/role   { role: 'editor' | 'viewer' }
// Only the room owner can change another member's role. The owner's own
// role can't be changed this way (ownership transfer is a separate,
// more sensitive operation this app doesn't support yet).
exports.updateMemberRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  const { id: roomId, userId } = req.params;

  if (!['editor', 'viewer'].includes(role)) {
    return next(new AppError("Role must be 'editor' or 'viewer'.", 400));
  }

  const room = await Room.findById(roomId);
  if (!room) return next(new AppError('Room not found.', 404));

  if (!room.owner.equals(req.user._id)) {
    return next(new AppError('Only the room owner can change member roles.', 403));
  }

  if (room.owner.equals(userId)) {
    return next(new AppError("The owner's role can't be changed.", 400));
  }

  const member = room.members.find((m) => m.user.equals(userId));
  if (!member) return next(new AppError('That user is not a member of this room.', 404));

  member.role = role;
  await room.save();

  await Activity.create({
    room: room._id,
    user: req.user._id,
    type: 'role_changed',
  });

  const populated = await Room.findById(room._id).populate('members.user', 'name email avatarColor isOnline');

  res.status(200).json({ success: true, room: populated });
});
