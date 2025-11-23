import { Handle, Position } from 'reactflow';
import StatusBadge from '../StatusBadge';

export default function RewardComputationNode({ data = {} }) {
  const status = data.status || 'pending';
  const combinedReward = data.combinedReward || 0;
  const breakdown = data.breakdown || {};
  const highQuality = data.highQuality || false;

  // Determine color based on reward
  const getRewardColor = () => {
    if (combinedReward >= 0.75) return 'from-green-500 to-green-600';
    if (combinedReward >= 0.5) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const rewardPercentage = Math.round(combinedReward * 100);

  return (
    <div className={`relative px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br ${getRewardColor()} border-2 border-white min-w-[280px] w-96`}>
      {/* Step Number Badge */}
      {data.stepNumber && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
          {data.stepNumber}
        </div>
      )}
      
      <Handle type="target" position={Position.Top} />
      
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <div className="font-bold text-white">Reward Signals</div>
              <div className="text-xs text-white/80">RL Training Data</div>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Combined Reward */}
        {status === 'complete' && (
          <div className="bg-white/20 rounded-lg p-4 border border-white/30">
            <div className="text-center">
              <div className="text-xs text-white/80 mb-1">Combined Reward</div>
              <div className="font-bold text-white text-4xl">{rewardPercentage}%</div>
              <div className="text-xs text-white/80 mt-1">
                {combinedReward.toFixed(3)} / 1.0
              </div>
            </div>

            {/* High Quality Badge */}
            {highQuality && (
              <div className="mt-3 text-center">
                <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                  ⭐ High Quality - Training Ready
                </span>
              </div>
            )}

            {/* Breakdown */}
            {breakdown && Object.keys(breakdown).length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-white/80 font-semibold mb-2">Reward Breakdown:</div>
                {breakdown.codeQuality !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/80">Code Quality</span>
                    <span className="font-bold text-white">
                      {Math.round(breakdown.codeQuality * 100)}%
                    </span>
                  </div>
                )}
                {breakdown.testExecution !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/80">Test Execution</span>
                    <span className="font-bold text-white">
                      {Math.round(breakdown.testExecution * 100)}%
                    </span>
                  </div>
                )}
                {breakdown.reasoning !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/80">Reasoning</span>
                    <span className="font-bold text-white">
                      {Math.round(breakdown.reasoning * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Computing State */}
        {status === 'computing' && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-sm text-white">
              <div className="animate-spin">⚙️</div>
              <span>Computing rewards...</span>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

