import Link from 'next/link';
import { ArrowRight, GitMerge, Radio, History } from 'lucide-react';
import { LiveDemoEditor } from '@/components/marketing/LiveDemoEditor';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-ink dark:bg-brass" />
          <span className="font-display text-lg text-ink">CollabSpace</span>
        </div>
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="text-sm font-medium text-ink-soft hover:text-ink">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90 dark:bg-brass dark:text-ink"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-14 px-6 pb-24 pt-10 md:grid-cols-2 md:items-center md:pt-16">
        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">
            Real-time document collaboration
          </p>
          <h1 className="font-display text-5xl leading-[1.05] text-ink md:text-6xl">
            Write together, <br /> without stepping <br /> on each other.
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink-soft">
            CollabSpace syncs every keystroke across a room in real time, and merges concurrent
            edits automatically instead of letting one person&apos;s work overwrite another&apos;s.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-ink px-6 py-3 font-medium text-paper hover:bg-ink/90 dark:bg-brass dark:text-ink"
            >
              Create your first room <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="font-medium text-ink-soft hover:text-ink">
              I already have an account
            </Link>
          </div>

          <dl className="mt-14 grid grid-cols-3 gap-6 border-t border-line pt-6">
            <div className="flex flex-col gap-2">
              <Radio className="h-4 w-4 text-teal" />
              <dt className="text-sm font-medium text-ink">Live presence</dt>
              <dd className="text-xs text-ink-soft">See who&apos;s here, typing, and where.</dd>
            </div>
            <div className="flex flex-col gap-2">
              <GitMerge className="h-4 w-4 text-teal" />
              <dt className="text-sm font-medium text-ink">Conflict-free sync</dt>
              <dd className="text-xs text-ink-soft">Concurrent edits merge, not overwrite.</dd>
            </div>
            <div className="flex flex-col gap-2">
              <History className="h-4 w-4 text-teal" />
              <dt className="text-sm font-medium text-ink">Version history</dt>
              <dd className="text-xs text-ink-soft">Every revision saved, restorable anytime.</dd>
            </div>
          </dl>
        </div>

        <LiveDemoEditor />
      </section>
    </main>
  );
}
