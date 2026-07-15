export function ThemeScript() {
  const code = `
    (function () {
      try {
        var stored = localStorage.getItem('collabspace-theme');
        // Default to light unless the user has explicitly chosen dark before.
        // (Previously this also fell back to the OS/browser's system
        // preference via prefers-color-scheme, which meant first-time
        // visitors with a dark system theme saw dark mode without ever
        // clicking anything.)
        var theme = stored === 'dark' ? 'dark' : 'light';
        if (theme === 'dark') document.documentElement.classList.add('dark');
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}