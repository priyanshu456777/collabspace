'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <p className="font-mono text-sm text-danger">500</p>
      <h1 className="mt-2 font-display text-3xl text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">
        An unexpected error occurred. You can try again, or head back to your dashboard.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset} variant="secondary">
          Try again
        </Button>
        <a href="/dashboard">
          <Button>Back to dashboard</Button>
        </a>
      </div>
    </div>
  );
}
