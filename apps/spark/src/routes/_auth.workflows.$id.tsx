import type {
	Action,
	Condition,
	CreateWorkflowRequest,
	Trigger,
	Workflow,
} from "@ataqu/api-client";
import { Button, Input, OnboardTour } from "@ataqu/ui";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { Edge } from "@xyflow/react";
import { ArrowLeft, Play, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	useCreateWorkflow,
	useDeleteWorkflow,
	useGetWorkflow,
	useUpdateWorkflow,
} from "../api/spark-api";
import { NodeConfigPanel } from "../components/node-config-panel";
import { NodeSidebar } from "../components/node-sidebar";
import { TestRunModal } from "../components/test-run-modal";
import { type SparkNode, WorkflowCanvas } from "../components/workflow-canvas";

export const Route = createFileRoute("/_auth/workflows/$id")({
	component: WorkflowDetail,
});

const TOUR_STEPS = [
	{
		selector: '[data-tour="trigger-sidebar"]',
		content: t`Zapier charges per task. We charge $0. Pick a trigger.`,
		title: t`Step 1: Choose a trigger`,
	},
	{
		selector: '[data-tour="canvas"]',
		content: t`Drag it here. Connect it to an action. You're done.`,
		title: t`Step 2: Build your workflow`,
	},
];

// ---- Deserialize backend workflow into React Flow nodes ----
function workflowToNodes(wf: Workflow): SparkNode[] {
	const nodes: SparkNode[] = [];
	let yPos = 0;

	const triggerLabel =
		wf.trigger.type === "event"
			? wf.trigger.event_type
			: wf.trigger.type === "schedule"
				? wf.trigger.cron
				: "Webhook";

	nodes.push({
		id: "trigger-0",
		type: "trigger",
		position: { x: 250, y: yPos },
		data: {
			label: triggerLabel,
			subtype: wf.trigger.type,
			category: "trigger",
			config: wf.trigger as Record<string, unknown>,
		},
	});
	yPos += 120;

	wf.conditions.forEach((cond, i) => {
		nodes.push({
			id: `condition-${i}`,
			type: "condition",
			position: { x: 250, y: yPos },
			data: {
				label: cond.type,
				subtype: cond.type,
				category: "condition",
				config: cond as unknown as Record<string, unknown>,
			},
		});
		yPos += 120;
	});

	wf.actions.forEach((action, i) => {
		nodes.push({
			id: `action-${i}`,
			type: "action",
			position: { x: 250, y: yPos },
			data: {
				label: action.type,
				subtype: action.type,
				category: "action",
				config: action as unknown as Record<string, unknown>,
			},
		});
		yPos += 120;
	});

	return nodes;
}

function workflowToEdges(wf: Workflow): Edge[] {
	const edges: Edge[] = [];
	const totalNodes = 1 + wf.conditions.length + wf.actions.length;
	for (let i = 0; i < totalNodes - 1; i++) {
		const sourceId =
			i === 0
				? "trigger-0"
				: i <= wf.conditions.length
					? `condition-${i - 1}`
					: `action-${i - 1 - wf.conditions.length}`;
		const targetId =
			i < wf.conditions.length
				? `condition-${i}`
				: `action-${i - wf.conditions.length}`;
		edges.push({
			id: `edge-${i}`,
			source: sourceId,
			target: targetId,
			animated: true,
			style: { stroke: "#F59E0B", strokeWidth: 2 },
		});
	}
	return edges;
}

// ---- Serialize React Flow nodes into backend request ----
function nodesToWorkflowRequest(
	nodes: SparkNode[],
	name: string,
): Partial<CreateWorkflowRequest> {
	const triggerNode = nodes.find((n) => n.type === "trigger");
	const actionNodes = nodes.filter((n) => n.type === "action");
	const conditionNodes = nodes.filter((n) => n.type === "condition");

	const triggerConfig = (triggerNode?.data?.config || {}) as Record<
		string,
		unknown
	>;
	const triggerSubtype = triggerNode?.data?.subtype || "event";

	let trigger: Trigger = { type: "event", event_type: "cinq.deal.won" };
	if (triggerSubtype === "schedule") {
		trigger = {
			type: "schedule",
			cron: String(triggerConfig.cron || "0 9 * * *"),
		};
	} else if (triggerSubtype === "webhook") {
		trigger = {
			type: "webhook",
			path: String(triggerConfig.path || "/webhooks/default"),
		};
	} else {
		trigger = {
			type: "event",
			event_type: String(triggerConfig.event_type || "cinq.deal.won"),
		};
	}

	const actions: Action[] = actionNodes.map((n) => {
		const config = (n.data?.config || {}) as Record<string, unknown>;
		const subtype = n.data?.subtype || "send_email";
		const params = (config.params || config) as Record<string, unknown>;

		switch (subtype) {
			case "create_dial_channel":
				return {
					type: "create_dial_channel",
					name: String(params.name || ""),
					channel_type: String(params.channel_type || "public"),
					participants: (params.participants as string[]) || [],
				};
			case "send_dial_message":
				return {
					type: "send_dial_message",
					channel_id: String(params.channel_id || ""),
					content: String(params.content || ""),
				};
			case "reserve_vault_stock":
				return {
					type: "reserve_vault_stock",
					variant_id: String(params.variant_id || ""),
					quantity: Number(params.quantity || 1),
				};
			case "adjust_vault_stock":
				return {
					type: "adjust_vault_stock",
					variant_id: String(params.variant_id || ""),
					delta: Number(params.delta || 0),
					reason: String(params.reason || ""),
				};
			case "create_cinq_contact":
				return {
					type: "create_cinq_contact",
					name: String(params.name || ""),
					email: String(params.email || ""),
					phone: params.phone as string | undefined,
				};
			case "create_cinq_activity":
				return {
					type: "create_cinq_activity",
					contact_id: String(params.contact_id || ""),
					activity_type: String(params.activity_type || "note"),
					description: String(params.description || ""),
				};
			case "create_cinq_lead":
				return {
					type: "create_cinq_lead",
					name: String(params.name || ""),
					email: String(params.email || ""),
					source: String(params.source || ""),
				};
			case "request_approval":
				return {
					type: "request_approval",
					approver_role: String(params.approver_role || "admin"),
				};
			case "send_email":
				return {
					type: "send_email",
					to: String(params.to || ""),
					subject: String(params.subject || ""),
					body: String(params.body || ""),
				};
			case "webhook_action":
				return {
					type: "webhook",
					url: String(params.url || ""),
					method: String(params.method || "POST"),
					body: params.body || {},
					headers: (params.headers as Record<string, string>) || {},
				};
			default:
				return { type: "send_email", to: "", subject: "", body: "" };
		}
	});

	const conditions: Condition[] = conditionNodes.map((n) => {
		const config = (n.data?.config || {}) as Record<string, unknown>;
		const subtype = n.data?.subtype || "field_equals";
		switch (subtype) {
			case "field_equals":
				return {
					type: "field_equals",
					field: String(config.field || ""),
					value: config.value ?? "",
				};
			case "field_not_equals":
				return {
					type: "field_not_equals",
					field: String(config.field || ""),
					value: config.value ?? "",
				};
			case "field_greater_than":
				return {
					type: "field_greater_than",
					field: String(config.field || ""),
					value: Number(config.value || 0),
				};
			case "field_less_than":
				return {
					type: "field_less_than",
					field: String(config.field || ""),
					value: Number(config.value || 0),
				};
			case "field_contains":
				return {
					type: "field_contains",
					field: String(config.field || ""),
					value: String(config.value || ""),
				};
			case "field_not_contains":
				return {
					type: "field_not_contains",
					field: String(config.field || ""),
					value: String(config.value || ""),
				};
			case "field_exists":
				return { type: "field_exists", field: String(config.field || "") };
			case "field_not_exists":
				return { type: "field_not_exists", field: String(config.field || "") };
			case "and":
				return { type: "and", conditions: [] };
			case "or":
				return { type: "or", conditions: [] };
			case "not":
				return { type: "not", condition: { type: "field_exists", field: "" } };
			default:
				return { type: "field_equals", field: "", value: "" };
		}
	});

	return { name, trigger, conditions, actions };
}

function WorkflowDetail() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const isNew = id === "new";

	const { data: workflow, isLoading } = useGetWorkflow(isNew ? undefined : id);
	const createMutation = useCreateWorkflow();
	const updateMutation = useUpdateWorkflow();
	const deleteMutation = useDeleteWorkflow();

	const [selectedNode, setSelectedNode] = useState<SparkNode | null>(null);
	const [nodes, setNodes] = useState<SparkNode[]>([]);
	const [edges, setEdges] = useState<Edge[]>([]);
	const [workflowName, setWorkflowName] = useState("");
	const [showTestModal, setShowTestModal] = useState(false);
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		if (workflow && !initialized) {
			setWorkflowName(workflow.name);
			setNodes(workflowToNodes(workflow));
			setEdges(workflowToEdges(workflow));
			setInitialized(true);
		}
	}, [workflow, initialized]);

	const handleNodeUpdate = useCallback(
		(nodeId: string, data: Record<string, unknown>) => {
			setNodes((prev) =>
				prev.map((n) =>
					n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
				),
			);
			setSelectedNode(null);
		},
		[],
	);

	const handleSave = useCallback(() => {
		const req = nodesToWorkflowRequest(nodes, workflowName);
		if (!req.name?.trim()) {
			toast.error(t`Workflow name is required.`);
			return;
		}

		if (isNew) {
			createMutation.mutate(req as CreateWorkflowRequest, {
				onSuccess: (created) => {
					toast.success(t`Workflow saved.`);
					navigate({ to: "/workflows/$id", params: { id: created.id } });
				},
				onError: () => toast.error(t`Failed to create workflow.`),
			});
		} else if (workflow) {
			updateMutation.mutate(
				{
					id: workflow.id,
					data: { name: req.name, is_active: workflow.is_active },
					version: workflow.version,
				},
				{
					onSuccess: () => toast.success(t`Workflow saved.`),
					onError: () => toast.error(t`Failed to save workflow.`),
				},
			);
		}
	}, [
		isNew,
		workflow,
		nodes,
		workflowName,
		createMutation,
		updateMutation,
		navigate,
	]);

	const handleDelete = useCallback(() => {
		if (!workflow) return;
		deleteMutation.mutate(workflow.id, {
			onSuccess: () => {
				toast.success(t`Workflow deleted.`);
				navigate({ to: "/" });
			},
			onError: () => toast.error(t`Failed to delete workflow.`),
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
			<header className="flex items-center justify-between p-4 border-b border-border bg-card flex-shrink-0">
				<div className="flex items-center gap-3 flex-1 min-w-0">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => navigate({ to: "/" })}
						className="h-8 w-8 flex-shrink-0"
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<Input
						value={workflowName}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setWorkflowName(e.target.value)
						}
						placeholder={t`Workflow name`}
						className="max-w-md font-heading font-bold text-lg border-none shadow-none focus-visible:ring-0 px-0 h-auto"
					/>
				</div>
				<div className="flex items-center gap-2 flex-shrink-0">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowTestModal(true)}
					>
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
