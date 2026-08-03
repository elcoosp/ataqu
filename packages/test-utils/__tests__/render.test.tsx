import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../src/render';
import { createTestUser } from '../src/factory';

describe('renderWithProviders', () => {
  it('renders children without crashing', () => {
    const { container } = renderWithProviders(<div>test</div>);
    expect(container.textContent).toBe('test');
  });
});

describe('createTestUser', () => {
  it('creates a user with default values', () => {
    const user = createTestUser();
    expect(user.id).toBeDefined();
    expect(user.email).toContain('@');
  });
  it('overrides properties', () => {
    const user = createTestUser({ name: 'Jane' });
    expect(user.name).toBe('Jane');
  });
});
