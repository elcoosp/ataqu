import { useState, useCallback } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Trans } from '@lingui/react/macro';
import { Play, Save, Trash2, ArrowLeft } from 'lucide-react';
import { Button, Input, Label, OnboardTour } from '@ataqu/ui';
import type { Node, Edge } from '@xyflow/react';
import { toast } from 'sonner';
import type { Workflow, CreateWorkflowRequest } from '@ataqu/api-client';
import {
  useGetWorkflow,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useExecuteWorkflow,
} from '../api/spark-api';
import { WorkflowCanvas } from '../components/workflow-canvas';
import { NodeSidebar } from '../components/node-sidebar';
import { NodeConfigPanel } from '../components/node-config-panel';
import { TestRunModal } from '../components/test-run-modal';

export const Route = createFileRoute('/_auth/workflows/$id')({
  component: WorkflowDetail,
});

const TOUR_STEPS = [
  {
    target: '[data-tour="trigger-sidebar"]',
    content: 'Zapier charges per task. We charge $0. Pick a trigger.',
    title: 'Step 1: Choose a trigger',
  },
  {
    target: '[data-tour="canvas"]',
    content: "Drag it here. Connect it to an action. You're done.",
    title: 'Step 2: Build your workflow',
  },
];

function WorkflowDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const { data: workflow, isLoading } = useGetWorkflow(isNew ? undefined : id);
  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflow();
  const deleteMutation = useDeleteWorkflow();
  const executeMutation = useExecuteWorkflow();

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workflowName, setWorkflowName] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);

  // Initialize name from loaded workflow
  if (workflow && !workflowName) {
    setWorkflowName(workflow.name);
  }

  const handleNodeUpdate = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
    );
    setSelectedNode(null);
  }, []);

  const buildWorkflowRequest = useCallback((): Partial<CreateWorkflowRequest> => {
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    const actionNodes = nodes.filter((n) => n.type === 'action');
    const conditionNodes = nodes.filter((n) => n.type === 'condition');

    const trigger = triggerNode?.data?.config as Record<string, unknown> | undefined;
    const triggerSubtype = String(triggerNode?.data?.subtype || 'event');

    let triggerPayload: CreateWorkflowRequest['trigger'] = { type: 'event', event_type: 'cinq.deal.won' };
    if (triggerSubtype === 'schedule') {
      triggerPayload = { type: 'schedule', cron: String(trigger?.cron || '0 9 * * *') };
    } else if (triggerSubtype === 'webhook') {
      triggerPayload = { type: 'webhook', path: `/webhooks/${id}` };
    } else {
      triggerPayload = { type: 'event', event_type: String(trigger?.event_type || 'cinq.deal.won') };
    }

    const actions: CreateWorkflowRequest['actions'] = actionNodes.map((n) => {
      const config = n.data?.config as Record<string, unknown> | undefined;
      const subtype = String(n.data?.subtype || 'send_email');
      const params = (config?.params || {}) as Record<string, unknown>;

      switch (subtype) {
        case 'create_dial_channel':
          return { type: 'create_dial_channel', name: String(params.name || ''), channel_type: String(params.channel_type || 'public'), participants: (params.participants as string[]) || [] };
        case 'send_dial_message':
          return { type: 'send_dial_message', channel_id: String(params.channel_id || ''), content: String(params.content || '') };
        case 'reserve_vault_stock':
          return { type: 'reserve_vault_stock', variant_id: String(params.variant_id || ''), quantity: Number(params.quantity || 1) };
        case 'adjust_vault_stock':
          return { type: 'adjust_vault_stock', variant_id: String(params.variant_id || ''), delta: Number(params.delta || 0), reason: String(params.reason || '') };
        case 'create_cinq_contact':
          return { type: 'create_cinq_contact', name: String(params.name || ''), email: String(params.email || ''), phone: params.phone as string | undefined };
        case 'create_cinq_activity':
          return { type: 'create_cinq_activity', contact_id: String(params.contact_id || ''), activity_type: String(params.activity_type || 'note'), description: String(params.description || '') };
        case 'create_cinq_lead':
          return { type: 'create_cinq_lead', name: String(params.name || ''), email: String(params.email || ''), source: String(params.source || '') };
        case 'request_approval':
          return { type: 'request_approval', approver_role: String(params.approver_role || 'admin') };
        case 'send_email':
          return { type: 'send_email', to: String(params.to || ''), subject: String(params.subject || ''), body: String(params.body || '') };
        case 'webhook_action':
          return { type: 'webhook', url: String(params.url || ''), method: String(params.method || 'POST'), body: params.body || {}, headers: (params.headers as Record<string, string>) || {} };
        default:
          return { type: 'send_email', to: '', subject: '', body: '' };
      }
    });

    const conditions: CreateWorkflowRequest['conditions'] = conditionNodes.map((n) => {
      const config = n.data?.config as Record<string, unknown> | undefined;
      const subtype = String(n.data?.subtype || 'field_equals');
      switch (subtype) {
        case 'field_equals':
          return { type: 'field_equals', field: String(config?.field || ''), value: config?.value ?? '' };
        case 'field_greater_than':
          return { type: 'field_greater_than', field: String(config?.field || ''), value: Number(config?.value || 0) };
        case 'field_less_than':
          return { type: 'field_less_than', field: String(config?.field || ''), value: Number(config?.value || 0) };
        case 'field_contains':
          return { type: 'field_contains', field: String(config?.field || ''), value: String(config?.value || '') };
        case 'field_exists':
          return { type: 'field_exists', field: String(config?.field || '') };
        case 'and':
          return { type: 'and', conditions: [] };
        case 'or':
          return { type: 'or', conditions: [] };
        default:
          return { type: 'field_equals', field: '', value: '' };
      }
    });

    return {
      name: workflowName || 'Untitled Workflow',
      trigger: triggerPayload,
      conditions,
      actions,
    };
  }, [nodes, workflowName, id]);

  const handleSave = useCallback(() => {
    const req = buildWorkflowRequest();
    if (!req.name?.trim()) {
      toast.error('Workflow name is required.');
      return;
    }

    if (isNew) {
      createMutation.mutate(req as CreateWorkflowRequest, {
        onSuccess: (created) => {
          toast.success('Workflow saved.');
          navigate({ to: '/workflows/$id', params: { id: created.id } });
        },
        onError: () => toast.error('Failed to create workflow.'),
      });
    } else if (workflow) {
      updateMutation.mutate(
        { id: workflow.id, data: { name: req.name, is_active: workflow.is_active }, version: workflow.version },
        {
          onSuccess: () => toast.success('Workflow saved.'),
          onError: () => toast.error('Failed to save workflow.'),
        }
      );
    }
  }, [isNew, workflow, buildWorkflowRequest, createMutation, updateMutation, navigate]);

  const handleDelete = useCallback(() => {
    if (!workflow) return;
    deleteMutation.mutate(workflow.id, {
      onSuccess: () => {
        toast.success('Workflow deleted.');
        navigate({ to: '/' });
      },
      onError: () => toast.error('Failed to delete workflow.'),
    });
  }, [workflow, deleteMutation, navigate]);

  if (isLoading && !isNew) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          <Trans>Loading workflow...</Trans>
        </div>
      </div>
    );
  }

  const content = (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })} className="h-8 w-8 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={workflowName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWorkflowName(e.target.value)}
            placeholder="Workflow name"
            className="max-w-md font-heading font-bold text-lg border-none shadow-none focus-visible:ring-0 px-0 h-auto"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowTestModal(true)}>
            <Play className="mr-1 h-3 w-3" />
            <Trans>Test Run</Trans>
          </Button>
          {!isNew && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-1 h-3 w-3" />
              <Trans>Delete</Trans>
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="mr-1 h-3 w-3" />
            <Trans>Save</Trans>
          </Button>
        </div>
      </header>

      {/* Builder */}
      <div className="flex-1 flex overflow-hidden">
        <NodeSidebar />
        <main className="flex-1 relative">
          <WorkflowCanvas
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onNodeSelect={setSelectedNode}
          />
        </main>
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={handleNodeUpdate}
          />
        )}
      </div>

      {/* Test Run Modal */}
      {!isNew && workflow && showTestModal && (
        <TestRunModal
          workflowId={workflow.id}
          onClose={() => setShowTestModal(false)}
        />
      )}
    </div>
  );

  if (isNew) {
    return (
      <OnboardTour tourId="spark-workflow-tour" steps={TOUR_STEPS}>
        {content}
      </OnboardTour>
    );
  }

  return content;
}
