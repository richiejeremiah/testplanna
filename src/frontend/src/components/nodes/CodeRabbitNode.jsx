import { Handle, Position } from 'reactflow';
import StatusBadge from '../StatusBadge';

export default function CodeRabbitNode({ data = {} }) {
  return (
    <div className="relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-orange-500 min-w-[280px] w-80">
      {/* Step Number Badge */}
      {data.stepNumber && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
          {data.stepNumber}
        </div>
      )}
      
      <Handle type="target" position={Position.Top} />
      
      <div className="flex items-start gap-3">
        <div className="text-3xl">🔍</div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-gray-900">CodeRabbit Review</div>
            <StatusBadge status={data.status || 'pending'} />
          </div>
          
          {data.status === 'complete' && data.issues && (
            <div className="text-xs space-y-1 mt-2 bg-orange-50 rounded-lg p-2 border border-orange-200">
              <div className="text-green-600 font-semibold">
                ✅ {data.issues.resolved} approved
              </div>
              {data.issues.warnings > 0 && (
                <div className="text-yellow-600">
                  ⚠️ {data.issues.warnings} warnings
                </div>
              )}
              {data.issues.critical > 0 && (
                <div className="text-red-600 font-semibold">
                  🚨 {data.issues.critical} critical
                </div>
              )}
              {data.issues.critical === 0 && data.issues.warnings === 0 && (
                <div className="text-green-600 font-semibold">✨ No issues found</div>
              )}
            </div>
          )}
          
          {data.status === 'reviewing' && (
            <div className="text-xs text-orange-600 mt-2 flex items-center gap-2">
              <div className="animate-spin">⚙️</div>
              <span>Reviewing original PR code quality...</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

