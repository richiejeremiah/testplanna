import { Handle, Position } from 'reactflow';
import StatusBadge from '../StatusBadge';

export default function RewardComputationNode({ data = {} }) {
  // Get combined reward - prioritize combinedReward, then averageReward, default to 0
  const combinedReward = data.combinedReward ?? data.averageReward ?? 0;
  const breakdown = data.breakdown || {};
  
  // Get individual rewards (from breakdown or direct data)
  // Use nullish coalescing to ensure we get 0 if undefined, not a falsy value
  const codeQualityReward = breakdown.codeQuality ?? data.codeQualityReward ?? 0;
  const testExecutionReward = breakdown.testExecution ?? data.testExecutionReward ?? 0;
  const reasoningReward = breakdown.reasoning ?? data.reasoningReward ?? 0;
  
  // Check if we have valid reward data (not all zeros and status is complete)
  const hasValidData = data.status === 'complete' && (
    combinedReward > 0 || 
    codeQualityReward > 0 || 
    testExecutionReward > 0 || 
    reasoningReward > 0
  );
  
  // Calculate grade
  const getGrade = (score) => {
    if (score >= 0.9) return { letter: 'A+', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
    if (score >= 0.85) return { letter: 'A', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
    if (score >= 0.8) return { letter: 'B+', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (score >= 0.75) return { letter: 'B', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (score >= 0.7) return { letter: 'C+', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    if (score >= 0.65) return { letter: 'C', color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    if (score >= 0.6) return { letter: 'D', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    return { letter: 'F', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };
  
  const grade = getGrade(combinedReward);
  
  // Get reward color
  const getRewardColor = (value) => {
    if (value >= 0.8) return 'text-green-600';
    if (value >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="relative px-5 py-4 shadow-md rounded-lg bg-white border-2 border-blue-500 min-w-[360px] w-96">
      {/* Step Number Badge */}
      {data.stepNumber && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
          {data.stepNumber}
        </div>
      )}

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900">Reward Evaluation</h3>
        </div>
        <StatusBadge status={data.status || 'pending'} />
      </div>
      
      {/* Evaluation Aspects */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          The system evaluates three aspects of each workflow
        </p>
        
        <div className="space-y-3">
          {/* Code Quality Reward */}
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">1. Code Quality Reward</span>
                <span className="text-xs text-gray-500">(50% weight)</span>
              </div>
              <span className={`text-sm font-bold ${getRewardColor(codeQualityReward)}`}>
                {(codeQualityReward * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-gray-600">
              <span className="font-medium">Source:</span> CodeRabbit review
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${codeQualityReward >= 0.8 ? 'bg-green-500' : codeQualityReward >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${codeQualityReward * 100}%` }}
              />
            </div>
          </div>
          
          {/* Test Execution Reward */}
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">2. Test Execution Reward</span>
                <span className="text-xs text-gray-500">(40% weight)</span>
              </div>
              <span className={`text-sm font-bold ${getRewardColor(testExecutionReward)}`}>
                {(testExecutionReward * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-gray-600">
              <span className="font-medium">Source:</span> Test execution results
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${testExecutionReward >= 0.8 ? 'bg-green-500' : testExecutionReward >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${testExecutionReward * 100}%` }}
              />
            </div>
          </div>
          
          {/* Reasoning Reward */}
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">3. Reasoning Reward</span>
                <span className="text-xs text-gray-500">(10% weight)</span>
              </div>
              <span className={`text-sm font-bold ${getRewardColor(reasoningReward)}`}>
                {(reasoningReward * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-gray-600">
              <span className="font-medium">Source:</span> Gemini's test planning reasoning
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${reasoningReward >= 0.8 ? 'bg-green-500' : reasoningReward >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${reasoningReward * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Results - Grade - Only show if we have valid data */}
      {hasValidData && combinedReward > 0 ? (
        <div className={`border-2 ${grade.border} rounded-lg p-4 ${grade.bg}`}>
              <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Results</p>
              <p className="text-sm text-gray-700">Combined Reward Score</p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${grade.color} mb-1`}>
                {grade.letter}
              </div>
              <div className={`text-sm font-semibold ${grade.color}`}>
                  {(combinedReward * 100).toFixed(1)}%
              </div>
                </div>
                </div>
          {/* Overall progress bar */}
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${combinedReward >= 0.8 ? 'bg-green-500' : combinedReward >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, combinedReward * 100)}%` }}
            />
                </div>
              {data.highQuality && (
            <div className="mt-2 text-xs font-semibold text-green-700 flex items-center gap-1">
              <span>⭐</span>
              <span>High-quality example (saved for training)</span>
            </div>
          )}
        </div>
      ) : data.status === 'complete' ? (
        <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 text-center">
            Reward calculation in progress...
          </p>
      </div>
      ) : null}

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
    </div>
  );
}

