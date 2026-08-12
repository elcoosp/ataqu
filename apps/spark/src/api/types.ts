export type TriggerType = 'webhook' | 'schedule' | 'event';

export interface Trigger {
  type: TriggerType;
  path?: string;
  cron?: string;
  event_type?: string;
}

export type ActionType =
  | 'request_approval'
  | 'send_email'
  | 'update_record'
  | 'create_dial_channel'
  | 'send_dial_message'
  | 'create_cinq_contact'
  | 'create_cinq_activity'
  | 'reserve_vault_stock'
  | 'adjust_vault_stock'
  | 'create_cinq_lead'
  | 'webhook';

export interface Action {
  type: ActionType;
  [key: string]: unknown;
}

export type ConditionOperator =
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'contains'
  | 'not_contains'
  | 'exists'
  | 'not_exists'
  | 'in';

export interface Condition {
  type: string;
  field?: string;
  value?: unknown;
  values?: unknown[];
  conditions?: Condition[];
  condition?: Condition;
}

export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  trigger: Trigger;
  conditions: Condition[];
  actions: Action[];
  is_active: boolean;
  webhook_secret?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export type WorkflowRunStatus =
  | 'running'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'failed';

export interface WorkflowRun {
  id: string;
  tenant_id: string;
  workflow_id: string;
  status: WorkflowRunStatus;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DLQEntry {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  error: string;
  attempts: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
