const jwt = require('jsonwebtoken');

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Sets the auth token as an httpOnly cookie on the response. Using an
 * httpOnly cookie (rather than localStorage) means client-side JS can never
 * read the token, which is the main defense against token theft via XSS.
 */
function setTokenCookie(res, token) {
  const days = Number(process.env.JWT_COOKIE_EXPIRES_DAYS || 7);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: days * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearTokenCookie(res) {
  res.clearCookie('token', { path: '/' });
}

module.exports = { signToken, verifyToken, setTokenCookie, clearTokenCookie };
