import { useEffect, useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { io } from 'socket.io-client';
import GitHubNode from './nodes/GitHubNode';
import AIReviewNode from './nodes/AIReviewNode';
import CodeRabbitNode from './nodes/CodeRabbitNode';
import JiraNode from './nodes/JiraNode';
import TestExecutionNode from './nodes/TestExecutionNode';
import RewardComputationNode from './nodes/RewardComputationNode';
import NodeDetailsPanel from './NodeDetailsPanel';
import ProgressTimeline from './ProgressTimeline';
import dagre from 'dagre';

const nodeTypes = {
  'github-push': GitHubNode,
  'ai-review': AIReviewNode,
  'coderabbit-review': CodeRabbitNode,
  'test-execution': TestExecutionNode,
  'reward-computation': RewardComputationNode,
  'jira-subtask': JiraNode
};

// Auto-layout function - Improved spacing and organization
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  // Better spacing: more horizontal space, consistent vertical spacing
  dagreGraph.setGraph({ 
    rankdir: direction, 
    nodesep: 150,  // Increased horizontal spacing
    ranksep: 200   // Increased vertical spacing for cleaner flow
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 320, height: 180 }); // Slightly larger nodes
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = 'top';
    node.sourcePosition = 'bottom';
    node.position = {
      x: nodeWithPosition.x - 160, // Centered
      y: nodeWithPosition.y - 90
    };
  });

  // Preserve all edge properties with dotted style
  const layoutedEdges = edges.map(edge => ({
    ...edge, // Keep all original edge properties
    type: 'smoothstep', // Smooth curves
    animated: true,
    style: {
      strokeWidth: 2.5,
      stroke: edge.style?.stroke || '#6366f1',
      strokeDasharray: '8,4', // Dotted line pattern
      ...edge.style
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edge.style?.stroke || edge.markerEnd?.color || '#6366f1',
      width: 18,
      height: 18
    }
  }));

  return { nodes, edges: layoutedEdges };
};

// Inner component that has access to useReactFlow hook for keyboard controls and node navigation
function KeyboardControls({ onNodeFocus }) {
  const { getViewport, setViewport, getNode } = useReactFlow();
  const panSpeed = 50; // pixels per keypress
  const spacePressed = useRef(false);

  // Expose focusNode function to parent
  useEffect(() => {
    if (onNodeFocus) {
      window.focusNodeInFlow = (nodeId) => {
        const node = getNode(nodeId);
        if (node) {
          const viewport = getViewport();
          // Center viewport on node
          setViewport({
            x: -node.position.x + window.innerWidth / 2 - 160,
            y: -node.position.y + window.innerHeight / 2 - 90,
            zoom: viewport.zoom
          }, { duration: 500 });
        }
      };
    }
    return () => {
      delete window.focusNodeInFlow;
    };
  }, [getViewport, setViewport, getNode, onNodeFocus]);

  // Keyboard panning handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignore if typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Track space key for space+drag panning
      if (event.key === ' ' || event.key === 'Space') {
        spacePressed.current = true;
        event.preventDefault(); // Prevent page scroll
      }

      const viewport = getViewport();
      let deltaX = 0;
      let deltaY = 0;

      // Arrow keys or WASD for panning
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        deltaX = panSpeed;
      } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        deltaX = -panSpeed;
      } else if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
        deltaY = panSpeed;
      } else if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
        deltaY = -panSpeed;
      }

      if (deltaX !== 0 || deltaY !== 0) {
        event.preventDefault();
        setViewport({
          x: viewport.x + deltaX,
          y: viewport.y + deltaY,
          zoom: viewport.zoom
        });
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === ' ' || event.key === 'Space') {
        spacePressed.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [getViewport, setViewport]);

  return null; // This component only handles keyboard events
}

export default function WorkflowCanvas({ workflowId, onBack }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Join workflow room
    newSocket.emit('join-workflow', workflowId);

    // Listen for node creation
    newSocket.on('node-created', (node) => {
      setNodes((nds) => {
        const exists = nds.find(n => n.id === node.id);
        if (exists) return nds;
        return [...nds, node];
      });

      // Re-layout after adding node (use setTimeout to batch updates)
      setTimeout(() => {
        setNodes((nds) => {
          setEdges((eds) => {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nds, eds);
            setEdges(layoutedEdges);
            return layoutedNodes;
          });
          return nds;
        });
      }, 100);
    });

    // Listen for node updates
    newSocket.on('node-updated', ({ id, data }) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      );
    });

    // Listen for edge creation
    newSocket.on('edge-created', (edge) => {
      // Ensure edge has proper styling with dotted pattern and arrow marker
      const styledEdge = {
        ...edge,
        id: edge.id || `edge-${edge.source}-${edge.target}`,
        type: 'smoothstep', // Smooth curves
        animated: true,
        style: {
          strokeWidth: 2.5,
          stroke: edge.style?.stroke || '#6366f1',
          strokeDasharray: '8,4', // Dotted line pattern
          ...edge.style
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edge.style?.stroke || edge.markerEnd?.color || '#6366f1',
          width: 18,
          height: 18
        }
      };

      setEdges((eds) => {
        const exists = eds.find(e => e.id === styledEdge.id);
        if (exists) return eds;
        return addEdge(styledEdge, eds);
      });

      // Re-layout after adding edge (use setTimeout to batch updates)
      setTimeout(() => {
        setNodes((nds) => {
          setEdges((eds) => {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nds, eds);
            setEdges(layoutedEdges);
            return layoutedNodes;
          });
          return nds;
        });
      }, 100);
    });

    // Listen for workflow status
    newSocket.on('workflow-status', ({ status, error }) => {
      console.log('Workflow status:', status, error);
    });

    return () => {
      newSocket.emit('leave-workflow', workflowId);
      newSocket.close();
    };
  }, [workflowId]);

  // Note: Layout is handled in node-created and edge-created handlers
  // This effect is kept for initial layout but should not run on every change
  // to avoid infinite loops

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Scroll to node when timeline step is clicked
  const handleStepClick = useCallback((nodeId) => {
    // Find the node and select it
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      // Use ReactFlow's viewport API to center on node
      if (window.focusNodeInFlow) {
        window.focusNodeInFlow(nodeId);
      }
    }
  }, [nodes]);

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header with Progress Timeline */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 font-semibold mb-2"
            >
              ← Back to Dashboard
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              Workflow: {workflowId ? `${workflowId.substring(0, 8)}...` : 'Loading...'}
            </h2>
          </div>
        </div>
        <ProgressTimeline nodes={nodes} onStepClick={handleStepClick} />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex relative">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            attributionPosition="bottom-left"
            panOnDrag={[1, 2]} // Left and middle mouse button for panning
            panOnScroll={false}
            zoomOnScroll={true}
            zoomOnPinch={true}
            preventScrolling={false}
            selectionOnDrag={false} // Disable selection drag to allow panning
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { 
                strokeWidth: 2.5, 
                stroke: '#6366f1',
                strokeDasharray: '8,4' // Dotted pattern
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#6366f1',
                width: 18,
                height: 18
              }
            }}
          >
            <Background />
            <Controls />
            <MiniMap />
            <KeyboardControls onNodeFocus={handleStepClick} />
          </ReactFlow>
        </div>

        {selectedNode && (
          <NodeDetailsPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* Keyboard Controls Help */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg p-3 shadow-lg text-xs z-10">
        <div className="font-semibold mb-1">Keyboard Controls:</div>
        <div className="space-y-1 text-gray-600">
          <div>← → or A D - Pan left/right</div>
          <div>↑ ↓ or W S - Pan up/down</div>
          <div>Mouse wheel - Zoom in/out</div>
          <div>Space + Drag - Pan (if mouse not working)</div>
        </div>
      </div>
    </div>
  );
}

