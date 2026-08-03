import React, { useCallback } from 'react';
import {
  ReactFlow,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '../lib/utils';

export interface WorkflowCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  className?: string;
  height?: string | number;
}

export function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  nodeTypes = {},
  edgeTypes = {},
  className,
  height = '500px',
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChangeDefault] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeDefault] = useEdgesState(initialEdges);

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChangeDefault(changes);
      if (onNodesChange) {
        setTimeout(() => onNodesChange(nodes), 0);
      }
    },
    [onNodesChangeDefault, onNodesChange, nodes]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChangeDefault(changes);
      if (onEdgesChange) {
        setTimeout(() => onEdgesChange(edges), 0);
      }
    },
    [onEdgesChangeDefault, onEdgesChange, edges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      if (onEdgesChange) {
        setTimeout(() => onEdgesChange(edges), 0);
      }
    },
    [setEdges, onEdgesChange, edges]
  );

  return (
    <div className={cn('w-full rounded-lg border border-gray-700/40 overflow-hidden bg-deep-night', className)} style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.5}
        maxZoom={2}
        style={{ background: 'transparent' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="rgba(255,255,255,0.1)" />
        <Controls className="bg-deep-night border border-gray-700/40 rounded-lg" />
        <MiniMap
          className="bg-deep-night border border-gray-700/40 rounded-lg"
          maskColor="rgba(0,0,0,0.5)"
          nodeColor={() => '#F59E0B'}
        />
      </ReactFlow>
    </div>
  );
}

// Re-export commonly used types and utilities for convenience
export { useNodesState, useEdgesState, addEdge };
export type { Connection, Edge, Node, NodeTypes, EdgeTypes };
