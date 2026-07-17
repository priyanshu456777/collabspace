const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');

exports.getNotifications = catchAsync(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate('actor', 'name avatarColor avatarImage')
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, read: false });

  res.status(200).json({ success: true, notifications, unreadCount });
});

exports.markAsRead = catchAsync(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { $set: { read: true } });
  res.status(200).json({ success: true });
});