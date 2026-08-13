import {
	addEdge,
	Background,
	BackgroundVariant,
	type Connection,
	Controls,
	type Edge,
	Handle,
	type Node,
	type NodeTypes,
	Position,
	ReactFlow,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import { useCallback, useRef } from "react";
import "@xyflow/react/dist/style.css";

export interface SparkNodeData {
	label: string;
	subtype: string;
	category: "trigger" | "action" | "condition";
	description?: string;
	config?: Record<string, unknown>;
	[key: string]: unknown;
}

export type SparkNode = Node<SparkNodeData>;

function TriggerNode({ data }: { data: SparkNodeData }) {
	return (
		<div className="bg-card border border-border rounded-lg p-4 border-l-4 border-l-green-500 min-w-[200px] shadow-md">
			<Handle
				type="source"
				position={Position.Bottom}
				className="!bg-green-500 !w-3 !h-3"
			/>
			<div className="text-xs font-semibold text-green-500 uppercase tracking-wider mb-1">
				{data.subtype}
			</div>
			<div className="font-medium text-foreground text-sm">{data.label}</div>
			{data.description && (
				<div className="text-xs text-muted-foreground mt-1">
					{data.description}
				</div>
			)}
		</div>
	);
}

function ActionNode({ data }: { data: SparkNodeData }) {
	return (
		<div className="bg-card border border-border rounded-lg p-4 border-l-4 border-l-blue-500 min-w-[200px] shadow-md">
			<Handle
				type="target"
				position={Position.Top}
				className="!bg-blue-500 !w-3 !h-3"
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				className="!bg-blue-500 !w-3 !h-3"
			/>
			<div className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">
				{data.subtype}
			</div>
			<div className="font-medium text-foreground text-sm">{data.label}</div>
			{data.description && (
				<div className="text-xs text-muted-foreground mt-1">
					{data.description}
				</div>
			)}
		</div>
	);
}

function ConditionNode({ data }: { data: SparkNodeData }) {
	return (
		<div className="bg-card border border-border rounded-lg p-4 border-l-4 border-l-amber-500 min-w-[200px] shadow-md">
			<Handle
				type="target"
				position={Position.Top}
				className="!bg-amber-500 !w-3 !h-3"
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				className="!bg-amber-500 !w-3 !h-3"
				id="true"
				style={{ left: "30%" }}
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				className="!bg-red-500 !w-3 !h-3"
				id="false"
				style={{ left: "70%" }}
			/>
			<div className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">
				{data.subtype}
			</div>
			<div className="font-medium text-foreground text-sm">{data.label}</div>
			{data.description && (
				<div className="text-xs text-muted-foreground mt-1">
					{data.description}
				</div>
			)}
			<div className="flex gap-4 mt-2 text-xs">
				<span className="text-green-500">✓ True</span>
				<span className="text-red-500">✗ False</span>
			</div>
		</div>
	);
}

const nodeTypes: NodeTypes = {
	trigger: TriggerNode,
	action: ActionNode,
	condition: ConditionNode,
};

interface WorkflowCanvasProps {
	initialNodes?: SparkNode[];
	initialEdges?: Edge[];
	onNodesChange?: (nodes: SparkNode[]) => void;
	onEdgesChange?: (edges: Edge[]) => void;
	onNodeSelect?: (node: SparkNode | null) => void;
}

export function WorkflowCanvas({
	initialNodes = [],
	initialEdges = [],
	onNodesChange,
	onEdgesChange,
	onNodeSelect,
}: WorkflowCanvasProps) {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const [nodes, setNodes, onNodesChangeRf] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChangeRf] = useEdgesState(initialEdges);

	const handleConnect = useCallback(
		(params: Connection) => {
			setEdges((eds) =>
				addEdge(
					{
						...params,
						animated: true,
						style: { stroke: "#F59E0B", strokeWidth: 2 },
					},
					eds,
				),
			);
			if (onEdgesChange) {
				setTimeout(() => onEdgesChange(edges), 0);
			}
		},
		[setEdges, edges, onEdgesChange],
	);

	const handleDrop = useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();
			const raw = event.dataTransfer.getData("application/reactflow");
			if (!raw) return;

			const nodeDef = JSON.parse(raw) as {
				id: string;
				label: string;
				category: string;
			};
			const bounds = wrapperRef.current?.getBoundingClientRect();
			if (!bounds) return;

			const position = {
				x: event.clientX - bounds.left - 100,
				y: event.clientY - bounds.top - 20,
			};

			const newNode: SparkNode = {
				id: crypto.randomUUID(),
				type: nodeDef.category,
				position,
				data: {
					label: nodeDef.label,
					subtype: nodeDef.id,
					category: nodeDef.category as "trigger" | "action" | "condition",
					config: {},
				},
			};

			setNodes((nds) => [...nds, newNode]);
			if (onNodesChange) {
				setTimeout(() => onNodesChange([...nodes, newNode]), 0);
			}
		},
		[setNodes, nodes, onNodesChange],
	);

	const handleDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
	}, []);

	return (
		<div
			ref={wrapperRef}
			className="h-full w-full bg-background"
			data-tour="canvas"
			onDrop={handleDrop}
			onDragOver={handleDragOver}
		>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={(changes) => {
					onNodesChangeRf(changes);
					if (onNodesChange) setTimeout(() => onNodesChange(nodes), 0);
				}}
				onEdgesChange={(changes) => {
					onEdgesChangeRf(changes);
					if (onEdgesChange) setTimeout(() => onEdgesChange(edges), 0);
				}}
				onConnect={handleConnect}
				onNodeClick={(_evt, node) => onNodeSelect?.(node as SparkNode)}
				onPaneClick={() => onNodeSelect?.(null)}
				nodeTypes={nodeTypes}
				fitView
				minZoom={0.3}
				maxZoom={2}
				style={{ background: "transparent" }}
			>
				<Background
					variant={BackgroundVariant.Dots}
					gap={16}
					size={1}
					color="rgba(255,255,255,0.08)"
				/>
				<Controls className="bg-card border-border rounded-lg" />
			</ReactFlow>
		</div>
	);
}
