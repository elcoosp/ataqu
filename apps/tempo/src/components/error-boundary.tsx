import { Button } from '@ataqu/ui';
import { Trans } from '@lingui/react/macro';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // allowed: error boundaries must report to observability in production.
    console.error('[tempo] error boundary caught:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[240px] flex-col items-center justify-center space-y-4 text-center">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            <Trans>Something went wrong</Trans>
          </h2>
          <p className="text-sm text-muted-foreground">
            <Trans>An unexpected error occurred. Please try again.</Trans>
          </p>
          <Button onClick={() => this.setState({ hasError: false })}>
            <Trans>Try again</Trans>
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
