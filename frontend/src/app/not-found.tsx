import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <p className="font-mono text-sm text-brass">404</p>
      <h1 className="mt-2 font-display text-3xl text-ink">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        The link might be broken, or the page may have moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90 dark:bg-brass dark:text-ink"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
