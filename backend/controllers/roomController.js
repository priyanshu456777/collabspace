const crypto = require('crypto');
const Room = require('../models/Room');
const Document = require('../models/Document');
const Activity = require('../models/Activity');
const DocumentVersion = require('../models/DocumentVersion');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { notifyUser } = require('../utils/notify');

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

  const populated = await Room.findById(room._id).populate('members.user', 'name email avatarColor avatarImage isOnline');

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
    .populate('members.user', 'name email avatarColor avatarImage isOnline')
    .populate('owner', 'name email')
    .sort({ updatedAt: -1 });

  res.status(200).json({ success: true, count: rooms.length, rooms });
});

// GET /api/rooms/:id
exports.getRoom = catchAsync(async (req, res, next) => {
  const room = await Room.findById(req.params.id)
    .populate('members.user', 'name email avatarColor avatarImage isOnline lastSeen')
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

    // Fire-and-forget: the join itself shouldn't wait on this.
    notifyUser({
      recipient: room.owner,
      actor: req.user._id,
      room: room._id,
      type: 'user_joined',
      message: `${req.user.name} joined "${room.name}".`,
    }).catch((err) => console.error('[notify] user_joined failed:', err.message));
  }

  const populated = await Room.findById(room._id).populate('members.user', 'name email avatarColor avatarImage isOnline');

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
    .populate('user', 'name avatarColor avatarImage')
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json({ success: true, activity });
});
// GET /api/rooms/analytics/summary
// Powers the dashboard's mini analytics cards. Everything here is derived
// from data already collected for other features (rooms, versions,
// activity) - no new schema needed.
exports.getAnalytics = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const myRooms = await Room.find({ 'members.user': userId }).select('_id name owner members');
  const roomIds = myRooms.map((r) => r._id);
  const ownedCount = myRooms.filter((r) => r.owner.equals(userId)).length;

  const collaboratorIds = new Set();
  myRooms.forEach((r) => {
    r.members.forEach((m) => {
      if (!m.user.equals(userId)) collaboratorIds.add(String(m.user));
    });
  });

  // Last 7 days (UTC midnight-aligned, oldest first) so the trend chart
  // always has a fixed, predictable x-axis regardless of activity gaps.
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d);
  }

  const [totalEdits, versionCountsByRoom, rawTrend] = await Promise.all([
    DocumentVersion.countDocuments({ editedBy: userId }),
    roomIds.length
      ? DocumentVersion.aggregate([
          { $match: { room: { $in: roomIds } } },
          { $group: { _id: '$room', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ])
      : Promise.resolve([]),
    roomIds.length
      ? Activity.aggregate([
          { $match: { room: { $in: roomIds }, createdAt: { $gte: days[0] } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
        ])
      : Promise.resolve([]),
  ]);

  let mostActiveRoom = null;
  if (versionCountsByRoom.length > 0) {
    const top = versionCountsByRoom[0];
    const room = myRooms.find((r) => r._id.equals(top._id));
    if (room) mostActiveRoom = { name: room.name, edits: top.count };
  }

  const trendMap = new Map(rawTrend.map((r) => [r._id, r.count]));
  const activityTrend = days.map((d) => {
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: trendMap.get(key) || 0 };
  });

  res.status(200).json({
    success: true,
    analytics: {
      roomsCount: myRooms.length,
      ownedCount,
      collaboratorsCount: collaboratorIds.size,
      totalEdits,
      mostActiveRoom,
      activityTrend,
    },
  });
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

  notifyUser({
    recipient: userId,
    actor: req.user._id,
    room: room._id,
    type: 'role_changed',
    message: `Your role in "${room.name}" was changed to ${role}.`,
  }).catch((err) => console.error('[notify] role_changed failed:', err.message));

  const populated = await Room.findById(room._id).populate('members.user', 'name email avatarColor avatarImage isOnline');

  res.status(200).json({ success: true, room: populated });
});