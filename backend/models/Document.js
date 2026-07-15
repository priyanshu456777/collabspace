const mongoose = require('mongoose');

/**
 * A Document holds the live shared text for a room.
 *
 * `revision` is incremented on every accepted write and is the backbone of
 * our conflict handling: a client must tell the server which revision its
 * edit was based on. If the server's revision has moved on since then, the
 * server does not blindly overwrite - it diff-merges the incoming change
 * against what actually happened in between (see socket/socketHandler.js).
 */
const DocumentSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      unique: true,
    },
    title: {
      type: String,
      default: 'Untitled document',
      maxlength: 120,
    },
    content: {
      type: String,
      default: '',
    },
    revision: {
      type: Number,
      default: 0,
    },
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', DocumentSchema);
