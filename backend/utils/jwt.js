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
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    // In production the frontend (Vercel) and backend (Render) are on
    // different domains, so this is a cross-site request from the
    // browser's point of view. SameSite=Lax cookies are not sent on
    // cross-site fetches, which silently breaks auth. SameSite=None allows
    // the cookie to be sent cross-site, but browsers require `Secure` to
    // be set whenever SameSite=None is used - which is already true here
    // since isProd also implies HTTPS on both ends.
    sameSite: isProd ? 'none' : 'lax',
    maxAge: days * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearTokenCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  // clearCookie must be called with the same path/sameSite/secure options
  // used when the cookie was set, or the browser will treat it as a
  // different cookie and silently ignore the clear.
  res.clearCookie('token', {
    path: '/',
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  });
}

module.exports = { signToken, verifyToken, setTokenCookie, clearTokenCookie };