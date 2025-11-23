import StatusBadge from './StatusBadge';

export default function NodeDetailsPanel({ node, onClose }) {
  if (!node) return null;

  // Get node type display name
  const getNodeTypeName = (type) => {
    const typeNames = {
      'github-push': 'GitHub Code Fetch',
      'coderabbit-review': 'Code Quality Review',
      'ai-review': 'AI Test Planning',
      'test-execution': 'Test Execution',
      'reward-computation': 'Quality Evaluation',
      'training-data': 'Store Training Data',
      'training': 'Model Training',
      'jira-subtask': 'Jira Integration'
    };
    return typeNames[type] || type;
  };

  // Get node description
  const getNodeDescription = (type) => {
    const descriptions = {
      'github-push': 'Fetches code changes from GitHub to analyze what needs testing.',
      'coderabbit-review': 'Automatically reviews code for security issues, bugs, and quality problems.',
      'ai-review': 'AI analyzes the code and creates a strategic test plan.',
      'test-execution': 'Runs the generated tests and reports results.',
      'reward-computation': 'Evaluates the quality of tests and code using multiple metrics.',
      'training-data': 'Saves workflow example with input, output, and reward for model learning.',
      'training': 'Improves AI models based on high-quality examples.',
      'jira-subtask': 'Creates and updates Jira tickets with test results.'
    };
    return descriptions[type] || 'Workflow step';
  };

  // Format data based on node type
  const renderNodeData = () => {
    const { data, type } = node;

    switch (type) {
      case 'github-push':
        return (
          <div className="space-y-4">
            <InfoCard
              title="Pull Request Information"
              icon="🔗"
            >
              {data.prUrl ? (
                <a
                  href={data.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                >
                  {data.prUrl}
                </a>
              ) : (
                <span className="text-gray-500">No PR URL available</span>
              )}
            </InfoCard>

            <InfoCard title="Repository Details" icon="📦">
              <div className="space-y-2">
                {data.branch && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Branch:</span>
                    <span className="font-medium text-gray-900">{data.branch}</span>
                  </div>
                )}
                {data.prNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">PR Number:</span>
                    <span className="font-medium text-gray-900">#{data.prNumber}</span>
                  </div>
                )}
                {data.filesChanged !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Files Changed:</span>
                    <span className="font-medium text-gray-900">{data.filesChanged}</span>
                  </div>
                )}
              </div>
            </InfoCard>
          </div>
        );

      case 'coderabbit-review':
        return (
          <div className="space-y-4">
            <InfoCard title="Review Status" icon="🔍">
              <div className="space-y-2">
                {data.issues && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Critical Issues:</span>
                      <span className="font-semibold text-red-600">{data.issues.critical || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Warnings:</span>
                      <span className="font-semibold text-yellow-600">{data.issues.warnings || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Resolved:</span>
                      <span className="font-semibold text-green-600">{data.issues.resolved || 0}</span>
                    </div>
                  </>
                )}
                {data.message && (
                  <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-gray-700">
                    {data.message}
                  </div>
                )}
              </div>
            </InfoCard>
          </div>
        );

      case 'ai-review':
        return (
          <div className="space-y-4">
            <InfoCard title="AI Model" icon="🤖">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Provider:</span>
                <span className="font-medium text-gray-900">{data.provider || 'Gemini + MiniMax'}</span>
              </div>
            </InfoCard>

            {data.plan && (
              <InfoCard title="Test Plan" icon="📋">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Unit Tests:</span>
                    <span className="font-semibold text-gray-900">{data.plan.unitTests || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Integration Tests:</span>
                    <span className="font-semibold text-gray-900">{data.plan.integrationTests || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Edge Cases:</span>
                    <span className="font-semibold text-gray-900">{data.plan.edgeCases || 0}</span>
                  </div>
                </div>
              </InfoCard>
            )}

            {data.reasoning && (
              <InfoCard title="AI Reasoning" icon="💭">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {data.reasoning.length > 200 
                    ? `${data.reasoning.substring(0, 200)}...` 
                    : data.reasoning}
                </p>
              </InfoCard>
            )}
          </div>
        );

      case 'test-execution':
        return (
          <div className="space-y-4">
            <InfoCard title="Test Results" icon="✅">
              <div className="space-y-2">
                {data.total !== undefined && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Tests:</span>
                      <span className="font-semibold text-gray-900">{data.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Passed:</span>
                      <span className="font-semibold text-green-600">{data.passed || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Failed:</span>
                      <span className="font-semibold text-red-600">{data.failed || 0}</span>
                    </div>
                    {data.coverage !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Coverage:</span>
                        <span className="font-semibold text-blue-600">{data.coverage}%</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </InfoCard>
          </div>
        );

      case 'reward-computation':
        return (
          <div className="space-y-4">
            {data.breakdown && (
              <InfoCard title="Quality Scores" icon="⭐">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Code Quality (50%)</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(data.breakdown.codeQuality * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${data.breakdown.codeQuality * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Test Execution (40%)</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(data.breakdown.testExecution * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${data.breakdown.testExecution * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Reasoning (10%)</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(data.breakdown.reasoning * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${data.breakdown.reasoning * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </InfoCard>
            )}
            {data.combinedReward !== undefined && (
              <InfoCard title="Overall Score" icon="📊">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {(data.combinedReward * 100).toFixed(1)}%
                  </div>
                  {data.highQuality && (
                    <div className="text-sm text-green-600 font-semibold">
                      ⭐ High-quality example
                    </div>
                  )}
                </div>
              </InfoCard>
            )}
          </div>
        );

      case 'training-data':
        const trainingData = data.trainingData || {};
        const reward = data.reward ?? data.combinedReward ?? 0;
        const highQuality = data.highQuality ?? (reward > 0.75);
        
        const getQualityInfo = () => {
          if (reward >= 0.75) {
            return { level: 'HIGH', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
          } else if (reward >= 0.5) {
            return { level: 'MEDIUM', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' };
          } else {
            return { level: 'LOW', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
          }
        };
        const quality = getQualityInfo();
        
        return (
          <div className="space-y-4">
            <InfoCard title="Training Data Summary" icon="💾">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Reward:</span>
                  <span className="text-lg font-bold text-gray-900">{reward.toFixed(3)}</span>
                </div>
                <div className={`border-2 ${quality.border} rounded-md p-3 ${quality.bg}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Quality:</span>
                    <span className={`text-sm font-bold ${quality.color}`}>
                      {quality.level === 'HIGH' ? '⭐ HIGH' : quality.level === 'MEDIUM' ? '⚡ MEDIUM' : '⚠️ LOW'}
                    </span>
                  </div>
                </div>
              </div>
            </InfoCard>

            {trainingData.input && (
              <InfoCard title="Input Data" icon="📥">
                <div className="space-y-2 text-sm">
                  {trainingData.input.code && (
                    <div>
                      <span className="font-medium text-gray-700">Code:</span>
                      <span className="text-gray-600 ml-2">
                        {trainingData.input.code.length > 0 
                          ? `${(trainingData.input.code.length / 1024).toFixed(1)} KB` 
                          : 'Empty'}
                      </span>
                    </div>
                  )}
                  {trainingData.input.jiraContext && (
                    <div>
                      <span className="font-medium text-gray-700">Jira Context:</span>
                      <span className="text-gray-600 ml-2">{trainingData.input.jiraContext}</span>
                    </div>
                  )}
                  {trainingData.input.codeRabbitFindings && (
                    <div>
                      <span className="font-medium text-gray-700">CodeRabbit Findings:</span>
                      <span className="text-gray-600 ml-2">
                        {trainingData.input.codeRabbitFindings.issues?.critical || 0} critical,{' '}
                        {trainingData.input.codeRabbitFindings.issues?.warnings || 0} warnings
                      </span>
                    </div>
                  )}
                  {trainingData.input.repoStructure && (
                    <div>
                      <span className="font-medium text-gray-700">Repo Structure:</span>
                      <span className="text-gray-600 ml-2">Available</span>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {trainingData.output && (
              <InfoCard title="Output Data" icon="📤">
                <div className="space-y-2 text-sm">
                  {trainingData.output.testPlan && (
                    <div>
                      <span className="font-medium text-gray-700">Test Plan:</span>
                      <span className="text-gray-600 ml-2">
                        {trainingData.output.testPlan.unitTests || 0} unit,{' '}
                        {trainingData.output.testPlan.integrationTests || 0} integration,{' '}
                        {trainingData.output.testPlan.edgeCases || 0} edge cases
                      </span>
                    </div>
                  )}
                  {trainingData.output.generatedCode && (
                    <div>
                      <span className="font-medium text-gray-700">Generated Tests:</span>
                      <span className="text-gray-600 ml-2">
                        {trainingData.output.generatedCode.length > 0 
                          ? `${(trainingData.output.generatedCode.length / 1024).toFixed(1)} KB` 
                          : 'Empty'}
                      </span>
                    </div>
                  )}
                  {trainingData.output.reasoning && (
                    <div>
                      <span className="font-medium text-gray-700">Reasoning:</span>
                      <span className="text-gray-600 ml-2">
                        {trainingData.output.reasoning.length > 0 
                          ? `${(trainingData.output.reasoning.length / 100).toFixed(0)} chars` 
                          : 'Empty'}
                      </span>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}

            {trainingData.metadata && (
              <InfoCard title="Metadata" icon="📋">
                <div className="space-y-2 text-sm">
                  {trainingData.metadata.language && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Language:</span>
                      <span className="font-medium text-gray-900">{trainingData.metadata.language}</span>
                    </div>
                  )}
                  {trainingData.metadata.framework && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Framework:</span>
                      <span className="font-medium text-gray-900">{trainingData.metadata.framework}</span>
                    </div>
                  )}
                  {trainingData.metadata.workflowId && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Workflow ID:</span>
                      <span className="font-medium text-gray-900 text-xs">{trainingData.metadata.workflowId}</span>
                    </div>
                  )}
                  {trainingData.metadata.timestamp && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Timestamp:</span>
                      <span className="font-medium text-gray-900 text-xs">
                        {new Date(trainingData.metadata.timestamp).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}
          </div>
        );

      case 'jira-subtask':
        return (
          <div className="space-y-4">
            {data.issueKey && (
              <InfoCard title="Jira Ticket" icon="🎫">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Ticket Key:</span>
                    <span className="font-semibold text-gray-900">{data.issueKey}</span>
                  </div>
                  {data.issueUrl && (
                    <a
                      href={data.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                    >
                      View in Jira →
                    </a>
                  )}
                  {data.coverage !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Test Coverage:</span>
                      <span className="font-semibold text-blue-600">{data.coverage}%</span>
                    </div>
                  )}
                </div>
              </InfoCard>
            )}
          </div>
        );

      default:
        // Fallback for unknown types - show formatted data
        return (
          <div className="space-y-4">
            <InfoCard title="Details" icon="ℹ️">
              <pre className="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </InfoCard>
          </div>
        );
    }
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 shadow-xl overflow-y-auto h-full">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Step Details</h3>
          <p className="text-xs text-gray-500 mt-0.5">{getNodeTypeName(node.type)}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close panel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Status Section */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
              <StatusBadge status={node.data?.status || 'pending'} />
            </div>
            {node.data?.stepNumber && (
              <div className="text-right">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Step</p>
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {node.data.stepNumber}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-gray-700 leading-relaxed">
            {getNodeDescription(node.type)}
          </p>
        </div>

        {/* Node-specific data */}
        {renderNodeData()}

        {/* Technical Details (Collapsible) */}
        <details className="border border-gray-200 rounded-lg">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
            Technical Details
          </summary>
          <div className="px-4 pb-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Node ID:</span>
              <code className="text-gray-700 font-mono">{node.id}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Type:</span>
              <code className="text-gray-700 font-mono">{node.type}</code>
            </div>
            {node.position && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Position:</span>
                <span className="text-gray-700">
                  X: {Math.round(node.position.x)}, Y: {Math.round(node.position.y)}
                </span>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

// Reusable Info Card Component
function InfoCard({ title, icon, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>
      <div className="text-sm">
        {children}
      </div>
    </div>
  );
}
