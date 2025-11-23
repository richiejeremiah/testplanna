import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
import TrainingDataNode from './nodes/TrainingDataNode';
import TrainingNode from './nodes/TrainingNode';
import NodeDetailsPanel from './NodeDetailsPanel';
import ProgressTimeline from './ProgressTimeline';
import CustomConnectorEdge from './CustomConnectorEdge';
import dagre from 'dagre';

const nodeTypes = {
  'github-push': GitHubNode,
  'ai-review': AIReviewNode,
  'coderabbit-review': CodeRabbitNode,
  'test-execution': TestExecutionNode,
  'reward-computation': RewardComputationNode,
  'training-data': TrainingDataNode,
  'training': TrainingNode,
  'jira-subtask': JiraNode
};

const edgeTypes = {
  'connector': CustomConnectorEdge,
};

// Auto-layout function - Left to Right flow
const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  // CRITICAL: Force simple horizontal layout - don't use dagre for now
  // Sort nodes by stepNumber to maintain workflow order
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.data?.stepNumber && b.data?.stepNumber) {
      return a.data.stepNumber - b.data.stepNumber;
    }
    // Fallback: maintain original order
    return 0;
  });
  
  // Place nodes horizontally left to right
  sortedNodes.forEach((node, index) => {
    node.position = {
      x: index * 400, // 400px horizontal spacing between nodes
      y: 0 // All nodes on same horizontal line
    };
    node.targetPosition = 'left';
    node.sourcePosition = 'right';
    node.draggable = false;
    // Store layout info
    node.data = {
      ...node.data,
      _layoutLocked: true,
      _layoutDirection: 'LR'
    };
  });
  
  console.log('[Layout] Applied FORCED horizontal layout (left-to-right):', 
    sortedNodes.map(n => ({ id: n.id, x: n.position.x, step: n.data?.stepNumber }))
  );

  // Preserve all edge properties with connector style
  const layoutedEdges = edges.map(edge => {
    // Get source node status for connector color
    const sourceNode = sortedNodes.find(n => n.id === edge.source);
    const sourceStatus = sourceNode?.data?.status || edge.data?.sourceStatus || 'pending';
    
    return {
      ...edge, // Keep all original edge properties
      type: 'connector', // Use custom connector edge
      animated: false, // No animation for pipeline connectors
      data: {
        ...edge.data,
        sourceStatus: sourceStatus, // Pass source status for color
        status: sourceStatus
      },
      style: {
        strokeWidth: 2,
        ...edge.style
      },
      markerEnd: undefined // No arrow for pipeline connectors
    };
  });

  return { nodes: sortedNodes, edges: layoutedEdges };
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
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/board');
    }
  };
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [socket, setSocket] = useState(null);
  const [workflowInfo, setWorkflowInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load existing workflow nodes on mount
  useEffect(() => {
    const loadWorkflowNodes = async () => {
      try {
        const response = await axios.get(`/api/workflows/${workflowId}/nodes`);
        if (response.data.nodes && response.data.nodes.length > 0) {
          // Clear any existing positions to ensure layout is applied
          const nodesWithoutPositions = response.data.nodes.map(node => ({
            ...node,
            position: { x: 0, y: 0 } // Temporary, will be set by layout
          }));
          
          // Layout the nodes with LEFT TO RIGHT direction
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            nodesWithoutPositions,
            response.data.edges || [],
            'LR' // Explicitly set Left to Right
          );
          
          // CRITICAL: Force horizontal layout - dagre sometimes ignores rankdir
          // Sort nodes by their order in the workflow (by stepNumber or by creation order)
          const sortedNodes = [...layoutedNodes].sort((a, b) => {
            // Sort by stepNumber if available, otherwise by node order
            if (a.data?.stepNumber && b.data?.stepNumber) {
              return a.data.stepNumber - b.data.stepNumber;
            }
            // Fallback: maintain original order
            return 0;
          });
          
          // Force horizontal layout: place nodes left to right
          sortedNodes.forEach((node, i) => {
            node.position = {
              x: i * 400, // 400px horizontal spacing
              y: 0 // All nodes on same horizontal line
            };
            node.targetPosition = 'left';
            node.sourcePosition = 'right';
            node.draggable = false;
            // Update in layoutedNodes array
            const nodeIndex = layoutedNodes.findIndex(n => n.id === node.id);
            if (nodeIndex !== -1) {
              layoutedNodes[nodeIndex] = node;
            }
          });
          
          console.log('[WorkflowCanvas] Forced horizontal layout:', layoutedNodes.map(n => ({
            id: n.id,
            x: n.position.x,
            y: n.position.y
          })));
          
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
        }
        if (response.data.workflow) {
          setWorkflowInfo(response.data.workflow);
        }
      } catch (error) {
        console.error('Failed to load workflow nodes:', error);
      } finally {
        setLoading(false);
      }
    };

    if (workflowId) {
      loadWorkflowNodes();
    }
  }, [workflowId]);

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
        // Ensure new node has correct layout settings
        const newNode = {
          ...node,
          targetPosition: 'left',
          sourcePosition: 'right',
          draggable: false,
          position: { x: 0, y: 0 } // Temporary, will be set by layout
        };
        return [...nds, newNode];
      });

      // Re-layout after adding node (use setTimeout to batch updates)
      setTimeout(() => {
        setNodes((nds) => {
          setEdges((eds) => {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nds, eds, 'LR');
            setEdges(layoutedEdges);
            return layoutedNodes;
          });
          return nds;
        });
      }, 100);
    });

    // Listen for node updates
    newSocket.on('node-updated', ({ id, data }) => {
      setNodes((nds) => {
        const updatedNodes = nds.map((node) => {
          if (node.id === id) {
            // CRITICAL: Preserve ALL layout properties when updating data
            // Never allow position to be reset or changed
            return { 
              ...node, 
              data: { ...node.data, ...data },
              // FORCE preserve position - never reset to {x:0, y:0}
              position: node.position && (node.position.x !== 0 || node.position.y !== 0) 
                ? node.position 
                : { x: 0, y: 0 }, // Only use 0,0 if position is truly missing
              // Force horizontal layout connection points
              targetPosition: 'left',
              sourcePosition: 'right',
              draggable: false, // Keep locked
              // Mark as layout-locked
              data: {
                ...node.data,
                ...data,
                _layoutLocked: true,
                _layoutDirection: 'LR'
              }
            };
          }
          // Ensure all nodes maintain layout settings
          return {
            ...node,
            targetPosition: node.targetPosition || 'left',
            sourcePosition: node.sourcePosition || 'right',
            draggable: false
          };
        });
        
        // Re-apply layout if positions are all zeros (indicates layout was lost)
        const needsLayout = updatedNodes.every(n => n.position.x === 0 && n.position.y === 0);
        if (needsLayout && updatedNodes.length > 0) {
          setTimeout(() => {
            setNodes((nds) => {
              setEdges((eds) => {
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nds, eds, 'LR');
                setEdges(layoutedEdges);
                return layoutedNodes;
              });
              return nds;
            });
          }, 50);
        }
        
        // Update edges connected to this node to reflect status changes
        setEdges((eds) => {
          return eds.map((edge) => {
            if (edge.source === id) {
              // Update edge color based on source node status
              return {
                ...edge,
                data: {
                  ...edge.data,
                  sourceStatus: data.status || edge.data?.sourceStatus,
                  status: data.status || edge.data?.status
                }
              };
            }
            return edge;
          });
        });
        
        return updatedNodes;
      });
    });

    // Listen for edge creation
    newSocket.on('edge-created', (edge) => {
      // Get source node status for connector color
      setNodes((nds) => {
        const sourceNode = nds.find(n => n.id === edge.source);
        const sourceStatus = sourceNode?.data?.status || 'pending';
        
      const styledEdge = {
        ...edge,
        id: edge.id || `edge-${edge.source}-${edge.target}`,
          type: 'connector', // Use custom connector edge
          animated: false,
          data: {
            ...edge.data,
            sourceStatus: sourceStatus,
            status: sourceStatus
          },
        style: {
            strokeWidth: 2,
          ...edge.style
        },
          markerEnd: undefined // No arrow for pipeline connectors
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
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nds, eds, 'LR');
            setEdges(layoutedEdges);
            return layoutedNodes;
          });
          return nds;
        });
      }, 100);
        
        return nds;
      });
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

  // CRITICAL: Enforce left-to-right layout whenever nodes change
  // This prevents the layout from reverting to top-to-bottom
  useEffect(() => {
    if (nodes.length === 0) return;
    
    // Check if layout is broken (all positions at 0,0 or arranged vertically)
    const allAtZero = nodes.every(n => n.position.x === 0 && n.position.y === 0);
    const isVertical = nodes.length > 1 && nodes.every((n, i) => {
      if (i === 0) return true;
      const prev = nodes[i - 1];
      // If y is increasing more than x, it's vertical (WRONG)
      return Math.abs(n.position.y - prev.position.y) > Math.abs(n.position.x - prev.position.x);
    });
    
    // If layout is broken, re-apply it
    if (allAtZero || isVertical) {
      console.log('[WorkflowCanvas] Layout broken, re-applying left-to-right layout');
      setNodes((nds) => {
        setEdges((eds) => {
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nds, eds, 'LR');
          setEdges(layoutedEdges);
          return layoutedNodes;
        });
        return nds;
      });
    } else {
      // Even if not broken, ensure all nodes have correct connection points
      setNodes((nds) => {
        return nds.map(node => ({
          ...node,
          targetPosition: 'left',
          sourcePosition: 'right',
          draggable: false
        }));
      });
    }
  }, [nodes.length]); // Only check when node count changes, not on every render

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
              onClick={handleBack}
              className="text-blue-600 hover:text-blue-800 font-semibold mb-2"
            >
              ← Back to Board
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              {workflowInfo?.jiraTicketKey ? (
                `Workflow ${workflowInfo.jiraTicketKey.match(/-(\d+)$/)?.[1] || workflowInfo.jiraTicketKey}`
              ) : workflowId ? (
                `Workflow: ${workflowId.substring(0, 8)}...`
              ) : (
                'Loading...'
              )}
            </h2>
          </div>
        </div>
        <ProgressTimeline nodes={nodes} onStepClick={handleStepClick} />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex relative">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading workflow...</p>
            </div>
          </div>
        ) : (
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={(changes) => {
              // CRITICAL: Block ALL position changes to prevent layout from breaking
              const filteredChanges = changes.filter(change => {
                // Block position changes completely
                if (change.type === 'position') {
                  return false;
                }
                // Block drag events that might change positions
                if (change.type === 'select' && change.dragging === true) {
                  return false;
                }
                return true;
              });
              if (filteredChanges.length > 0) {
                onNodesChange(filteredChanges);
              }
            }}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView={false}
            attributionPosition="bottom-left"
            panOnDrag={[1, 2]} // Left and middle mouse button for panning
            panOnScroll={false}
            zoomOnScroll={true}
            zoomOnPinch={true}
            preventScrolling={false}
            selectionOnDrag={false} // Disable selection drag to allow panning
            nodesDraggable={false} // CRITICAL: Disable node dragging completely
            nodesConnectable={false} // Disable manual connections
            elementsSelectable={true} // Allow selection for details panel
            defaultEdgeOptions={{
              type: 'connector',
              animated: false,
              style: { 
                strokeWidth: 2
              }
            }}
          >
            <Background />
            <Controls />
            <MiniMap />
            <KeyboardControls onNodeFocus={handleStepClick} />
          </ReactFlow>
        </div>
        )}

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

