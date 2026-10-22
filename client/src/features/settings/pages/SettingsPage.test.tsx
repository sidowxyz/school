import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../context/ThemeContext';
import SettingsPage from './SettingsPage';
import { settingsApi, type SystemSettings } from '../api/settingsApi';

vi.mock('../api/settingsApi', async () => {
  const actual = await vi.importActual<typeof import('../api/settingsApi')>('../api/settingsApi');
  return { ...actual, settingsApi: { ...actual.settingsApi, getSystemSettings: vi.fn(), updateSystemSettings: vi.fn(), uploadLogo: vi.fn() } };
});

const settings: SystemSettings = {
  _id: 'settings-1', schoolName: 'Test School', schoolCode: 'TS-1',
  schoolEmail: 'school@test.com', schoolPhone: '0610000000', address: 'Mogadishu',
  website: 'https://school.test', principalName: 'Test Principal',
  timezone: 'Africa/Mogadishu', language: 'English', logoUrl: '/logo.png',
  brandingColors: { primary: '#16A34A', secondary: '#1E3A8A' }, discountRule: 'highest_only',
};

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.mocked(settingsApi.getSystemSettings).mockResolvedValue(settings);
    vi.mocked(settingsApi.updateSystemSettings).mockResolvedValue(settings);
  });

  it('loads real settings, resets edits, saves, and activates dark mode', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ThemeProvider><SettingsPage /></ThemeProvider></MemoryRouter>);

    const schoolName = await screen.findByLabelText('School Name');
    await user.clear(schoolName);
    await user.type(schoolName, 'Changed School');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByLabelText('School Name')).toHaveValue('Test School');

    await user.click(screen.getByRole('button', { name: 'Branding' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Portal theme' }), 'dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(settingsApi.updateSystemSettings).toHaveBeenCalled());
    expect(await screen.findByText('Settings Saved')).toBeInTheDocument();
  });
});
