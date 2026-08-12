import { useState, useCallback } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Trans } from '@lingui/react/macro';
import { Play, Save, Trash2 } from 'lucide-react';
import { Button, OnboardTour } from '@ataqu/ui';
import type { Node, Edge } from '@xyflow/react';
import { useGetWorkflow, useUpdateWorkflow, useDeleteWorkflow } from '../api/hooks';
import { WorkflowCanvas } from '../components/workflow-canvas';
import { NodeSidebar } from '../components/node-sidebar';
import { NodeConfigPanel } from '../components/node-config-panel';
import { TestRunModal } from '../components/test-run-modal';

export const Route = createFileRoute('/_auth/workflows/$id')({
  component: WorkflowDetail,
});

const TOUR_STEPS = [
  { selector: '[data-tour="trigger-sidebar"]', content: 'Zapier charges per task. We charge $0. Pick a trigger.' },
  { selector: '[data-tour="canvas"]', content: 'Drag it here. Connect it to an action. You\'re done.' },
];

function WorkflowDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: workflow, isLoading } = useGetWorkflow(id);
  const updateMutation = useUpdateWorkflow();
  const deleteMutation = useDeleteWorkflow();

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [showTestModal, setShowTestModal] = useState(false);

  const isNew = id === 'new';

  const handleSave = useCallback(() => {
    if (!workflow) return;
    updateMutation.mutate(
      { id: workflow.id, data: { name: workflow.name }, version: workflow.version },
      { onSuccess: () => {} }
    );
  }, [workflow, updateMutation]);

  const handleDelete = useCallback(() => {
    if (!workflow) return;
    deleteMutation.mutate(workflow.id, { onSuccess: () => navigate({ to: '/' }) });
  }, [workflow, deleteMutation, navigate]);

  if (isLoading) return <div className="p-8 text-muted-foreground"><Trans>Loading...</Trans></div>;

  const content = (
    <div className="flex h-full overflow-hidden">
      <NodeSidebar />
      <main className="flex-1 relative">
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTestModal(true)}>
            <Play className="mr-1 h-3 w-3" /><Trans>Test Run</Trans>
          </Button>
          {!isNew && (
            <>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="mr-1 h-3 w-3" /><Trans>Save</Trans>
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-1 h-3 w-3" /><Trans>Delete</Trans>
              </Button>
            </>
          )}
        </div>
        <WorkflowCanvas
          onNodeSelect={setSelectedNode}
          nodes={nodes}
          edges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
        />
      </main>
      <NodeConfigPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      {showTestModal && !isNew && workflow && (
        <TestRunModal workflowId={workflow.id} onClose={() => setShowTestModal(false)} />
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
