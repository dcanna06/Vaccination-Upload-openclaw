import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/settings',
}));

// Mock env
vi.mock('@/lib/env', () => ({
  env: { apiUrl: 'http://localhost:8000' },
}));

// Mock stores
let mockSelectedLocationId: number | null = null;
vi.mock('@/stores/locationStore', () => ({
  useLocationStore: () => ({
    selectedLocationId: mockSelectedLocationId,
    setSelectedLocationId: vi.fn(),
  }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { first_name: 'Test', last_name: 'User' },
    checkAuth: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedLocationId = null;
    global.fetch = vi.fn();
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('air-provider-settings');
    }
  });

  it('renders provider settings form', async () => {
    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;
    render(<SettingsPage />);

    expect(screen.getByText('Provider Settings')).toBeTruthy();
    expect(screen.getByTestId('provider-number')).toBeTruthy();
    expect(screen.getByTestId('hpio-number')).toBeTruthy();
    expect(screen.getByTestId('hpii-number')).toBeTruthy();
  });

  it('shows warning when no location selected', async () => {
    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;
    render(<SettingsPage />);

    expect(screen.getByText(/No location selected/)).toBeTruthy();
  });

  it('validates provider number on save', async () => {
    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;
    render(<SettingsPage />);

    fireEvent.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-error')).toBeTruthy();
      expect(screen.getByText('Provider number is required')).toBeTruthy();
    });
  });

  it('validates provider number length', async () => {
    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;
    render(<SettingsPage />);

    const input = screen.getByTestId('provider-number');
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText('Provider number must be 6-8 characters')).toBeTruthy();
    });
  });

  it('validates HPI-O number format', async () => {
    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;
    render(<SettingsPage />);

    const provInput = screen.getByTestId('provider-number');
    fireEvent.change(provInput, { target: { value: '1234567A' } });

    const hpioInput = screen.getByTestId('hpio-number');
    fireEvent.change(hpioInput, { target: { value: 'invalid' } });

    fireEvent.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText('HPI-O Number must be exactly 16 digits')).toBeTruthy();
    });
  });

  it('saves to localStorage when no location selected', async () => {
    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;
    render(<SettingsPage />);

    const input = screen.getByTestId('provider-number');
    fireEvent.change(input, { target: { value: '1234567A' } });
    fireEvent.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully.')).toBeTruthy();
    });

    const stored = JSON.parse(localStorage.getItem('air-provider-settings') || '{}');
    expect(stored.providerNumber).toBe('1234567A');
  });

  it('loads provider from backend when location is selected', async () => {
    mockSelectedLocationId = 1;

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/locations/1')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 1,
              name: 'Test Clinic',
              minor_id: 'MI-001',
              proda_link_status: 'linked',
            }),
        });
      }
      if (url.includes('/api/providers')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 1, provider_number: 'BACK001A', provider_type: 'GP' },
            ]),
        });
      }
      return Promise.resolve({ ok: false });
    });

    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Selected Location')).toBeTruthy();
    });
  });

  it('displays Minor ID from selected location', async () => {
    mockSelectedLocationId = 1;

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/locations/1')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 1,
              name: 'Clinic A',
              minor_id: 'MI-999',
              proda_link_status: 'pending',
            }),
        });
      }
      if (url.includes('/api/providers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({ ok: false });
    });

    const SettingsPage = (await import('@/app/(dashboard)/settings/page')).default;
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('MI-999')).toBeTruthy();
    });
  });
});
