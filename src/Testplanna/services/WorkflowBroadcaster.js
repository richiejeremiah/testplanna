/**
 * WorkflowBroadcaster - Broadcasts workflow updates via WebSocket
 */
export class WorkflowBroadcaster {
  constructor(io) {
    this.io = io;
    // Step number mapping for each node type
    // Updated order: CodeRabbit reviews BEFORE test planning to inform strategy
    this.stepNumbers = {
      'github-push': 1,
      'coderabbit-review': 2,  // Moved before AI planning
      'ai-review': 3,          // Now informed by CodeRabbit
      'test-execution': 5,     // Execute generated tests
      'reward-computation': 6, // Compute reward signals
      'jira-subtask': 7       // Create Jira subtask
    };
  }

  /**
   * Broadcast node creation to all clients watching this workflow
   */
  async broadcastNodeCreated(workflowId, nodeData) {
    const nodeId = `${workflowId}-${nodeData.type}`;
    const stepNumber = this.stepNumbers[nodeData.type] || 0; // Fallback to 0 if type not found
    const node = {
      id: nodeId,
      type: nodeData.type,
      position: this.calculateNodePosition(nodeData.type),
      data: {
        ...nodeData,
        workflowId,
        stepNumber: stepNumber || undefined // Only include if valid
      }
    };

    this.io.to(`workflow:${workflowId}`).emit('node-created', node);
    return node;
  }

  /**
   * Broadcast node update
   */
  async broadcastNodeUpdated(workflowId, nodeType, updates) {
    const nodeId = `${workflowId}-${nodeType}`;
    
    this.io.to(`workflow:${workflowId}`).emit('node-updated', {
      id: nodeId,
      type: nodeType,
      data: updates
    });
  }

  /**
   * Broadcast edge creation with labels
   */
  async broadcastEdgeCreated(workflowId, sourceType, targetType) {
    const sourceId = `${workflowId}-${sourceType}`;
    const targetId = `${workflowId}-${targetType}`;
    
    // Edge labels based on source and target
    const edgeLabels = {
      'github-push->coderabbit-review': { label: 'Code diff →', color: '#3b82f6' },
      'coderabbit-review->ai-review': { label: 'Review insights →', color: '#8b5cf6' },
      'ai-review->test-execution': { label: 'Tests →', color: '#10b981' },
      'test-execution->reward-computation': { label: 'Results →', color: '#f59e0b' },
      'reward-computation->jira-subtask': { label: 'Rewards →', color: '#8b5cf6' },
      'ai-review->jira-subtask': { label: 'Tests generated →', color: '#10b981' }
    };
    
    const edgeKey = `${sourceType}->${targetType}`;
    const edgeConfig = edgeLabels[edgeKey] || { label: '→', color: '#6366f1' };
    
    const edge = {
      id: `edge-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      animated: true,
      style: { 
        stroke: edgeConfig.color, 
        strokeWidth: 3
      },
      label: edgeConfig.label,
      labelStyle: { 
        fill: edgeConfig.color, 
        fontWeight: 600,
        fontSize: 12
      },
      labelBgStyle: { 
        fill: 'white', 
        fillOpacity: 0.8,
        stroke: edgeConfig.color,
        strokeWidth: 1
      },
      markerEnd: {
        type: 'arrowclosed',
        color: edgeConfig.color
      }
    };

    this.io.to(`workflow:${workflowId}`).emit('edge-created', edge);
    return edge;
  }

  /**
   * Broadcast workflow status change
   */
  async broadcastWorkflowStatus(workflowId, status, error = null) {
    this.io.to(`workflow:${workflowId}`).emit('workflow-status', {
      workflowId,
      status,
      error
    });
  }

  /**
   * Calculate node position based on type (for top-to-bottom layout)
   */
  calculateNodePosition(nodeType) {
    const positions = {
      'github-push': { x: 250, y: 50 },
      'coderabbit-review': { x: 250, y: 200 },
      'ai-review': { x: 250, y: 350 },
      'test-execution': { x: 250, y: 500 },
      'reward-computation': { x: 250, y: 650 },
      'jira-subtask': { x: 250, y: 800 }
    };
    
    return positions[nodeType] || { x: 250, y: 50 };
  }
}

