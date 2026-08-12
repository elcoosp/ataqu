import { describe, expect, it } from 'vitest';
import { searchVaultActions, vaultActions } from '../actions';

describe('vaultActions', () => {
  it('registers the full command palette surface', async () => {
    expect(vaultActions).toHaveLength(13);

    const results = await searchVaultActions('');
    expect(results).toHaveLength(13);
    expect(results.some((result) => result.id === 'sync-shopify')).toBe(true);
  });
});
