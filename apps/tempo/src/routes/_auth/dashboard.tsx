import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/dashboard')({
  component: () => (
    <div className="flex items-center justify-center h-full">
      <h1 className="text-4xl font-heading">Dashboard</h1>
    </div>
  ),
});
