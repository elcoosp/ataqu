import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@ataqu/ui';
import { Eye, Upload, Save } from 'lucide-react';
import { FormBuilder } from '../components/builder/form-builder';
import { ConversationalToggle } from '../components/builder/conversational-toggle';
import { BrandingTab } from '../components/builder/branding-tab';
import { FormPreview } from '../components/preview/form-preview';
import type { SondForm, SondQuestion, SondBranding, SondUpdateData, FormMode } from '../components/builder/types';
import { useGetForm, useCreateForm, api, type Form as ApiForm, type CreateFormRequest, type UpdateFormRequest } from '@ataqu/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const Route = createFileRoute('/_auth/builder/$id')({
  component: FormBuilderRoute,
});

function FormBuilderRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [localForm, setLocalForm] = useState<SondForm | null>(null);

  const isExisting = id !== 'new';
  const { data: fetchedForm, isLoading } = useGetForm(isExisting ? id : '', { enabled: isExisting });
  const createMutation = useCreateForm();

  useEffect(() => {
    if (fetchedForm) {
      const sondForm: SondForm = {
        ...fetchedForm,
        questions: fetchedForm.questions.map((q) => {
          const qWithPage = q as unknown as typeof q & { page?: number };
          return { ...q, page: qWithPage.page ?? 1 } as SondQuestion;
        }),
        branding: (fetchedForm.branding ?? {}) as SondBranding,
        mode: fetchedForm.mode as FormMode,
      };
      setLocalForm(sondForm);
    }
  }, [fetchedForm]);

  useEffect(() => {
    if (id === 'new' && !createMutation.isPending && !localForm) {
      const defaultQuestions = [{ label: 'Untitled Question', type: 'text' as const, required: false, page: 1 }];
      createMutation.mutate(
        {
          title: 'Untitled Form',
          questions: defaultQuestions as unknown as CreateFormRequest['questions'],
          mode: 'standard',
          branding: {},
        },
        {
          onSuccess: (data) => {
            navigate({ to: '/builder/$id', params: { id: data.id }, replace: true });
          },
        }
      );
    }
  }, [id, createMutation, localForm, navigate]);

  const saveMutation = useMutation({
    mutationFn: ({ formId, data, version }: { formId: string; data: SondUpdateData; version: number }) =>
      api.put<ApiForm>(`/sond/forms/${formId}`, data as UpdateFormRequest, {
        headers: { 'If-Match': `"${version}"` },
      }),
    onSuccess: (data) => {
      setLocalForm((prev) => (prev ? { ...prev, version: data.version } : prev));
      queryClient.invalidateQueries({ queryKey: ['sond', 'form', id] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.post<ApiForm>(`/sond/forms/${id}/publish`),
  });

  if (id === 'new') {
    return <div className="p-8">Creating form...</div>;
  }

  if (isLoading && !localForm) {
    return (
      <div className="p-8">
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!localForm) {
    return <div className="p-8">Form not found.</div>;
  }

  const updateQuestions = (questions: SondQuestion[]) => setLocalForm((f) => (f ? { ...f, questions } : f));
  const updateMode = (mode: FormMode) => setLocalForm((f) => (f ? { ...f, mode } : f));
  const updateBranding = (branding: Partial<SondBranding>) =>
    setLocalForm((f) => (f ? { ...f, branding: { ...f.branding, ...branding } } : f));
  const updateTitle = (title: string) => setLocalForm((f) => (f ? { ...f, title } : f));

  const handleSave = () => {
    const { id: formId, version, questions, title, mode, branding } = localForm;
    const questionsPayload = questions.map(({ id: _qid, ...rest }) => rest) as unknown as SondUpdateData['questions'];
    saveMutation.mutate({ formId, data: { title, questions: questionsPayload, mode, branding }, version });
  };

  const handlePublish = () => {
    setStatus('published');
    publishMutation.mutate();
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <input
          value={localForm.title}
          onChange={(e) => updateTitle(e.target.value)}
          className="truncate bg-transparent text-xl font-bold focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handlePublish}
            disabled={publishMutation.isPending || status === 'published'}
          >
            <Upload className="mr-2 h-4 w-4" />
            {status === 'published' ? 'Published' : 'Publish'}
          </Button>
        </div>
      </header>

      <Tabs defaultValue="builder" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-6 mt-4 w-fit">
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-0 flex-1 overflow-hidden">
          <FormBuilder questions={localForm.questions} onUpdate={updateQuestions} />
        </TabsContent>

        <TabsContent value="settings" className="mt-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-8">
            <ConversationalToggle mode={localForm.mode} onChange={updateMode} />
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border p-4 font-medium">Branding</div>
              <BrandingTab branding={localForm.branding} onUpdate={updateBranding} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <FormPreview form={localForm} open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}
