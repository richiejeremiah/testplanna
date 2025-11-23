/**
 * WorkflowBroadcaster - Broadcasts workflow events via Socket.IO
 */
export class WorkflowBroadcaster {
  constructor(io) {
    this.io = io;
  }

  /**
   * Broadcast node creation event
   */
  async broadcastNodeCreated(workflowId, nodeData) {
    if (!this.io) return;
    
    this.io.to(`workflow:${workflowId}`).emit('node-created', {
      id: nodeData.type || nodeData.label?.toLowerCase().replace(/\s+/g, '-') || 'node',
      type: nodeData.type,
      data: nodeData,
      position: nodeData.position || { x: 0, y: 0 }
    });
  }

  /**
   * Broadcast node update event
   */
  async broadcastNodeUpdated(workflowId, nodeId, updateData) {
    if (!this.io) return;
    
    this.io.to(`workflow:${workflowId}`).emit('node-updated', {
      id: nodeId,
      data: updateData
    });
  }

  /**
   * Broadcast edge creation event
   */
  async broadcastEdgeCreated(workflowId, source, target, edgeData = {}) {
    if (!this.io) return;
    
    this.io.to(`workflow:${workflowId}`).emit('edge-created', {
      id: `edge-${source}-${target}`,
      source: source,
      target: target,
      ...edgeData
    });
  }

  /**
   * Broadcast workflow status change
   */
  async broadcastWorkflowStatus(workflowId, status, error = null) {
    if (!this.io) return;
    
    this.io.to(`workflow:${workflowId}`).emit('workflow-status', {
      status,
      error
    });
  }
}

