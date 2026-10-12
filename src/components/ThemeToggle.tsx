import { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';
const KEY = 'crowsnest.theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem(KEY) as Theme) || 'system'; } catch { return 'system'; }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
    try { localStorage.setItem(KEY, theme); } catch { /* storage blocked */ }
  }, [theme]);
  const next: Record<Theme, Theme> = { system: 'dark', dark: 'light', light: 'system' };
  const label = { system: 'Theme: system', dark: 'Theme: dark', light: 'Theme: light' }[theme];
  return (
    <button className="icon-btn" onClick={() => setTheme(next[theme])} title={label} aria-label={label}>
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden fill="currentColor">
        {theme === 'dark' && <path d="M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5a6.5 6.5 0 1 0 8.1 8.1Z" />}
        {theme === 'light' && <><circle cx="10" cy="10" r="3.6" />{[0, 45, 90, 135, 180, 225, 270, 315].map((d) => <rect key={d} x="9.2" y="1.2" width="1.6" height="3" rx=".8" transform={`rotate(${d} 10 10)`} />)}</>}
        {theme === 'system' && <path d="M10 2.5a7.5 7.5 0 1 0 0 15Zm0 1.6a5.9 5.9 0 0 1 0 11.8Z" fillRule="evenodd" />}
      </svg>
    </button>
  );
}
