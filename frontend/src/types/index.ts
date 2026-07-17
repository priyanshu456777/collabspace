export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarImage: string | null;
  bio: string;
  role: 'user' | 'admin';
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

// Nested user references that come back from Mongoose .populate() calls
// (e.g. room.members[].user, activity.user) use Mongo's raw _id field,
// unlike the top-level session `User` above which is reshaped by
// toSafeObject() on the backend to expose `id`. Keeping these as separate
// types avoids silently reading a field that doesn't exist on one of them.
export interface PopulatedUserRef {
  _id: string;
  name: string;
  email?: string;
  avatarColor: string;
  avatarImage?: string | null;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface RoomMember {
  user: PopulatedUserRef;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
}

export interface DocumentSummary {
  _id: string;
  title: string;
  content: string;
  revision: number;
}

export interface Room {
  _id: string;
  name: string;
  description: string;
  inviteCode: string;
  owner: PopulatedUserRef | string;
  members: RoomMember[];
  document: DocumentSummary | string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  _id: string;
  room: string;
  user: { _id: string; name: string; avatarColor: string; avatarImage?: string | null };
  type: 'join' | 'leave' | 'edit' | 'room_created' | 'conflict_resolved' | 'role_changed';
  createdAt: string;
}

export interface DocumentVersion {
  _id: string;
  content: string;
  revision: number;
  editedBy?: { _id: string; name: string; avatarColor: string; avatarImage?: string | null };
  reason: 'autosave' | 'conflict-merge' | 'manual';
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: 'room_invite' | 'user_joined' | 'mention' | 'conflict_resolved' | 'role_changed';
  actor?: { name: string; avatarColor: string; avatarImage?: string | null };
}

export interface Analytics {
  roomsCount: number;
  ownedCount: number;
  collaboratorsCount: number;
  totalEdits: number;
  mostActiveRoom: { name: string; edits: number } | null;
  activityTrend: { date: string; count: number }[];
}

export interface PresenceUser {
  userId: string;
  name: string;
  avatarColor: string;
  cursor: number | null;
}