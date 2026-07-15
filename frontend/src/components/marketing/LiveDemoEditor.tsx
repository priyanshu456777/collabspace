'use client';

import { useEffect, useState } from 'react';

const LINE_1 = 'Q3 roadmap notes';
const LINE_2 = 'Priya is drafting the intro while Sam edits section 2 — ';
const LINE_3 = 'both changes land, nothing gets lost.';

function useTypewriter(text: string, speed: number, startDelay: number) {
  const [out, setOut] = useState('');

  useEffect(() => {
    let i = 0;
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setOut(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return out;
}

export function LiveDemoEditor() {
  const line2 = useTypewriter(LINE_2, 38, 500);
  const line3 = useTypewriter(LINE_3, 32, 2600);

  return (
    <div className="relative rounded-2xl border border-line bg-paper-raised p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-brass/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-teal/70" />
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
          rev. 214 · synced
        </div>
      </div>

      <div className="flex gap-4">
        {/* margin presence rail - the signature element */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <span
            className="h-6 w-1 rounded-full"
            style={{ backgroundColor: '#2F6F6B' }}
            title="Priya"
          />
          <span
            className="h-10 w-1 rounded-full"
            style={{ backgroundColor: '#B3812F' }}
            title="Sam"
          />
        </div>

        <div className="flex-1 font-mono text-sm leading-7 text-ink">
          <p className="mb-2 font-display text-lg font-medium text-ink">{LINE_1}</p>
          <p className="text-ink-soft">
            {line2}
            <span className="animate-caret text-teal">▍</span>
          </p>
          <p className="text-ink-soft">
            {line3}
            {line3.length > 0 && line3.length < LINE_3.length && (
              <span className="animate-caret text-brass">▍</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
        <div className="flex -space-x-2">
          <div className="h-7 w-7 rounded-full border-2 border-paper-raised" style={{ backgroundColor: '#2F6F6B' }} />
          <div className="h-7 w-7 rounded-full border-2 border-paper-raised" style={{ backgroundColor: '#B3812F' }} />
        </div>
        <p className="text-xs text-ink-soft">Priya and Sam are editing this document right now</p>
      </div>
    </div>
  );
}
