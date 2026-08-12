import { describe, expect, it } from 'vitest';
import { vaultActions } from '../actions';

describe('vaultActions', () => {
  it('registers the full command palette surface', () => {
    expect(vaultActions).toHaveLength(13);
    expect(vaultActions[0]?.id).toBe('create-product');
    expect(vaultActions.some((action) => action.id === 'sync-shopify')).toBe(true);
  });
});
