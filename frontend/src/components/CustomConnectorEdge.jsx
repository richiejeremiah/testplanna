import React from 'react';
import { BaseEdge, getSmoothStepPath } from 'reactflow';

/**
 * Custom connector edge with dots at connection points
 * Renders as a horizontal line with circular dots at both ends
 * Colors match the source node's status
 */
export default function CustomConnectorEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}) {
  // Use smooth step path for horizontal pipeline connectors
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0, // Sharp corners for pipeline look
  });

  // Determine connector color based on source node status
  const getConnectorColor = () => {
    const status = data?.sourceStatus || data?.status || 'pending';
    if (status === 'complete') {
      return '#10B981'; // Green
    } else if (['ready', 'pending'].includes(status)) {
      return '#CBD5E0'; // Gray
    } else if (['analyzing', 'generating', 'reviewing', 'creating', 'fetching', 'executing', 'computing'].includes(status)) {
      return '#3B82F6'; // Blue
    }
    return '#CBD5E0'; // Default gray
  };

  const connectorColor = getConnectorColor();
  const isComplete = data?.sourceStatus === 'complete' || data?.status === 'complete';
  const strokeDasharray = isComplete ? '0' : '6 4';

  // Dot radius (8px diameter = 4px radius)
  const dotRadius = 4;

  return (
    <>
      {/* Connection dot at source */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r={dotRadius}
        fill={connectorColor}
        stroke="white"
        strokeWidth="2"
        style={{ filter: `drop-shadow(0 0 1px ${connectorColor})` }}
      />
      
      {/* Connection dot at target */}
      <circle
        cx={targetX}
        cy={targetY}
        r={dotRadius}
        fill={connectorColor}
        stroke="white"
        strokeWidth="2"
        style={{ filter: `drop-shadow(0 0 1px ${connectorColor})` }}
      />
      
      {/* Edge line */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: connectorColor,
          strokeWidth: 2,
          strokeDasharray: strokeDasharray,
        }}
        markerEnd={markerEnd}
      />
    </>
  );
}

