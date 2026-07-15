'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // The proxy/middleware can't reliably check auth in production, since
    // the auth cookie lives on the backend's domain (Render) and is
    // invisible to requests made to the frontend's own domain (Vercel).
    // So the real "are you logged in" check happens here, client-side,
    // once AuthProvider has resolved /api/auth/me.
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Avoid flashing protected content (or a premature redirect) while the
  // session check is still in flight.
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm text-ink/60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}