import { Handle, Position } from 'reactflow';
import StatusBadge from '../StatusBadge';

export default function CodeRabbitNode({ data = {} }) {
  return (
    <div className="relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-purple-500 min-w-[280px] w-80">
      {/* Step Number Badge */}
      {data.stepNumber && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
          {data.stepNumber}
        </div>
      )}

      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500" />
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">CodeRabbit Review</h3>
            <StatusBadge status={data.status || 'pending'} />
          </div>
          
          {data.issues && (
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {data.issues.resolved > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  <span>{data.issues.resolved} resolved</span>
                </div>
              )}
              {data.issues.warnings > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-600">⚠</span>
                  <span>{data.issues.warnings} warnings</span>
                </div>
              )}
              {data.issues.critical > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-red-600">!</span>
                  <span>{data.issues.critical} critical</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500" />
    </div>
  );
}

