// =========================================================================
// Types derived from Rust contracts (ataqu-contracts)
// =========================================================================

export type UUID = string;
export type DateTime = string; // ISO 8601

// ----- AEGIS -----
export interface LoginRequest {
  email: string;
  password: string;
  tenant_id?: UUID;
}
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}
export interface MfaSetupRequest {
  user_id: UUID;
}
export interface MfaSetupResponse {
  secret: string;
  qr_code_url: string;
}

// ----- CINQ -----
export interface ContactResponse {
  id: UUID;
  name: string;
  email: string;
}
export interface DealResponse {
  id: UUID;
  title: string;
  amount: number;
}
export interface PipelineStageResponse {
  id: UUID;
  name: string;
  order: number;
}
export interface ActivityResponse {
  id: UUID;
  description: string;
}
export interface CreateContactRequest {
  name: string;
  email: string;
  phone?: string | null;
}
export interface UpdateContactRequest {
  name?: string | null;
  email?: string | null;
  phone?: string | null | null;
}
export interface CreateDealRequest {
  title: string;
  amount: number;
  contact_id: UUID;
}
export interface UpdateDealRequest {
  title?: string | null;
  amount?: number | null;
}
export interface CreatePipelineStageRequest {
  name: string;
  order: number;
}
export interface UpdatePipelineStageRequest {
  name?: string | null;
  order?: number | null;
}
export interface CreateActivityRequest {
  description: string;
  contact_id: UUID;
}
export interface ListActivitiesParams {
  contact_id?: UUID;
  limit?: number;
}
export interface SearchParams {
  q: string;
}
export interface ImportCsvResult {
  imported: number;
  failed: number;
}
export interface TrackEmailRequest {
  email: string;
  action: string;
}

// ----- DIAL -----
export interface ChannelSummary {
  id: UUID;
  name: string;
}
export interface Channel {
  id: UUID;
  name: string;
}
export interface CreateChannelRequest {
  name: string;
}
export interface MessageListParams {
  cursor?: string;
  limit?: number;
}
export interface MessageListResponse {
  messages: Message[];
  next_cursor?: string;
}
export interface Message {
  id: UUID;
  channel_id: UUID;
  content: string;
}
export interface SendMessageRequest {
  content: string;
}
export interface ThreadSummary {
  id: UUID;
  name: string;
}
export interface Thread {
  id: UUID;
  name: string;
}
export interface CreateThreadRequest {
  name: string;
}
export interface UploadUrlRequest {
  filename: string;
  content_type: string;
}
export interface UploadUrlResponse {
  url: string;
  key: string;
}
export interface SearchMessagesParams {
  q: string;
  channel_id?: UUID;
  limit?: number;
  cursor?: string;
}
export interface SearchMessagesResults {
  results: Message[];
  total: number;
}

// ----- PIVOT -----
export interface Document {
  id: UUID;
  title: string;
  content: string;
}
export interface Database {
  id: UUID;
  name: string;
}
export interface Relation {
  id: UUID;
  from_id: UUID;
  to_id: UUID;
}
export interface CreateDocumentCommand {
  title: string;
  content: string;
}
export interface UpdateDocumentCommand {
  title?: string | null;
  content?: string | null;
}
export interface CreateRelationCommand {
  from_id: UUID;
  to_id: UUID;
}
export interface ListDocumentsParams {
  limit?: number;
  offset?: number;
}
export interface ListRelationsParams {
  limit?: number;
  offset?: number;
}
export interface SearchDocumentsParams {
  q: string;
}

// ----- PAUSE -----
export interface CreateEmployeeRequest {
  full_name: string;
  email: string;
  phone?: string | null;
  job_title: string;
  department?: string | null;
}
export interface EmployeeDto {
  id: UUID;
  full_name: string;
  email: string;
  phone?: string | null;
  job_title: string;
  department?: string | null;
  created_at: DateTime;
}
export type LeaveType = 'annual' | 'sick' | 'personal' | 'unpaid';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export interface CreateLeaveRequestRequest {
  employee_id: UUID;
  leave_type: LeaveType;
  starts_at: DateTime;
  ends_at: DateTime;
  reason?: string | null;
}
export interface LeaveRequestDto {
  id: UUID;
  employee_id: UUID;
  leave_type: LeaveType;
  starts_at: DateTime;
  ends_at: DateTime;
  reason?: string | null;
  status: LeaveRequestStatus;
  created_at: DateTime;
}

// ----- TEMPO -----
// No complex types yet, only /calendars GET

// ----- VAULT -----
// Stubbed, use generic JSON for now
export type VaultProduct = Record<string, unknown>;
export type VaultVariant = Record<string, unknown>;

// ----- VISTA -----
export interface DashboardResponse {
  id: UUID;
  name: string;
  description?: string | null;
  widgets: WidgetDto[];
  updated_at: DateTime;
}
export interface WidgetDto {
  id: UUID;
  kind: string;
  title: string;
  config: Record<string, unknown>;
}
export interface KpiQuery {
  dashboard_id?: UUID;
  start_date?: DateTime;
  end_date?: DateTime;
}
export interface KpiResponse {
  label: string;
  value: number;
  unit?: string | null;
  trend_pct?: number | null;
}
export interface ChartQuery {
  start_date?: DateTime;
  end_date?: DateTime;
  granularity?: string;
}
export interface ChartResponse {
  id: UUID;
  kind: string;
  title: string;
  series: ChartSeriesDto[];
}
export interface ChartSeriesDto {
  label: string;
  points: ChartPointDto[];
}
export interface ChartPointDto {
  timestamp: DateTime;
  value: number;
}
export interface FilterRequest {
  dashboard_id: UUID;
  filters: FilterConditionDto[];
}
export interface FilterConditionDto {
  field: string;
  operator: string;
  value: unknown;
}
export interface FilterResponse {
  dashboard_id: UUID;
  applied_filters: FilterConditionDto[];
  kpis: KpiResponse[];
}
export type ExportFormat = 'csv' | 'json' | 'xlsx';
export interface ExportRequest {
  dashboard_id: UUID;
  format: ExportFormat;
  start_date?: DateTime;
  end_date?: DateTime;
}
export interface ExportResponse {
  export_id: UUID;
  format: ExportFormat;
  download_url: string;
  expires_at: DateTime;
}
