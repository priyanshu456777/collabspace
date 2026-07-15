const { validationResult } = require('express-validator');

// Runs after a chain of express-validator checks; if any failed, returns a
// 400 with the first message instead of letting bad data reach the controller.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
}

module.exports = validate;
