const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['join', 'leave', 'edit', 'room_created', 'conflict_resolved', 'role_changed'],
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Newest first, per room - the common access pattern for the activity feed
ActivitySchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);
