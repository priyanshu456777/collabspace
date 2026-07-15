const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const { signToken, setTokenCookie, clearTokenCookie } = require('../utils/jwt');
const AppError = require('../utils/AppError');

// POST /api/auth/signup
exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new AppError('Name, email, and password are all required.', 400));
  }
  if (password.length < 6) {
    return next(new AppError('Password must be at least 6 characters.', 400));
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return next(new AppError('An account with that email already exists.', 409));
  }

  const user = await User.create({ name, email, password });
  const token = signToken(user._id);
  setTokenCookie(res, token);

  res.status(201).json({ success: true, user: user.toSafeObject() });
});

// POST /api/auth/login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Email and password are required.', 400));
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }

  user.isOnline = true;
  user.lastSeen = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);
  setTokenCookie(res, token);

  res.status(200).json({ success: true, user: user.toSafeObject() });
});

// POST /api/auth/logout
exports.logout = catchAsync(async (req, res) => {
  if (req.user) {
    req.user.isOnline = false;
    req.user.lastSeen = new Date();
    await req.user.save({ validateBeforeSave: false });
  }
  clearTokenCookie(res);
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me  (used for "auto login" / session restore on refresh)
exports.getMe = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, user: req.user.toSafeObject() });
});

// PATCH /api/auth/profile
exports.updateProfile = catchAsync(async (req, res, next) => {
  const { name, bio, avatarColor } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (bio !== undefined) updates.bio = bio;
  if (avatarColor !== undefined) updates.avatarColor = avatarColor;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, user: user.toSafeObject() });
});

// PATCH /api/auth/password
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return next(new AppError('Current and new password are required.', 400));
  }
  if (newPassword.length < 6) {
    return next(new AppError('New password must be at least 6 characters.', 400));
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  user.password = newPassword;
  await user.save();

  const token = signToken(user._id);
  setTokenCookie(res, token);

  res.status(200).json({ success: true, message: 'Password updated successfully.' });
});
