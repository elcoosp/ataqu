import { createFileRoute } from '@tanstack/react-router';
import { AuthLayout } from '@ataqu/ui';

export const Route = createFileRoute('/login')({
  component: () => (
    <AuthLayout>
      <div className="bg-deep-night/80 p-8 rounded border border-gray-700/40 w-96">
        <h1 className="text-2xl font-heading mb-4">Login</h1>
        <p>Login form placeholder</p>
      </div>
    </AuthLayout>
  ),
});
