'use client';

import { useCallback, useEffect, useState } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Reads the class applied by the pre-hydration inline script (ThemeScript)
    // so the icon matches without causing a server/client render mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('collabspace-theme', next ? 'dark' : 'light');
    setIsDark(next);
  }, []);

  return { isDark, toggle };
}
