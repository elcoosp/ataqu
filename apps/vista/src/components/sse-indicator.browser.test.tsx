import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SseIndicator } from './sse-indicator';
import { I18nProvider as LinguiProvider } from '@lingui/react';
import { i18n } from '@lingui/core';

i18n.load('en', {});
i18n.activate('en');

describe('SseIndicator', () => {
  it('renders connected state', () => {
    render(
      <LinguiProvider i18n={i18n}>
        <SseIndicator isConnected={true} />
      </LinguiProvider>
    );
    expect(screen.getByText('Live')).toBeTruthy();
  });
});
