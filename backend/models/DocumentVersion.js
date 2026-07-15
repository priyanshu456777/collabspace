const mongoose = require('mongoose');

/**
 * Immutable snapshot of a document at a point in time. A new version is
 * saved periodically (see socketHandler debounce) and whenever a conflict
 * is resolved, so users can inspect or restore prior states.
 */
const DocumentVersionSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    revision: {
      type: Number,
      required: true,
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      enum: ['autosave', 'conflict-merge', 'manual'],
      default: 'autosave',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DocumentVersion', DocumentVersionSchema);
