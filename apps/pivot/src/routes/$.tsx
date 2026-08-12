import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/$')({
  component: NotFound,
});

function NotFound() {
  return <div>404 – Page not found</div>;
}
