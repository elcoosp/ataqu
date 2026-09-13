import { Trans } from "@lingui/react/macro";
import {
	CalendarCheck,
	Clock,
	Filter,
	Mail,
	MessageSquare,
	Package,
	Shield,
	Users,
	Webhook,
	Zap,
} from "lucide-react";

interface NodeDefinition {
	id: string;
	label: string;
	icon: React.ReactNode;
	category: "trigger" | "action" | "condition";
}

const TRIGGER_NODES: NodeDefinition[] = [
	{
		id: "event",
		label: "Outbox Event",
		icon: <Zap className="h-4 w-4" />,
		category: "trigger",
	},
	{
		id: "schedule",
		label: "Schedule",
		icon: <Clock className="h-4 w-4" />,
		category: "trigger",
	},
	{
		id: "webhook",
		label: "Webhook",
		icon: <Webhook className="h-4 w-4" />,
		category: "trigger",
	},
];

const ACTION_NODES: NodeDefinition[] = [
	{
		id: "create_dial_channel",
		label: "Create DIAL Channel",
		icon: <MessageSquare className="h-4 w-4" />,
		category: "action",
	},
	{
		id: "send_dial_message",
		label: "Send DIAL Message",
		icon: <Mail className="h-4 w-4" />,
		category: "action",
	},
	{
		id: "reserve_vault_stock",
		label: "Reserve VAULT Stock",
		icon: <Package className="h-4 w-4" />,
		category: "action",
	},
	{
		id: "adjust_vault_stock",
		label: "Adjust VAULT Stock",
		icon: <Package className="h-4 w-4" />,
		category: "action",
	},
	{
		id: "create_cinq_contact",
		label: "Create CINQ Contact",
		icon: <Users className="h-4 w-4" />,
		category: "action",
	},
	{
		id: "create_cinq_activity",
		label: "Create CINQ Activity",
		icon: <CalendarCheck className="h-4 w-4" />,
		category: "action",
	},
	{
		id: "create_cinq_lead",
		label: "Create CINQ Lead",
		icon: <Users className="h-4 w-4" />,
		category: "action",
	},
	{
		id: "request_approval",
		label: "Request Approval",
		icon: <Shield className="h-4 w-4" />,
		category: "action",
	},
	{
		id: "send_email",
		label: "Send Email",
		icon: <Mail className="h-4 w-4" />,
		category: "action",
	},
	{
		id: "webhook_action",
		label: "Outbound Webhook",
		icon: <Webhook className="h-4 w-4" />,
		category: "action",
	},
];

const CONDITION_NODES: NodeDefinition[] = [
	{
		id: "field_equals",
		label: "Field Equals",
		icon: <Filter className="h-4 w-4" />,
		category: "condition",
	},
	{
		id: "field_greater_than",
		label: "Field Greater Than",
		icon: <Filter className="h-4 w-4" />,
		category: "condition",
	},
	{
		id: "field_less_than",
		label: "Field Less Than",
		icon: <Filter className="h-4 w-4" />,
		category: "condition",
	},
	{
		id: "field_contains",
		label: "Field Contains",
		icon: <Filter className="h-4 w-4" />,
		category: "condition",
	},
	{
		id: "field_exists",
		label: "Field Exists",
		icon: <Filter className="h-4 w-4" />,
		category: "condition",
	},
	{
		id: "and",
		label: "AND Group",
		icon: <Filter className="h-4 w-4" />,
		category: "condition",
	},
	{
		id: "or",
		label: "OR Group",
		icon: <Filter className="h-4 w-4" />,
		category: "condition",
	},
];

const CATEGORY_STYLES: Record<string, string> = {
	trigger: "border-l-green-500",
	action: "border-l-blue-500",
	condition: "border-l-amber-500",
};

export function NodeSidebar() {
	const onDragStart = (event: React.DragEvent, node: NodeDefinition) => {
		event.dataTransfer.setData("application/reactflow", JSON.stringify(node));
		event.dataTransfer.effectAllowed = "move";
	};

	return (
		<aside
			className="w-64 border-r border-border bg-card overflow-y-auto flex-shrink-0 p-4"
			data-tour="trigger-sidebar"
		>
			<h2 className="text-sm font-heading font-bold text-foreground mb-4">
				<Trans>Workflow Nodes</Trans>
			</h2>

			<div className="mb-6">
				<h3 className="text-xs font-semibold text-green-500 uppercase tracking-wider mb-2">
					<Trans>Triggers</Trans>
				</h3>
				<div className="space-y-1.5">
					{TRIGGER_NODES.map((node) => (
						<div
							key={node.id}
							className={`flex items-center gap-2 p-2.5 rounded-md border border-l-4 ${CATEGORY_STYLES[node.category]} border-border bg-background text-sm cursor-grab active:cursor-grabbing hover:bg-accent transition-colors`}
							draggable
							onDragStart={(e) => onDragStart(e, node)}
						>
							{node.icon}
							<span className="text-foreground">{node.label}</span>
						</div>
					))}
				</div>
			</div>

			<div className="mb-6">
				<h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">
					<Trans>Actions</Trans>
				</h3>
				<div className="space-y-1.5">
					{ACTION_NODES.map((node) => (
						<div
							key={node.id}
							className={`flex items-center gap-2 p-2.5 rounded-md border border-l-4 ${CATEGORY_STYLES[node.category]} border-border bg-background text-sm cursor-grab active:cursor-grabbing hover:bg-accent transition-colors`}
							draggable
							onDragStart={(e) => onDragStart(e, node)}
						>
							{node.icon}
							<span className="text-foreground">{node.label}</span>
						</div>
					))}
				</div>
			</div>

			<div>
				<h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">
					<Trans>Conditions</Trans>
				</h3>
				<div className="space-y-1.5">
					{CONDITION_NODES.map((node) => (
						<div
							key={node.id}
							className={`flex items-center gap-2 p-2.5 rounded-md border border-l-4 ${CATEGORY_STYLES[node.category]} border-border bg-background text-sm cursor-grab active:cursor-grabbing hover:bg-accent transition-colors`}
							draggable
							onDragStart={(e) => onDragStart(e, node)}
						>
							{node.icon}
							<span className="text-foreground">{node.label}</span>
						</div>
					))}
				</div>
			</div>
		</aside>
	);
}
