import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../context/ThemeContext';
import SettingsPage from './SettingsPage';
import { settingsApi, type SystemSettings } from '../api/settingsApi';
import { useAuthStore } from '../../../store/authStore';

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
    // Settings tabs depend on the role; school details are for admins.
    useAuthStore.setState({ token: 't', user: { id: 'u1', name: 'Admin', role: 'admin' } });
    document.documentElement.classList.remove('dark');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.mocked(settingsApi.getSystemSettings).mockResolvedValue(settings);
    vi.mocked(settingsApi.updateSystemSettings).mockResolvedValue(settings);
  });

  it('loads settings, shows the save bar only for unsaved edits, discards, saves, and switches theme', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ThemeProvider><SettingsPage /></ThemeProvider></MemoryRouter>);

    const schoolName = await screen.findByLabelText('School name');
    expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();

    await user.clear(schoolName);
    await user.type(schoolName, 'Changed School');
    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByLabelText('School name')).toHaveValue('Test School');
    expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('School name'), '!');
    vi.mocked(settingsApi.updateSystemSettings).mockResolvedValue({ ...settings, schoolName: 'Test School!' });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(settingsApi.updateSystemSettings).toHaveBeenCalledWith(expect.objectContaining({ schoolName: 'Test School!' })));
    await waitFor(() => expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: /logo & theme/i }));
    await user.click(screen.getByRole('radio', { name: /dark/i }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
