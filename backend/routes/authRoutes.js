const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const auth = require('../controllers/authController');

const router = express.Router();

// Stricter limiter on auth endpoints to blunt brute-force / credential
// stuffing attempts, separate from the general API limiter in server.js
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});

router.post(
  '/signup',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters.'),
    body('email').isEmail().withMessage('Please provide a valid email.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  ],
  validate,
  auth.signup
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please provide a valid email.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  auth.login
);

router.post('/logout', protect, auth.logout);
router.get('/me', protect, auth.getMe);
router.patch('/profile', protect, auth.updateProfile);
router.patch('/password', protect, auth.updatePassword);

module.exports = router;
