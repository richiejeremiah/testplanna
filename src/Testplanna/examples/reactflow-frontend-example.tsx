/**
 * Example Frontend ReactFlow Component
 * This shows how to consume the graph data from backend
 */

import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom Node Components
const FileNode = ({ data }: { data: any }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-500">
    <div className="flex items-center gap-2">
      <span className="text-2xl">📄</span>
      <div>
        <div className="font-bold">{data.label}</div>
        <div className="text-xs text-gray-500">{data.functionCount} functions</div>
      </div>
    </div>
  </div>
);

const FunctionNode = ({ data }: { data: any }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-green-500">
    <div className="flex items-center gap-2">
      <span className="text-xl">⚙️</span>
      <div>
        <div className="font-semibold">{data.label}</div>
        <div className="text-xs text-gray-500">
          Complexity: {data.complexity} | Line {data.line}
        </div>
      </div>
    </div>
  </div>
);

const TestNode = ({ data }: { data: any }) => {
  const statusColor = data.status === 'pass' ? 'bg-green-500' : 'bg-red-500';
  return (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 ${statusColor}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">✅</span>
        <div>
          <div className="font-semibold">{data.label}</div>
          <div className="text-xs text-gray-500">
            {data.status} | {data.coverage}% coverage
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskNode = ({ data }: { data: any }) => {
  const statusColors = {
    'todo': 'border-gray-400',
    'in-progress': 'border-yellow-500',
    'done': 'border-green-500',
    'blocked': 'border-red-500'
  };
  return (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 ${statusColors[data.status as keyof typeof statusColors] || 'border-gray-400'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">📋</span>
        <div>
          <div className="font-semibold">{data.label}</div>
          <div className="text-xs text-gray-500 capitalize">{data.status}</div>
        </div>
      </div>
    </div>
  );
};

// Register custom node types
const nodeTypes: NodeTypes = {
  file: FileNode,
  function: FunctionNode,
  test: TestNode,
  task: TaskNode,
};

/**
 * Main ReactFlow Canvas Component
 */
export default function WorkflowVisualizer() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  // Fetch graph data from backend
  useEffect(() => {
    async function fetchGraphData() {
      try {
        const response = await fetch('/api/workflow?scope=workspace');
        const graphData = await response.json();
        
        // Transform backend data to ReactFlow format
        setNodes(graphData.nodes);
        setEdges(graphData.edges);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch graph data:', error);
        setLoading(false);
      }
    }
    
    fetchGraphData();
  }, []);

  // Handle edge connections (for interactive editing)
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  // Handle node click (e.g., open file in VS Code)
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Example: Send message to VS Code extension to open file
    if (node.type === 'file' && node.data.path) {
      window.vscode?.postMessage({
        command: 'openFile',
        path: node.data.path
      });
    }
  }, []);

  if (loading) {
    return <div className="p-8">Loading graph...</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

/**
 * Example: Filter component to show/hide node types
 */
export function GraphFilters({ onFilterChange }: { onFilterChange: (filters: any) => void }) {
  const [filters, setFilters] = useState({
    showFiles: true,
    showFunctions: true,
    showTests: true,
    showTasks: true,
  });

  const toggleFilter = (key: keyof typeof filters) => {
    const newFilters = { ...filters, [key]: !filters[key] };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10">
      <h3 className="font-bold mb-2">Filters</h3>
      {Object.entries(filters).map(([key, value]) => (
        <label key={key} className="flex items-center gap-2 mb-1">
          <input
            type="checkbox"
            checked={value}
            onChange={() => toggleFilter(key as keyof typeof filters)}
          />
          <span className="capitalize">{key.replace('show', '')}</span>
        </label>
      ))}
    </div>
  );
}



