/**
 * Optional helper: populates the local database with two demo users and a
 * shared room so you can log in as two people (e.g. in two browser windows,
 * one normal + one incognito) and see real-time sync immediately.
 *
 * Run with: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Room = require('../models/Room');
const Document = require('../models/Document');

async function seed() {
  await connectDB();

  await User.deleteMany({ email: { $in: ['priya@example.com', 'sam@example.com'] } });
  await Room.deleteMany({ name: 'Demo Room' });

  const priya = await User.create({ name: 'Priya Sharma', email: 'priya@example.com', password: 'password123' });
  const sam = await User.create({ name: 'Sam Verma', email: 'sam@example.com', password: 'password123' });

  const room = await Room.create({
    name: 'Demo Room',
    description: 'Seeded room for quick manual testing of real-time sync.',
    inviteCode: 'demo1234',
    owner: priya._id,
    members: [
      { user: priya._id, role: 'owner' },
      { user: sam._id, role: 'editor' },
    ],
  });

  const document = await Document.create({
    room: room._id,
    title: 'Demo Room - Document',
    content: 'This is a shared document. Open this room in two browser windows to see live sync.\n',
  });

  room.document = document._id;
  await room.save();

  console.log('Seed complete:');
  console.log('  User 1: priya@example.com / password123');
  console.log('  User 2: sam@example.com / password123');
  console.log('  Room invite code: demo1234');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
