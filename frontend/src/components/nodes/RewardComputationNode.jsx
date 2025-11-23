import { Handle, Position } from 'reactflow';
import StatusBadge from '../StatusBadge';

export default function RewardComputationNode({ data = {} }) {
  const combinedReward = data.combinedReward || 0;
  const breakdown = data.breakdown || {};

  return (
    <div className="relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-indigo-500 min-w-[280px] w-80">
      {/* Step Number Badge */}
      {data.stepNumber && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
          {data.stepNumber}
        </div>
      )}

      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-indigo-500" />
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">Reward Signals</h3>
            <StatusBadge status={data.status || 'pending'} />
          </div>
          
          {combinedReward > 0 && (
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Combined:</span>
                <span className={`font-bold ${combinedReward > 0.75 ? 'text-green-600' : combinedReward > 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {(combinedReward * 100).toFixed(1)}%
                </span>
              </div>
              {breakdown.codeQuality !== undefined && (
                <div className="flex items-center justify-between text-gray-600">
                  <span>Code Quality:</span>
                  <span>{(breakdown.codeQuality * 100).toFixed(1)}%</span>
                </div>
              )}
              {breakdown.testExecution !== undefined && (
                <div className="flex items-center justify-between text-gray-600">
                  <span>Test Execution:</span>
                  <span>{(breakdown.testExecution * 100).toFixed(1)}%</span>
                </div>
              )}
              {breakdown.reasoning !== undefined && (
                <div className="flex items-center justify-between text-gray-600">
                  <span>Reasoning:</span>
                  <span>{(breakdown.reasoning * 100).toFixed(1)}%</span>
                </div>
              )}
              {data.highQuality && (
                <div className="mt-1 text-xs font-semibold text-green-600">
                  ⭐ High-quality example
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-500" />
    </div>
  );
}

