import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';

function ThemeControls() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return <div><span>{theme}:{resolvedTheme}</span><button onClick={() => setTheme('dark')}>Dark</button><button onClick={() => setTheme('light')}>Light</button></div>;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });

  it('applies and persists dark mode, then returns to light mode', async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeControls /></ThemeProvider>);

    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByText('dark:dark')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
