import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/setup',
}));

// Mock env
vi.mock('@/lib/env', () => ({
  env: { apiUrl: 'http://localhost:8000' },
}));

// Mock stores
const mockSetSelectedLocationId = vi.fn();
vi.mock('@/stores/locationStore', () => ({
  useLocationStore: () => ({
    selectedLocationId: null,
    setSelectedLocationId: mockSetSelectedLocationId,
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

describe('SetupWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders all 4 step buttons', async () => {
    const SetupPage = (await import('@/app/(dashboard)/setup/page')).default;
    render(<SetupPage />);

    expect(screen.getAllByText(/Site Details/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Provider Number/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/HW027/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/PRODA Link/).length).toBeGreaterThanOrEqual(1);
  });

  it('starts on site details step', async () => {
    const SetupPage = (await import('@/app/(dashboard)/setup/page')).default;
    render(<SetupPage />);

    expect(screen.getByText('Step 1: Site Details')).toBeTruthy();
    expect(screen.getByTestId('site-name')).toBeTruthy();
  });

  it('shows create site button initially', async () => {
    const SetupPage = (await import('@/app/(dashboard)/setup/page')).default;
    render(<SetupPage />);

    expect(screen.getByText('Create Site')).toBeTruthy();
  });

  it('validates site name is required', async () => {
    const SetupPage = (await import('@/app/(dashboard)/setup/page')).default;
    render(<SetupPage />);

    fireEvent.click(screen.getByText('Create Site'));

    await waitFor(() => {
      expect(screen.getByText('Site name is required')).toBeTruthy();
    });
  });

  it('navigates to provider step when clicking step button', async () => {
    const SetupPage = (await import('@/app/(dashboard)/setup/page')).default;
    render(<SetupPage />);

    fireEvent.click(screen.getByText(/Provider Number/));

    expect(screen.getByText('Step 2: Provider Number')).toBeTruthy();
  });

  it('navigates to hw027 step', async () => {
    const SetupPage = (await import('@/app/(dashboard)/setup/page')).default;
    render(<SetupPage />);

    fireEvent.click(screen.getByText(/HW027/));

    expect(screen.getByText('Step 3: HW027 Form')).toBeTruthy();
  });

  it('navigates to proda step', async () => {
    const SetupPage = (await import('@/app/(dashboard)/setup/page')).default;
    render(<SetupPage />);

    fireEvent.click(screen.getByText(/PRODA Link/));

    expect(screen.getByText('Step 4: PRODA Linking & Verification')).toBeTruthy();
  });

  it('shows back button on provider step', async () => {
    const SetupPage = (await import('@/app/(dashboard)/setup/page')).default;
    render(<SetupPage />);

    fireEvent.click(screen.getByText(/Provider Number/));

    expect(screen.getByText('Back')).toBeTruthy();
  });

  it('provider number input accepts text', async () => {
    const SetupPage = (await import('@/app/(dashboard)/setup/page')).default;
    render(<SetupPage />);

    fireEvent.click(screen.getByText(/Provider Number/));

    const input = screen.getByTestId('provider-number-input');
    fireEvent.change(input, { target: { value: '1234567A' } });
    expect((input as HTMLInputElement).value).toBe('1234567A');
  });

  it('validates provider number length', async () => {
    const SetupPage = (await import('@/app/(dashboard)/setup/page')).default;
    render(<SetupPage />);

    fireEvent.click(screen.getByText(/Provider Number/));

    const input = screen.getByTestId('provider-number-input');
    fireEvent.change(input, { target: { value: '123' } });

    fireEvent.click(screen.getByText('Link Provider'));

    await waitFor(() => {
      expect(screen.getByText('Provider number must be 6-8 characters')).toBeTruthy();
    });
  });

  it('shows PRODA link status on final step', async () => {
    const SetupPage = (await import('@/app/(dashboard)/setup/page')).default;
    render(<SetupPage />);

    fireEvent.click(screen.getByText(/PRODA Link/));

    expect(screen.getByText('PRODA Link Status:')).toBeTruthy();
    expect(screen.getByText('pending')).toBeTruthy();
  });

  it('shows setup summary on proda step', async () => {
    const SetupPage = (await import('@/app/(dashboard)/setup/page')).default;
    render(<SetupPage />);

    fireEvent.click(screen.getByText(/PRODA Link/));

    expect(screen.getByText('Setup Summary:')).toBeTruthy();
  });
});
