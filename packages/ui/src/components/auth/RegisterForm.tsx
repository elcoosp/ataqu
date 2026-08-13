import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupInput } from '@ataqu/shared-schemas';
import { useSignup } from '@ataqu/api-client';
import { useNavigate } from '@tanstack/react-router';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@ataqu/ui';
import { Link } from '@tanstack/react-router';
import { Trans } from '@lingui/react/macro';

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const signup = useSignup();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: SignupInput) => {
    try {
      await signup.mutateAsync({ email: data.email, password: data.password, name: '' });
      await navigate({ to: '/login' });
    } catch (error: any) {
      const message = error?.message || 'Registration failed';
      setError('root', { message });
      if (error?.details?.email) {
        setError('email', { message: error.details.email });
      }
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md border-gray-700/40 bg-deep-night/80">
        <CardHeader>
          <CardTitle className="text-2xl font-heading text-center">
            <Trans>Create your Ataqu account</Trans>
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                <Trans>Confirm password</Trans>
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                className="mt-1 bg-deep-night/50 border-gray-700/40 text-white placeholder-gray-400"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-error">{errors.confirmPassword.message}</p>
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
                  <Trans>Creating account…</Trans>
                </span>
              ) : (
                <Trans>Create account</Trans>
              )}
            </Button>

            <p className="text-center text-sm text-gray-400">
              <Trans>Already have an account?</Trans>{' '}
              <Link to="/login" className="text-primary hover:underline">
                <Trans>Sign in</Trans>
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};
