// ============================================================================
// Shared & Core Types
// ============================================================================

export type UUID = string;
export type DateTime = string; // ISO 8601

// ----------------------------------------------------------------------------
// AEGIS
// ----------------------------------------------------------------------------

export interface LoginRequest {
	email: string;
	password: string;
	tenant_id?: UUID;
}
export interface LoginResponse {
	access_token: string;
	refresh_token: string;
	user_id: UUID;
}

export interface RefreshTokenRequest {
	refresh_token: string;
}

export interface MfaSetupResponse {
	secret: string;
	qr_code_url: string;
}

export interface MfaVerifyRequest {
	code: string;
}

export interface CreateUserRequest {
	email: string;
	password: string;
	name?: string;
}
export interface UserResponse {
	id: UUID;
	email: string;
	name?: string;
	version: number;
	role: string;
	is_active: boolean;
	mfa_enabled: boolean;
	last_login_at?: DateTime;
	created_at?: DateTime;
}

export interface UpdateRoleRequest {
	role: string;
}
export interface UpdatePermissionRequest {
	role: "admin" | "editor" | "viewer" | "none";
}

export interface ApiKeyResponse {
	id: UUID;
	name: string;
	prefix: string;
	scopes: string[];
	created_at: DateTime;
	key?: string;
	last_used_at?: DateTime;
}
export interface CreateApiKeyRequest {
	name: string;
	scopes?: string[];
	expires_at?: DateTime;
}

export interface AuditLogEntry {
	id: number;
	user_id: UUID;
	action: string;
	app: string;
	entity_type?: string;
	entity_id?: UUID;
	old_value?: Record<string, unknown>;
	new_value?: Record<string, unknown>;
	ip_address?: string;
	user_agent?: string;
	created_at: DateTime;
}

export interface PendingApproval {
	id: UUID;
	tenant_id: UUID;
	workflow_id: UUID;
	run_id: UUID;
	approver_role: string;
	status: string;
	created_at: DateTime;
}
export interface AuditLogQuery {
	action?: string;
	app?: string;
	from_date?: DateTime;
	to_date?: DateTime;
	limit?: number;
	offset?: number;
}

// ---- AEGIS: Roles / Tenant / Invite ----
export interface RoleResponse {
	id: UUID;
	name: string;
	permissions: string[];
	created_at: DateTime;
}
export interface CreateRoleRequest {
	name: string;
	permissions: string[];
}
export interface TenantSettings {
	id: UUID;
	tenant_id: UUID;
	name: string;
	plan: string;
	settings: Record<string, unknown>;
	updated_at: DateTime;
}
export interface UpdateTenantSettingsRequest {
	name?: string;
	settings?: Record<string, unknown>;
}
export interface InviteUserRequest {
	email: string;
	role: string;
	name?: string;
}
export interface InviteUserResponse {
	user_id: UUID;
	email: string;
}

// ----------------------------------------------------------------------------
// CINQ: Integrations
// ----------------------------------------------------------------------------
export interface IntegrationToggleRequest {
	integration: string;
	enabled: boolean;
}
export interface IntegrationStatus {
	integration: string;
	enabled: boolean;
}

// ----------------------------------------------------------------------------
// CINQ
// ----------------------------------------------------------------------------

export interface ContactResponse {
	id: UUID;
	name: string;
	email: string;
	company?: string;
	phone?: string;
	lead_score?: number;
	custom_fields?: Record<string, unknown>;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateContactRequest {
	name: string;
	email: string;
	phone?: string | null;
	company?: string;
	custom_fields?: Record<string, unknown>;
}
export interface UpdateContactRequest {
	name?: string | null;
	email?: string | null;
	phone?: string | null | null;
	company?: string | null | null;
	custom_fields?: Record<string, unknown> | null;
	lead_score?: number | null;
}

export interface DealResponse {
	id: UUID;
	title: string;
	amount: number;
	status: "open" | "won" | "lost";
	contact_id: UUID;
	pipeline_stage_id: UUID;
	owner_id?: UUID;
	probability?: number;
	quantity?: number;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}

export interface Establishment {
	id: UUID;
	company_name: string;
	siret?: string | null;
	address?: string | null;
	created_at: DateTime;
	updated_at: DateTime;
}

export interface CreateEstablishmentRequest {
	company_name: string;
	siret?: string;
	address?: string;
}
export interface CreateDealRequest {
	contact_id: UUID;
	title: string;
	pipeline_stage_id: UUID;
	amount: number;
	owner_id?: UUID;
	probability?: number;
	variant_id?: UUID;
	quantity?: number;
	establishment_id?: UUID;
}
export interface UpdateDealRequest {
	title?: string | null;
	amount?: number | null;
	contact_id?: UUID | null;
	pipeline_stage_id?: UUID | null;
	status?: "open" | "won" | "lost" | null;
	owner_id?: UUID | null | null;
	probability?: number | null | null;
	variant_id?: UUID | null | null;
	quantity?: number | null | null;
	establishment_id?: UUID | null | null;
}

export interface PipelineStageResponse {
	id: UUID;
	name: string;
	order: number;
	version: number;
}
export interface CreatePipelineStageRequest {
	name: string;
	order: number;
}
export interface UpdatePipelineStageRequest {
	name?: string | null;
	order?: number | null;
}

export interface ActivityResponse {
	id: UUID;
	activity_type: "call" | "email" | "meeting" | "task" | "note";
	description: string;
	scheduled_at?: DateTime;
	contact_id: UUID;
	deal_id?: UUID;
	created_at: DateTime;
}
export interface CreateActivityRequest {
	contact_id: UUID;
	deal_id?: UUID;
	activity_type: "call" | "email" | "meeting" | "task" | "note";
	description: string;
	scheduled_at?: DateTime;
}
export interface ListActivitiesParams {
	contact_id?: UUID;
	limit?: number;
	offset?: number;
}

export interface TaskResponse {
	id: UUID;
	title: string;
	description?: string;
	due_date?: DateTime;
	status: "pending" | "completed" | "cancelled";
	contact_id?: UUID;
	deal_id?: UUID;
	assigned_to?: UUID;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateTaskRequest {
	title: string;
	description?: string;
	due_date?: DateTime;
	contact_id?: UUID;
	deal_id?: UUID;
	assigned_to?: UUID;
}
export interface UpdateTaskRequest {
	title?: string | null;
	description?: string | null;
	due_date?: DateTime | null;
	status?: "pending" | "completed" | "cancelled" | null;
}

export interface SearchParams {
	q: string;
	limit?: number;
}
export interface ImportCsvResult {
	imported: number;
	failed: number;
	failed_rows?: Array<[number, string]>;
}

export interface TrackEmailRequest {
	contact_id: UUID;
	event_type: "open" | "click" | "bounce" | "send" | "deliver";
	metadata?: Record<string, unknown>;
}

export interface BulkDeleteRequest {
	ids: UUID[];
}

// ----------------------------------------------------------------------------
// DIAL
// ----------------------------------------------------------------------------

export interface ChannelSummary {
	id: UUID;
	name: string;
}
export interface Channel {
	id: UUID;
	name: string;
	channel_type: "public" | "private" | "direct_message";
	version: number;
	created_by: UUID;
	participants: UUID[];
	created_at: DateTime;
	updated_at: DateTime;
	archived_at?: DateTime;
}
export interface CreateChannelRequest {
	name: string;
	channel_type?: "public" | "private" | "direct_message";
	participants?: UUID[];
}

export interface Message {
	id: UUID;
	channel_id: UUID;
	author_id: UUID;
	version: number;
	content: string;
	sent_at: DateTime;
	thread_id?: UUID;
	edited_at?: DateTime;
	deleted_at?: DateTime;
}
export interface MessageListResponse {
	messages: Message[];
	total: number;
	limit: number;
	offset: number;
}
export interface SendMessageRequest {
	content: string;
}
export interface EditMessageRequest {
	content: string;
}
export interface StartThreadRequest {
	channel_id: UUID;
	parent_message_id: UUID;
}
export interface Thread {
	id: UUID;
	channel_id: UUID;
	parent_message_id: UUID;
	created_at: DateTime;
}
export interface Mention {
	id: UUID;
	message_id: UUID;
	user_id: UUID;
	read_at?: DateTime;
}
export interface AddReactionRequest {
	emoji: string;
}
export interface Reaction {
	id: UUID;
	message_id: UUID;
	user_id: UUID;
	emoji: string;
	created_at: DateTime;
}
export interface UploadFileRequest {
	filename: string;
}
export interface UploadFileResponse {
	file_id: UUID;
	upload_url: string;
	key: string;
	filename: string;
}
export interface SearchMessagesParams {
	q: string;
	limit?: number;
	offset?: number;
}

// ----------------------------------------------------------------------------
// PIVOT
// ----------------------------------------------------------------------------

export interface Document {
	id: UUID;
	title: string;
	content: string;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateDocumentCommand {
	title: string;
	content: string;
}
export interface UpdateDocumentCommand {
	title?: string | null;
	content?: string | null;
}

export interface Database {
	id: UUID;
	name: string;
	created_at: DateTime;
}
export interface DatabaseRow {
	id: UUID;
	database_id: UUID;
	data: Record<string, unknown>;
	created_at: DateTime;
}
export interface CreateDatabaseCommand {
	name: string;
}

export interface Block {
	id: UUID;
	document_id: UUID;
	block_type: "markdown" | "table" | "view" | "checklist";
	content: Record<string, unknown>;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateBlockRequest {
	document_id: UUID;
	block_type: "markdown" | "table" | "view" | "checklist";
}
export interface UpdateBlockRequest {
	block_type?: "markdown" | "table" | "view" | "checklist" | null;
	content?: Record<string, unknown> | null;
}

export interface Relation {
	id: UUID;
	from_block_id: UUID;
	to_block_id: UUID;
	relation_type: string;
}
export interface CreateRelationCommand {
	from_block_id: UUID;
	to_block_id: UUID;
	relation_type: string;
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
	limit?: number;
	offset?: number;
}

export interface Template {
	id: UUID;
	name: string;
	content: string;
	created_at: DateTime;
}
export interface CreateTemplateRequest {
	name: string;
	content: string;
}

// ----------------------------------------------------------------------------
// PAUSE
// ----------------------------------------------------------------------------

export interface Employee {
	id: UUID;
	full_name: string;
	email: string;
	phone?: string;
	job_title: string;
	department?: string;
	hire_date: string; // YYYY-MM-DD
	is_active: boolean;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateEmployeeRequest {
	full_name: string;
	email: string;
	phone?: string | null;
	job_title: string;
	department?: string | null;
	hire_date: string; // YYYY-MM-DD
}
export interface UpdateEmployeeRequest {
	full_name?: string | null;
	job_title?: string | null;
	department?: string | null | null;
}

export type LeaveType = "annual" | "sick" | "personal" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export interface LeaveRequest {
	id: UUID;
	employee_id: UUID;
	employee_name?: string;
	leave_type: LeaveType;
	start_date: string; // YYYY-MM-DD
	end_date: string;
	reason?: string;
	status: LeaveStatus;
	reviewer_id?: UUID;
	reviewed_at?: DateTime;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateLeaveRequestRequest {
	employee_id: UUID;
	leave_type: LeaveType;
	start_date: string; // YYYY-MM-DD
	end_date: string;
	reason?: string | null;
}
export interface UploadDocumentRequest {
	file_name: string;
	file_url: string;
	doc_type: string;
}
export interface Document {
	id: UUID;
	file_name: string;
	file_url: string;
	doc_type: string;
	created_at: DateTime;
}

// ----------------------------------------------------------------------------
// SOND
// ----------------------------------------------------------------------------

export interface FormQuestion {
	id: UUID;
	label: string;
	type:
		| "text"
		| "number"
		| "date"
		| "choice"
		| "multiple_choice"
		| "rating"
		| "email"
		| "phone";
	required: boolean;
	options?: string[];
	min?: number;
	max?: number;
	conditions?: Array<{
		question_id: UUID;
		operator:
			| "equals"
			| "not_equals"
			| "greater_than"
			| "less_than"
			| "contains"
			| "not_contains"
			| "is_empty"
			| "is_not_empty";
		value: unknown;
	}>;
}
export interface Form {
	id: UUID;
	title: string;
	description?: string;
	questions: FormQuestion[];
	branding?: Record<string, unknown>;
	mode: "standard" | "conversational";
	routing_rules?: Array<{
		conditions: Array<{
			field: UUID;
			operator: "eq" | "neq" | "contains" | "not_contains";
			value: string;
		}>;
		actions: Array<{
			type: "notify" | "create_lead" | "webhook";
			target?: string;
			url?: string;
		}>;
	}>;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateFormRequest {
	title: string;
	description?: string;
	questions: Omit<FormQuestion, "id">[];
	branding?: Record<string, unknown>;
	mode?: "standard" | "conversational";
}
export interface UpdateFormRequest {
	title?: string | null;
	description?: string | null;
	questions?: Omit<FormQuestion, "id">[] | null;
	mode?: "standard" | "conversational" | null;
	routing_rules?: Form["routing_rules"] | null;
}

export interface AnswerValue {
	type:
		| "text"
		| "number"
		| "date"
		| "choice"
		| "multiple_choice"
		| "rating"
		| "email"
		| "phone"
		| "boolean";
	value: unknown;
}
export interface AnswerInput {
	question_id: UUID;
	value: AnswerValue;
}
export interface Submission {
	id: UUID;
	form_id: UUID;
	answers: AnswerInput[];
	respondent_id?: UUID;
	submitted_at: DateTime;
}
export interface SubmitFormRequest {
	answers: AnswerInput[];
	respondent_id?: UUID;
}
export interface ConversationalStepRequest {
	question_id: UUID;
	answer: AnswerInput;
}
export interface ConversationalStepResponse {
	is_complete: boolean;
	next_question_id?: UUID;
}

// ----------------------------------------------------------------------------
// SPARK
// ----------------------------------------------------------------------------

export type Trigger =
	| { type: "webhook"; path: string }
	| { type: "schedule"; cron: string }
	| { type: "event"; event_type: string };

export type Condition =
	| { type: "field_equals"; field: string; value: unknown }
	| { type: "field_not_equals"; field: string; value: unknown }
	| { type: "field_contains"; field: string; value: string }
	| { type: "field_not_contains"; field: string; value: string }
	| { type: "field_greater_than"; field: string; value: number }
	| { type: "field_less_than"; field: string; value: number }
	| { type: "field_exists"; field: string }
	| { type: "field_not_exists"; field: string }
	| { type: "and"; conditions: Condition[] }
	| { type: "or"; conditions: Condition[] }
	| { type: "not"; condition: Condition };

export type Action =
	| { type: "request_approval"; approver_role: string }
	| { type: "send_email"; to: string; subject: string; body: string }
	| { type: "update_record"; table: string; record_id: string; fields: string }
	| {
			type: "create_dial_channel";
			name: string;
			channel_type: string;
			participants: UUID[];
	  }
	| { type: "send_dial_message"; channel_id: UUID; content: string }
	| { type: "create_cinq_contact"; name: string; email: string; phone?: string }
	| {
			type: "create_cinq_activity";
			contact_id: UUID;
			activity_type: string;
			description: string;
	  }
	| { type: "reserve_vault_stock"; variant_id: UUID; quantity: number }
	| {
			type: "adjust_vault_stock";
			variant_id: UUID;
			delta: number;
			reason: string;
	  }
	| { type: "create_cinq_lead"; name: string; email: string; source: string }
	| {
			type: "webhook";
			url: string;
			method: string;
			body: unknown;
			headers: Record<string, string>;
	  };

export interface Workflow {
	id: UUID;
	name: string;
	trigger: Trigger;
	conditions: Condition[];
	actions: Action[];
	is_active: boolean;
	webhook_secret?: string;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateWorkflowRequest {
	name: string;
	trigger: Trigger;
	conditions?: Condition[];
	actions: Action[];
	webhook_secret?: string;
}
export interface UpdateWorkflowRequest {
	name?: string | null;
	is_active?: boolean | null;
}
export interface WorkflowRun {
	id: UUID;
	workflow_id: UUID;
	status:
		| "running"
		| "pending_approval"
		| "approved"
		| "rejected"
		| "completed"
		| "failed";
	payload: Record<string, unknown>;
	created_at: DateTime;
	updated_at: DateTime;
}
export interface TriggerWorkflowRequest {
	payload: Record<string, unknown>;
}
export interface WorkflowListParams {
	limit?: number;
	offset?: number;
}

// ----------------------------------------------------------------------------
// TEMPO
// ----------------------------------------------------------------------------

export interface EventType {
	id: UUID;
	name: string;
	slug: string;
	description?: string;
	duration_minutes: number;
	is_active: boolean;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateEventTypeRequest {
	name: string;
	slug: string;
	description?: string;
	duration_minutes: number;
}
export interface UpdateEventTypeRequest {
	name?: string | null;
	slug?: string | null;
	description?: string | null | null;
	duration_minutes?: number | null;
	is_active?: boolean | null;
}

export interface AvailabilitySlot {
	id: UUID;
	event_type_id: UUID;
	start_time: DateTime;
	end_time: DateTime;
	is_booked: boolean;
}
export interface CreateAvailabilitySlotRequest {
	event_type_id: UUID;
	start_time: DateTime;
	end_time: DateTime;
}

export interface Booking {
	id: UUID;
	event_type_id: UUID;
	starts_at: DateTime;
	duration_minutes: number;
	timezone: string;
	status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
	contact_id?: UUID;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateBookingRequest {
	event_type_id: UUID;
	starts_at: DateTime;
	duration_minutes: number;
	timezone?: string;
	contact_id?: UUID;
}
export interface RescheduleBookingRequest {
	starts_at: DateTime;
}
export interface PublicBookingRequest {
	slug: string;
	starts_at: DateTime;
	timezone?: string;
	invitee_name: string;
	invitee_email: string;
}

// ----------------------------------------------------------------------------
// VAULT
// ----------------------------------------------------------------------------

export interface Product {
	id: UUID;
	name: string;
	description: string;
	sku: string;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateProductRequest {
	name: string;
	description: string;
	sku: string;
}
export interface UpdateProductRequest {
	name?: string | null;
	description?: string | null;
	sku?: string | null;
}

export interface Variant {
	id: UUID;
	product_id: UUID;
	sku: string;
	price: number; // in cents
	stock_quantity: number;
	reserved_quantity: number;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateVariantRequest {
	product_id: UUID;
	sku: string;
	initial_stock: number;
	price: number;
}
export interface UpdateVariantRequest {
	price?: number | null;
	sku?: string | null;
}
export interface UpdateStockRequest {
	delta: number;
	reason: string;
	reference?: string;
	alert_channel_id?: UUID;
}
export interface ReserveStockRequest {
	quantity: number;
}
export interface BulkStockAdjustment {
	variant_id: UUID;
	delta: number;
	expected_version: number;
}
export interface BulkStockAdjustRequest {
	adjustments: BulkStockAdjustment[];
	reason: string;
}

export interface StockMovement {
	id: UUID;
	variant_id: UUID;
	quantity: number;
	reason: string;
	reference?: string;
	timestamp: DateTime;
}

export interface Warehouse {
	id: UUID;
	name: string;
	location?: string;
	created_at: DateTime;
	version: number;
}
export interface CreateWarehouseRequest {
	name: string;
	location?: string;
}
export interface UpdateWarehouseRequest {
	name?: string | null;
	location?: string | null | null;
}

export interface LowStockParams {
	threshold?: number;
}

// ----------------------------------------------------------------------------
// VISTA
// ----------------------------------------------------------------------------

export interface Dashboard {
	id: UUID;
	name: string;
	config: Record<string, unknown>;
	created_at: DateTime;
	updated_at: DateTime;
	version: number;
}
export interface CreateDashboardRequest {
	name: string;
	config: Record<string, unknown>;
}
export interface UpdateDashboardRequest {
	name?: string | null;
	config?: Record<string, unknown> | null;
}

export interface KpiSummary {
	total_events: number;
	total_contacts: number;
	total_deals: number;
	total_deals_won: number;
	total_pipeline_value: number;
	total_revenue: number;
	total_products: number;
	low_stock_variants: number;
	total_bookings: number;
	pending_leave_requests: number;
	last_updated: DateTime;
}

export interface DataPoint {
	timestamp: DateTime;
	metric_name: string;
	value: number;
}
export interface DrillDownRequest {
	metric: string;
	dimension: string;
	value: string;
	limit?: number;
}
export interface CombineDataRequest {
	primary: string;
	secondary: string;
	from_date: DateTime;
	to_date: DateTime;
	group_by?: string;
}
export interface CrossAppQuery {
	view: string;
}
