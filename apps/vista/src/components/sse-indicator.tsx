import { Trans } from '@lingui/react/macro';
import React from 'react';

interface SseIndicatorProps {
  isConnected: boolean;
}

export const SseIndicator: React.FC<SseIndicatorProps> = ({ isConnected }) => {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
        isConnected ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
      }`}
      data-tour="sse-indicator"
    >
      <span
        className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-error'}`}
      />
      {isConnected ? <Trans>Live</Trans> : <Trans>Disconnected</Trans>}
    </div>
  );
};
