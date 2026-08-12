import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Button, Card } from '@ataqu/ui';
import { ClipboardList, Plus } from 'lucide-react';
import { EmptyState } from '../components/ui/empty-state';
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
    );
  }

  if (forms.length === 0) {
    return (
      <div className="p-8">
        <EmptyState
          icon={ClipboardList}
          title="No forms"
          description="Create one to start collecting responses. No response limits."
          ctaLabel="Create Form"
          onCtaClick={() => navigate({ to: '/builder/new' })}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Forms</h1>
        <Button asChild>
          <Link to="/builder/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Form
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {forms.map((f: Form) => (
          <Link key={f.id} to="/builder/$id" params={{ id: f.id }} className="block">
            <Card className="p-6 transition-shadow hover:shadow-md">
              <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
              <div className="text-sm text-muted-foreground">
                {f.mode === 'conversational' ? 'Conversational' : 'Standard'} · v{f.version}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
