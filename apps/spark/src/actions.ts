import type { UUID } from '@ataqu/types';

export interface SparkCommandAction {
  id: string;
  label: string;
  shortcut?: string;
  when?: 'workflow-view' | 'workflow-edit' | 'always';
  perform: () => void;
}

export function getSparkActions(opts: {
  currentWorkflowId?: UUID;
  isEditing?: boolean;
  navigate: (path: string) => void;
}): SparkCommandAction[] {
  const { currentWorkflowId, isEditing, navigate } = opts;

  return [
    { id: 'spark-create', label: 'Create Workflow', shortcut: 'N', perform: () => navigate('/workflows/new') },
    { id: 'spark-list', label: 'Go to Workflows', perform: () => navigate('/') },
    { id: 'spark-runs', label: 'Go to Runs', perform: () => navigate('/runs') },
    { id: 'spark-dlq', label: 'View DLQ', perform: () => navigate('/dlq') },
    { id: 'spark-search', label: 'Search Workflows', shortcut: '/', perform: () => {} },
    ...(currentWorkflowId ? [
      { id: 'spark-run', label: 'Run Workflow', when: 'workflow-view' as const, perform: () => {} },
      { id: 'spark-duplicate', label: 'Duplicate Workflow', when: 'workflow-view' as const, perform: () => {} },
      { id: 'spark-enable', label: 'Enable Workflow', when: 'workflow-view' as const, perform: () => {} },
      { id: 'spark-disable', label: 'Disable Workflow', when: 'workflow-view' as const, perform: () => {} },
    ] : []),
    ...(isEditing ? [
      { id: 'spark-add-trigger', label: 'Add Trigger', when: 'workflow-edit' as const, perform: () => {} },
      { id: 'spark-add-action', label: 'Add Action', when: 'workflow-edit' as const, perform: () => {} },
      { id: 'spark-add-condition', label: 'Add Condition', when: 'workflow-edit' as const, perform: () => {} },
      { id: 'spark-test', label: 'Test Run', when: 'workflow-edit' as const, perform: () => {} },
    ] : []),
  ];
}
