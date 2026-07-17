const Notification = require('../models/Notification');
const { emitToUser } = require('../socket/socketHandler');

/**
 * Creates a Notification document and, if the recipient has an active
 * socket connection, pushes it to them instantly via `notification:new`.
 * If they're offline, it still lands in the DB and shows up next time
 * they fetch /api/notifications - the socket push is a live-update
 * optimization on top of that, not a replacement for it.
 *
 * Never notifies a user about their own action (e.g. a room owner
 * shouldn't get a "you joined" notice when they created the room).
 */
async function notifyUser({ recipient, actor, room, type, message }) {
  if (!recipient) return null;
  if (actor && String(recipient) === String(actor)) return null;

  const notification = await Notification.create({ recipient, actor, room, type, message });
  const populated = await notification.populate('actor', 'name avatarColor avatarImage');
  const payload = populated.toJSON();

  emitToUser(recipient, 'notification:new', payload);

  return payload;
}

module.exports = { notifyUser };