'use client';

import { useState, FormEvent } from 'react';
import { useAuth, ApiError } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import type { User } from '@/types';

const COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EC4899', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6'];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || COLORS[0]);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  if (!user) return null;

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await api.patch<{ user: User }>('/auth/profile', { name, bio, avatarColor });
      await refreshUser();
      showToast('Profile updated.', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update profile.', 'error');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordLoading(true);
    try {
      await api.patch('/auth/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      showToast('Password updated.', 'success');
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Could not update password.');
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl text-ink">Settings</h1>
      <p className="mt-1 mb-8 text-sm text-ink-soft">Manage your profile and account security.</p>

      <section className="rounded-xl border border-line bg-paper-raised p-6">
        <h2 className="mb-5 font-display text-lg text-ink">Profile</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={name || user.name} color={avatarColor} size="lg" />
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className="h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-paper-raised"
                  style={{ backgroundColor: c, outline: avatarColor === c ? `2px solid ${c}` : 'none' }}
                  aria-label={`Choose color ${c}`}
                />
              ))}
            </div>
          </div>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={user.email} disabled />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              className="w-full rounded-md border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/50"
              placeholder="A short line about you"
            />
          </div>
          <Button type="submit" loading={profileLoading}>
            Save profile
          </Button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-line bg-paper-raised p-6">
        <h2 className="mb-5 font-display text-lg text-ink">Change password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <Input
            label="Current password"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New password"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
          <Button type="submit" variant="secondary" loading={passwordLoading}>
            Update password
          </Button>
        </form>
      </section>
    </div>
  );
}
