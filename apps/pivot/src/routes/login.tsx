import { createFileRoute, redirect } from '@tanstack/react-router';
import { Trans } from '@lingui/react/macro';

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    // Redirect to AEGIS login (SSO)
    throw redirect({ to: 'https://sso.ataqu.com/login', replace: true });
  },
  component: LoginPlaceholder,
});

function LoginPlaceholder() {
  return (
    <div className="flex items-center justify-center h-full">
      <p><Trans>Redirecting to login…</Trans></p>
    </div>
  );
}
