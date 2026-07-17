const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const Room = require('../models/Room');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

async function assertMembership(roomId, userId) {
  const room = await Room.findById(roomId);
  if (!room) throw new AppError('Room not found.', 404);
  const isMember = room.members.some((m) => m.user.equals(userId));
  if (!isMember) throw new AppError('You are not a member of this room.', 403);
  return room;
}

// GET /api/documents/:roomId/versions
exports.getVersionHistory = catchAsync(async (req, res) => {
  await assertMembership(req.params.roomId, req.user._id);

  const versions = await DocumentVersion.find({ room: req.params.roomId })
    .populate('editedBy', 'name avatarColor avatarImage')
    .sort({ revision: -1 })
    .limit(30);

  res.status(200).json({ success: true, versions });
});

// POST /api/documents/:roomId/restore/:versionId
exports.restoreVersion = catchAsync(async (req, res, next) => {
  await assertMembership(req.params.roomId, req.user._id);

  const version = await DocumentVersion.findById(req.params.versionId);
  if (!version || String(version.room) !== req.params.roomId) {
    return next(new AppError('Version not found.', 404));
  }

  const document = await Document.findOne({ room: req.params.roomId });
  document.content = version.content;
  document.revision += 1;
  document.lastEditedBy = req.user._id;
  await document.save();

  await DocumentVersion.create({
    document: document._id,
    room: document.room,
    content: document.content,
    revision: document.revision,
    editedBy: req.user._id,
    reason: 'manual',
  });

  res.status(200).json({ success: true, document });
});

// GET /api/documents/:roomId/export  -> plain text export (Export Data feature)
exports.exportDocument = catchAsync(async (req, res, next) => {
  await assertMembership(req.params.roomId, req.user._id);

  const document = await Document.findOne({ room: req.params.roomId });
  if (!document) return next(new AppError('Document not found.', 404));

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${document.title.replace(/[^a-z0-9-_]/gi, '_')}.txt"`);
  res.status(200).send(document.content);
});