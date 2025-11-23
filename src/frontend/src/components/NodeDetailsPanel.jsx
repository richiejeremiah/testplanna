// Helper function to parse reasoning into steps
function parseReasoningSteps(reasoning) {
  if (!reasoning) return [];
  
  // Split by common patterns: numbered lists, bullet points, or paragraphs
  return reasoning
    .split(/\n\n|\d+\.|•|\n(?=[A-Z])/)
    .filter(s => s.trim().length > 20) // Filter out very short segments
    .map(s => s.trim())
    .slice(0, 10); // Limit to 10 steps
}

export default function NodeDetailsPanel({ node, onClose }) {
  if (!node || !node.data) {
    return null;
  }

  const renderDetails = () => {
    if (!node.type) return null;
    
    switch (node.type) {
      case 'github-push':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>📦</span>
                <span>PR Information</span>
              </h4>
              <div className="space-y-2 text-sm">
                {node.data.prNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">PR Number:</span>
                    <span className="font-semibold">#{node.data.prNumber}</span>
                  </div>
                )}
                {node.data.branch && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Branch:</span>
                    <span className="font-semibold">{node.data.branch}</span>
                  </div>
                )}
                {node.data.commitSha && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Commit:</span>
                    <span className="font-mono text-xs">
                      {typeof node.data.commitSha === 'string' ? node.data.commitSha.substring(0, 8) : node.data.commitSha}
                    </span>
                  </div>
                )}
                {node.data.filesChanged && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Files Changed:</span>
                    <span className="font-semibold">{node.data.filesChanged}</span>
                  </div>
                )}
                {node.data.prUrl && (
                  <a
                    href={node.data.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-3 text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Open PR in GitHub →
                  </a>
                )}
              </div>
            </div>
          </div>
        );

      case 'ai-review':
        const reasoningSteps = node.data.reasoning ? parseReasoningSteps(node.data.reasoning) : [];
        
        return (
          <div className="space-y-4">
            {/* Test Plan Visualization */}
            {(node.data.plan || node.data.unitTests || node.data.integrationTests || node.data.edgeCases) && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-300 shadow-lg">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                  <span>📊</span>
                  <span>Test Coverage Plan</span>
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔵</span>
                      <span className="text-base font-semibold text-gray-700">Unit Tests</span>
                    </div>
                    <span className="font-bold text-blue-600 text-3xl">
                      {node.data.plan?.unitTests || node.data.unitTests || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border-2 border-purple-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🟣</span>
                      <span className="text-base font-semibold text-gray-700">Integration Tests</span>
                    </div>
                    <span className="font-bold text-purple-600 text-3xl">
                      {node.data.plan?.integrationTests || node.data.integrationTests || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-300 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🟢</span>
                      <span className="text-base font-semibold text-gray-700">Edge Cases</span>
                    </div>
                    <span className="font-bold text-green-600 text-3xl">
                      {node.data.plan?.edgeCases || node.data.edgeCases || 0}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-purple-300">
                  <div className="text-center">
                    <span className="text-sm text-gray-600">Total Tests Planned: </span>
                    <span className="font-bold text-purple-700 text-lg">
                      {(node.data.plan?.unitTests || node.data.unitTests || 0) + 
                       (node.data.plan?.integrationTests || node.data.integrationTests || 0) + 
                       (node.data.plan?.edgeCases || node.data.edgeCases || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Reasoning Flow - Structured Steps */}
            {node.data.reasoningFlow && Array.isArray(node.data.reasoningFlow) && node.data.reasoningFlow.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>🔄</span>
                  <span>Reasoning Flow</span>
                </h4>
                <div className="space-y-3">
                  {node.data.reasoningFlow.map((flowStep, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 border-l-4 border-purple-500 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
                          {flowStep.step || i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                              {flowStep.type || 'analysis'}
                            </span>
                            {flowStep.impact && (
                              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                flowStep.impact === 'high' ? 'bg-red-100 text-red-700' :
                                flowStep.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {flowStep.impact}
                              </span>
                            )}
                          </div>
                          {flowStep.decision && (
                            <div className="mb-2">
                              <p className="text-sm font-semibold text-gray-800">
                                Decision: {flowStep.decision}
                              </p>
                            </div>
                          )}
                          {flowStep.findings && Array.isArray(flowStep.findings) && flowStep.findings.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-gray-600 mb-1">Findings:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {flowStep.findings.map((finding, j) => (
                                  <li key={j} className="text-xs text-gray-700">{finding}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      {i < node.data.reasoningFlow.length - 1 && (
                        <div className="flex justify-center mt-3">
                          <div className="w-0.5 h-4 bg-purple-300"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Reasoning Section - Enhanced (Fallback to text) */}
            {node.data.reasoning && (!node.data.reasoningFlow || !Array.isArray(node.data.reasoningFlow) || node.data.reasoningFlow.length === 0) && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>🧠</span>
                  <span>AI Reasoning Process</span>
                </h4>
                
                {reasoningSteps.length > 0 ? (
                  <div className="space-y-3">
                    {reasoningSteps.map((step, i) => (
                      <div key={i} className="bg-white rounded-lg p-4 border-l-4 border-purple-500 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {step}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {node.data.reasoning}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Statistics */}
            {node.data.testCount && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">Statistics</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Tests Generated:</span>
                    <span className="font-bold text-purple-600 ml-2">{node.data.testCount}</span>
                  </div>
                  {node.data.language && (
                    <div>
                      <span className="text-gray-600">Language:</span>
                      <span className="font-semibold ml-2">{node.data.language}</span>
                    </div>
                  )}
                  {node.data.framework && (
                    <div>
                      <span className="text-gray-600">Framework:</span>
                      <span className="font-semibold ml-2">{node.data.framework}</span>
                    </div>
                  )}
                  {node.data.linesOfCode && (
                    <div>
                      <span className="text-gray-600">Lines of Code:</span>
                      <span className="font-semibold ml-2">{node.data.linesOfCode}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Generated Code Preview */}
            {node.data.generatedCode && (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <span>💻</span>
                    <span>Generated Test Code</span>
                  </h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(node.data.generatedCode);
                      alert('Code copied to clipboard!');
                    }}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    📋 Copy
                  </button>
                </div>
                <pre className="text-xs text-green-400 overflow-x-auto max-h-96 overflow-y-auto font-mono">
                  <code>{node.data.generatedCode}</code>
                </pre>
              </div>
            )}
          </div>
        );

      case 'coderabbit-review':
        return (
          <div className="space-y-4">
            {node.data.issues && (
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>🔍</span>
                  <span>Review Results</span>
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-gray-700">✅ Approved</span>
                    <span className="font-bold text-green-600 text-lg">
                      {node.data.issues.resolved || 0}
                    </span>
                  </div>
                  {node.data.issues.warnings > 0 && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="text-sm font-medium text-gray-700">⚠️ Warnings</span>
                      <span className="font-bold text-yellow-600 text-lg">
                        {node.data.issues.warnings}
                      </span>
                    </div>
                  )}
                  {node.data.issues.critical > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <span className="text-sm font-medium text-gray-700">🚨 Critical</span>
                      <span className="font-bold text-red-600 text-lg">
                        {node.data.issues.critical}
                      </span>
                    </div>
                  )}
                  {node.data.issues.critical === 0 && node.data.issues.warnings === 0 && (
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-green-600 font-semibold">✨ No issues found - Code quality approved!</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {node.data.criticalIssues && node.data.criticalIssues.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h4 className="font-semibold text-red-700 mb-3">🚨 Critical Issues</h4>
                <ul className="text-sm text-gray-700 space-y-2">
                  {node.data.criticalIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-600 font-bold">{i + 1}.</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {node.data.warnings && node.data.warnings.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="font-semibold text-yellow-700 mb-3">⚠️ Warnings</h4>
                <ul className="text-sm text-gray-700 space-y-2">
                  {node.data.warnings.map((warning, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-yellow-600 font-bold">{i + 1}.</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'jira-subtask':
        return (
          <div className="space-y-4">
            {node.data.issueKey && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span>📋</span>
                  <span>Jira Issue Created</span>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Issue Key:</span>
                    <span className="font-bold text-green-700">{node.data.issueKey}</span>
                  </div>
                  {node.data.parentKey && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Parent Ticket:</span>
                      <span className="font-semibold">{node.data.parentKey}</span>
                    </div>
                  )}
                  {node.data.jiraUrl && (
                    <a
                      href={node.data.jiraUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-3 text-center bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Open in Jira →
                    </a>
                  )}
                </div>
              </div>
            )}
            {(node.data.coverage || node.data.testCount) && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">Summary</h4>
                <div className="space-y-2">
                  {node.data.coverage && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-sm font-medium text-gray-700">Test Coverage</span>
                      <span className="font-bold text-blue-600 text-lg">{node.data.coverage}%</span>
                    </div>
                  )}
                  {node.data.testCount && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <span className="text-sm font-medium text-gray-700">Tests Generated</span>
                      <span className="font-bold text-purple-600 text-lg">{node.data.testCount}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(node.data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  const getNodeTitle = () => {
    const titles = {
      'github-push': 'GitHub Push',
      'ai-review': 'AI Review',
      'coderabbit-review': 'CodeRabbit Review',
      'jira-subtask': 'Jira Subtask'
    };
    return node.data.label || titles[node.type] || node.type;
  };

  const getNodeColor = () => {
    const colors = {
      'github-push': 'from-blue-600 to-blue-700',
      'ai-review': 'from-purple-600 to-blue-600',
      'coderabbit-review': 'from-orange-600 to-orange-700',
      'jira-subtask': 'from-green-600 to-green-700'
    };
    return colors[node.type] || 'from-gray-600 to-gray-700';
  };

  return (
    <div className="w-[500px] bg-white border-l-4 border-gray-300 shadow-2xl overflow-y-auto h-full">
      <div className={`sticky top-0 bg-gradient-to-r ${getNodeColor()} text-white p-4 flex items-center justify-between z-10`}>
        <h2 className="text-xl font-bold">{getNodeTitle()}</h2>
        <button
          onClick={onClose}
          className="text-white hover:bg-white/20 rounded p-1 transition-colors text-2xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="p-6">
        {renderDetails()}
      </div>
    </div>
  );
}

