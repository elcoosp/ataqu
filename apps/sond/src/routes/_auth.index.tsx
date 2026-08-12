import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Button, Card, Shell } from '@ataqu/ui';
import { ClipboardList, Plus } from 'lucide-react';
import { Trans, t } from '@lingui/core/macro';
import { EmptyState } from '@ataqu/shared-ui/empty-state';
import { useListForms } from '@ataqu/api-client';
import type { Form } from '@ataqu/api-client';

export const Route = createFileRoute('/_auth/')({
  component: FormsIndex,
});

function FormsIndex() {
  const navigate = useNavigate();
  const { data: forms = [], isLoading } = useListForms();

  if (isLoading) {
    return (
      <Shell activeApp="sond">
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (forms.length === 0) {
    return (
      <Shell activeApp="sond">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold"><Trans>No forms</Trans></h3>
            <p className="mt-1 text-sm text-muted-foreground">
              <Trans>Create one to start collecting responses. No response limits.</Trans>
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: '/builder/new' })}>
              <Trans>Create Form</Trans>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell activeApp="sond">
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold"><Trans>Forms</Trans></h1>
          <Button asChild>
            <Link to="/builder/new">
              <Plus className="mr-2 h-4 w-4" />
              <Trans>Create Form</Trans>
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((f: Form) => (
            <Link key={f.id} to="/builder/$id" params={{ id: f.id }} className="block">
              <Card className="p-6 transition-shadow hover:shadow-md">
                <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                <div className="text-sm text-muted-foreground">
                  {f.mode === 'conversational' ? t`Conversational` : t`Standard`} · v{f.version}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}
