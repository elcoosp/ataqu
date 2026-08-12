import { describe, expect, it } from 'vitest';
import { getVaultActions, searchVaultActions } from '../actions';

describe('vaultActions', () => {
  it('registers the full command palette surface', async () => {
    const actions = getVaultActions();
    expect(actions).toHaveLength(13);

    const results = await searchVaultActions('');
    expect(results).toHaveLength(13);
    expect(results.some((result) => result.id === 'sync-shopify')).toBe(true);
  });

  it('filters actions by query', async () => {
    const results = await searchVaultActions('shopify');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.title.toLowerCase().includes('shopify'))).toBe(true);
  });

  it('returns all actions for empty query', async () => {
    const results = await searchVaultActions('');
    expect(results).toHaveLength(13);
  });
});
