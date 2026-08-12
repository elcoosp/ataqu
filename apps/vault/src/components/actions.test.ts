import { describe, expect, it } from 'vitest';
import { useVaultActions } from '../actions';

describe('vaultActions', () => {
  it('exports the useVaultActions hook', () => {
    expect(useVaultActions).toBeDefined();
    expect(typeof useVaultActions).toBe('function');
  });
});
