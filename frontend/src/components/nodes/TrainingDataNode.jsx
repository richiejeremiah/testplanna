import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import StatusBadge from '../StatusBadge';

export default function TrainingDataNode({ data = {} }) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Get training data
  const trainingData = data.trainingData || {};
  const reward = data.reward ?? data.combinedReward ?? 0;
  const highQuality = data.highQuality ?? (reward > 0.75);
  
  // Determine quality level and color
  const getQualityInfo = () => {
    if (reward >= 0.75) {
      return {
        level: 'HIGH',
        icon: '⭐',
        color: 'text-green-700',
        bg: 'bg-green-50',
        border: 'border-green-200',
        badge: 'bg-green-100 text-green-800 border-green-300'
      };
    } else if (reward >= 0.5) {
      return {
        level: 'MEDIUM',
        icon: '⚡',
        color: 'text-yellow-700',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      };
    } else {
      return {
        level: 'LOW',
        icon: '⚠️',
        color: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-800 border-red-300'
      };
    }
  };
  
  const quality = getQualityInfo();
  
  // Get input/output summaries
  const inputSummary = trainingData.input || {};
  const outputSummary = trainingData.output || {};
  const metadata = trainingData.metadata || {};

  return (
    <div className="relative px-5 py-4 shadow-md rounded-lg bg-white border-2 border-orange-500 min-w-[360px] w-96">
      {/* Step Number Badge */}
      {data.stepNumber && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
          {data.stepNumber}
        </div>
      )}

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-orange-500" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Store Training Data</h3>
            <p className="text-xs text-gray-500">Save example for learning</p>
          </div>
        </div>
        <StatusBadge status={data.status || 'pending'} />
      </div>
      
      {/* Main Info Cards */}
      <div className="space-y-3 mb-4">
        {/* Input Card */}
        <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-700">Input:</span>
            <span className="text-xs text-gray-600">Code + context</span>
          </div>
          <div className="text-xs text-gray-500 space-y-0.5">
            {inputSummary.code && (
              <div>• Code: {inputSummary.code.length > 0 ? `${(inputSummary.code.length / 1024).toFixed(1)} KB` : 'Empty'}</div>
            )}
            {inputSummary.jiraContext && (
              <div>• Jira: {inputSummary.jiraContext}</div>
            )}
            {inputSummary.codeRabbitFindings && (
              <div>• CodeRabbit findings: {inputSummary.codeRabbitFindings.issues?.critical || 0} critical</div>
            )}
          </div>
        </div>
        
        {/* Output Card */}
        <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-700">Output:</span>
            <span className="text-xs text-gray-600">Tests + reasoning</span>
          </div>
          <div className="text-xs text-gray-500 space-y-0.5">
            {outputSummary.generatedCode && (
              <div>• Tests: {outputSummary.generatedCode.length > 0 ? `${(outputSummary.generatedCode.length / 1024).toFixed(1)} KB` : 'Empty'}</div>
            )}
            {outputSummary.testPlan && (
              <div>• Plan: {outputSummary.testPlan.unitTests || 0} unit, {outputSummary.testPlan.integrationTests || 0} integration</div>
            )}
            {outputSummary.reasoning && (
              <div>• Reasoning: {outputSummary.reasoning.length > 0 ? `${(outputSummary.reasoning.length / 100).toFixed(0)} chars` : 'Empty'}</div>
            )}
          </div>
        </div>
        
        {/* Reward & Quality Card */}
        <div className={`border-2 ${quality.border} rounded-md p-3 ${quality.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Reward:</div>
              <div className={`text-lg font-bold ${quality.color}`}>
                {reward.toFixed(3)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-700 mb-1">Quality:</div>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${quality.badge}`}>
                {quality.icon} {quality.level}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Collapsible Details Section */}
      <div className="border-t border-gray-200 pt-3">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between text-sm font-semibold text-orange-700 hover:text-orange-900 transition-colors"
        >
          <span>📋 Training Data Details</span>
          <span className="text-xs">{showDetails ? '🔽 Hide' : '▶️ Show'}</span>
        </button>
        
        {showDetails && (
          <div className="mt-3 space-y-3">
            {/* Full Input Details */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-xs font-semibold text-gray-800 mb-2">Full Input Data:</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div><span className="font-medium">Code Length:</span> {inputSummary.code?.length || 0} characters</div>
                <div><span className="font-medium">Jira Context:</span> {inputSummary.jiraContext || 'N/A'}</div>
                {inputSummary.codeRabbitFindings && (
                  <div>
                    <span className="font-medium">CodeRabbit:</span> {inputSummary.codeRabbitFindings.issues?.critical || 0} critical, {inputSummary.codeRabbitFindings.issues?.warnings || 0} warnings
                  </div>
                )}
                {inputSummary.repoStructure && (
                  <div><span className="font-medium">Repo Structure:</span> Available</div>
                )}
              </div>
            </div>
            
            {/* Full Output Details */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-xs font-semibold text-gray-800 mb-2">Full Output Data:</div>
              <div className="text-xs text-gray-600 space-y-1">
                {outputSummary.testPlan && (
                  <div>
                    <span className="font-medium">Test Plan:</span> {outputSummary.testPlan.unitTests || 0} unit, {outputSummary.testPlan.integrationTests || 0} integration, {outputSummary.testPlan.edgeCases || 0} edge cases
                  </div>
                )}
                <div><span className="font-medium">Generated Code:</span> {outputSummary.generatedCode?.length || 0} characters</div>
                <div><span className="font-medium">Reasoning:</span> {outputSummary.reasoning?.length || 0} characters</div>
              </div>
            </div>
            
            {/* Metadata */}
            {metadata && (
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs font-semibold text-gray-800 mb-2">Metadata:</div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><span className="font-medium">Language:</span> {metadata.language || 'N/A'}</div>
                  <div><span className="font-medium">Framework:</span> {metadata.framework || 'N/A'}</div>
                  <div><span className="font-medium">Workflow ID:</span> {metadata.workflowId || 'N/A'}</div>
                  {metadata.timestamp && (
                    <div><span className="font-medium">Timestamp:</span> {new Date(metadata.timestamp).toLocaleString()}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-orange-500" />
    </div>
  );
}

