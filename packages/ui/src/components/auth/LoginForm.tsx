import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@ataqu/shared-schemas';
import { useLogin } from '@ataqu/api-client';
import { useAuthStore } from '@ataqu/shared-stores';
import { useNavigate } from '@tanstack/react-router';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@ataqu/ui';
import { AuthLayout } from '../auth-layout';
import { Link } from '@tanstack/react-router';
import { Trans } from '@lingui/react/macro';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const login = useLogin();
  const { login: setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const response = await login.mutateAsync(data);
      setAuth(response.access_token, {
        id: response.user_id,
        email: data.email,
        tenantId: 'temp',
        roles: ['user'],
        name: '',
      });
      await navigate({ to: '/dashboard' });
    } catch (error: any) {
      const message = error?.message || 'Invalid email or password';
      setError('root', { type: 'manual', message });
      if (error?.details?.email) {
        setError('email', { message: error.details.email });
      }
      if (error?.details?.password) {
        setError('password', { message: error.details.password });
      }
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md border-gray-700/40 bg-deep-night/80">
        <CardHeader>
          <CardTitle className="text-2xl font-heading text-center">
            <Trans>Sign in to Ataqu</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                <Trans>Email</Trans>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className="mt-1 bg-deep-night/50 border-gray-700/40 text-white placeholder-gray-400"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-error">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                <Trans>Password</Trans>
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className="mt-1 bg-deep-night/50 border-gray-700/40 text-white placeholder-gray-400"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-error">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-error">{errors.root.message}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-amber text-black hover:bg-amber/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <Trans>Signing in…</Trans>
                </span>
              ) : (
                <Trans>Sign in</Trans>
              )}
            </Button>

            <p className="text-center text-sm text-gray-400">
              <Trans>Don't have an account?</Trans>{' '}
              <Link to="/register" className="text-primary hover:underline">
                <Trans>Create one</Trans>
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};
