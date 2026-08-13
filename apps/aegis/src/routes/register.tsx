import { createFileRoute } from '@tanstack/react-router';
import { RegisterForm } from '@ataqu/ui';

export const Route = createFileRoute('/register')({
  component: RegisterForm,
});
