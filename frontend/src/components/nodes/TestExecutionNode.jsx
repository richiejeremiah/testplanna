import { Handle, Position } from 'reactflow';
import StatusBadge from '../StatusBadge';

export default function TestExecutionNode({ data = {} }) {
  const status = data.status || 'pending';
  const passed = data.passed || 0;
  const failed = data.failed || 0;
  const total = data.total || 0;
  const coverage = data.coverage || 0;

  // Determine color based on results
  const getStatusColor = () => {
    if (status === 'passed') return 'from-green-500 to-green-600';
    if (status === 'partial') return 'from-yellow-500 to-yellow-600';
    if (status === 'failed') return 'from-red-500 to-red-600';
    return 'from-gray-500 to-gray-600';
  };

  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-green-500 min-w-[280px] w-80">
      {/* Step Number Badge */}
      {data.stepNumber && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
          {data.stepNumber}
        </div>
      )}

      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-green-500" />
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getStatusColor()} flex items-center justify-center text-white font-bold`}>
            {total > 0 ? `${passRate}%` : '?'}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">Test Execution</h3>
            <StatusBadge status={status} />
          </div>
          
          {total > 0 && (
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <span>Passed:</span>
                <span className="font-semibold text-green-600">{passed}/{total}</span>
              </div>
              {failed > 0 && (
                <div className="flex items-center justify-between">
                  <span>Failed:</span>
                  <span className="font-semibold text-red-600">{failed}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Coverage:</span>
                <span className="font-semibold">{coverage.toFixed(1)}%</span>
              </div>
              {data.flakiness !== undefined && (
                <div className="flex items-center justify-between">
                  <span>Stability:</span>
                  <span className={`font-semibold ${data.stability > 0.8 ? 'text-green-600' : data.stability > 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {(data.stability * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500" />
    </div>
  );
}

