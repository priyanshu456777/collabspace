'use client';

import { useRef, useState, FormEvent, DragEvent } from 'react';
import { Camera, X } from 'lucide-react';
import { useAuth, ApiError } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { resizeImageToDataUrl } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import type { User } from '@/types';

const COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EC4899', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB raw file, before client-side resize

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || COLORS[0]);
  const [avatarImage, setAvatarImage] = useState<string | null>(user?.avatarImage ?? null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  if (!user) return null;

  async function processImageFile(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      showToast('That image is too large. Please choose one under 5MB.', 'error');
      return;
    }
    setImageProcessing(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setAvatarImage(dataUrl);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not process that image.', 'error');
    } finally {
      setImageProcessing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    e.target.value = ''; // allow re-selecting the same file later
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await api.patch<{ user: User }>('/auth/profile', { name, bio, avatarColor, avatarImage });
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
          <div className="flex items-center gap-5">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all ${
                dragActive ? 'ring-2 ring-brass ring-offset-2 ring-offset-paper-raised' : ''
              }`}
              title="Click or drop an image to change your profile picture"
            >
              <Avatar name={name || user.name} color={avatarColor} imageUrl={avatarImage} size="lg" />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/0 text-white opacity-0 transition-all group-hover:bg-ink/40 group-hover:opacity-100">
                {imageProcessing ? (
                  <span className="text-[10px]">…</span>
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex-1">
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
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium text-brass hover:underline"
                >
                  Upload photo
                </button>
                {avatarImage && (
                  <button
                    type="button"
                    onClick={() => setAvatarImage(null)}
                    className="flex items-center gap-1 text-xs text-ink-soft hover:text-danger"
                  >
                    <X className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-ink-soft">
                Click, drag &amp; drop, or pick a color instead. JPG/PNG, up to 5MB.
              </p>
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
          <Button type="submit" loading={profileLoading} disabled={imageProcessing}>
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