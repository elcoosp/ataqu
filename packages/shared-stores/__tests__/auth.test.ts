import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../src/auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null, tenantId: null });
  });

  it('login sets token and user', () => {
    const user = { id: '1', email: 'test@test.com', tenantId: 'tenant-1', roles: ['admin'] };
    useAuthStore.getState().login('token123', user);
    const state = useAuthStore.getState();
    expect(state.token).toBe('token123');
    expect(state.user).toEqual(user);
    expect(state.tenantId).toBe('tenant-1');
  });

  it('logout clears state', () => {
    useAuthStore.getState().login('token', { id: '1', email: 'a@a.com', tenantId: 't', roles: [] });
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });
});
