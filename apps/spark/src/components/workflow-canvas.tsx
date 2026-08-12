import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const nodeStyles: Record<string, string> = {
  trigger: 'border-l-4 border-l-green-500',
  action: 'border-l-4 border-l-blue-500',
  condition: 'border-l-4 border-l-amber-500',
};

interface WorkflowCanvasProps {
  onNodeSelect: (node: Node | null) => void;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
}

export function WorkflowCanvas({ onNodeSelect, nodes, edges, onNodesChange, onEdgesChange }: WorkflowCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rfNodes, setNodes, onRfNodesChange] = useNodesState(nodes);
  const [rfEdges, setEdges, onRfEdgesChange] = useEdgesState(edges);

  const handleConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      onEdgesChange(rfEdges);
    },
    [setEdges, rfEdges, onEdgesChange]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw) return;
      const { nodeType, nodeId } = JSON.parse(raw);
      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = { x: event.clientX - bounds.left - 100, y: event.clientY - bounds.top - 20 };
      const newNode: Node = {
        id: crypto.randomUUID(),
        type: 'default',
        position,
        data: { label: nodeId, nodeType },
        className: `bg-card border-border text-foreground rounded-lg p-4 shadow-md ${nodeStyles[nodeType] || ''}`,
      };
      setNodes((nds) => [...nds, newNode]);
      onNodesChange(rfNodes);
    },
    [setNodes, rfNodes, onNodesChange]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div ref={wrapperRef} className="h-full w-full bg-background" data-tour="canvas" onDrop={handleDrop} onDragOver={handleDragOver}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={(changes) => { onRfNodesChange(changes); onNodesChange(rfNodes); }}
        onEdgesChange={(changes) => { onRfEdgesChange(changes); onEdgesChange(rfEdges); }}
        onConnect={handleConnect}
        onNodeClick={(_evt, node) => onNodeSelect(node)}
        onPaneClick={() => onNodeSelect(null)}
        fitView
        style={{ background: 'transparent' }}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="rgba(255,255,255,0.1)" />
      </ReactFlow>
    </div>
  );
}
