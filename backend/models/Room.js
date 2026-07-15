const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    description: {
      type: String,
      maxlength: 300,
      default: '',
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },
  },
  { timestamps: true }
);

RoomSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Room', RoomSchema);
