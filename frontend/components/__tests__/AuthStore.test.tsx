import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/authStore';

// Reset store state between tests
beforeEach(() => {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });
});

describe('AuthStore', () => {
  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('clearError resets error', () => {
    useAuthStore.setState({ error: 'some error' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('login sets loading state', async () => {
    // Mock fetch to return failure
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' }),
    });

    const result = await useAuthStore.getState().login('test@test.com', 'password123!abc');
    expect(result).toBe(false);
    expect(useAuthStore.getState().error).toBe('Invalid credentials');
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('logout clears user state', async () => {
    useAuthStore.setState({
      user: { id: '1', email: 'test@test.com', first_name: 'Test', last_name: 'User', role: 'provider', status: 'active' },
      isAuthenticated: true,
    });

    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('checkAuth sets authenticated when valid', async () => {
    const mockUser = { id: '1', email: 'test@test.com', first_name: 'Test', last_name: 'User', role: 'provider', status: 'active' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    });

    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('checkAuth sets unauthenticated on 401', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
