import { createFileRoute } from '@tanstack/react-router';
import { Trans } from '@lingui/react/macro';
import { useEffect } from 'react';

export const Route = createFileRoute('/login')({
  component: LoginRedirect,
});

function LoginRedirect() {
  useEffect(() => {
    window.location.href = 'https://sso.ataqu.com/login';
  }, []);
  return (
    <div className="flex items-center justify-center h-full">
      <p><Trans>Redirecting to login…</Trans></p>
    </div>
  );
}
