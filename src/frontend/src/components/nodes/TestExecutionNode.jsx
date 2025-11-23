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
    <div className={`relative px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br ${getStatusColor()} border-2 border-white min-w-[280px] w-96`}>
      {/* Step Number Badge */}
      {data.stepNumber && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
          {data.stepNumber}
        </div>
      )}
      
      <Handle type="target" position={Position.Top} />
      
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="font-bold text-white">Test Execution</div>
              <div className="text-xs text-white/80">
                {data.simulated ? 'Simulated' : 'Real Execution'}
              </div>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Results Stats */}
        {status !== 'pending' && (
          <div className="bg-white/20 rounded-lg p-3 border border-white/30">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <div className="font-bold text-white text-lg">{passed}</div>
                <div className="text-xs text-white/80">Passed</div>
              </div>
              <div>
                <div className="font-bold text-white text-lg">{failed}</div>
                <div className="text-xs text-white/80">Failed</div>
              </div>
              <div>
                <div className="font-bold text-white text-lg">{total}</div>
                <div className="text-xs text-white/80">Total</div>
              </div>
            </div>
            {coverage > 0 && (
              <div className="mt-2 text-center">
                <div className="text-xs text-white/80">Coverage</div>
                <div className="font-bold text-white text-lg">{coverage}%</div>
              </div>
            )}
            {total > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-white/80 mb-1">
                  <span>Pass Rate</span>
                  <span>{passRate}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all"
                    style={{ width: `${passRate}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {status === 'executing' && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-sm text-white">
              <div className="animate-spin">⚙️</div>
              <span>Executing tests...</span>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

