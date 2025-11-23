import { useState, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import StatusBadge from '../StatusBadge';

// Parse test code to extract individual tests - REAL PARSING
function parseTestCode(code, language = 'javascript') {
  if (!code || typeof code !== 'string' || code.length < 50) {
    return { unitTests: [], integrationTests: [], edgeCases: [] };
  }

  const tests = {
    unitTests: [],
    integrationTests: [],
    edgeCases: []
  };

  if (language === 'javascript') {
    let testIndex = 0;
    
    // More robust regex to match test/it blocks
    // Matches: it('test name', () => { ... }) or test('test name', () => { ... })
    const testPatterns = [
      // Standard format: it('name', () => { ... })
      /(?:it|test)\s*\(['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([\s\S]*?)(?=\n\s*(?:it|test|describe|})\s*\(|$)/g,
      // Alternative: it('name', function() { ... })
      /(?:it|test)\s*\(['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?function\s*\([^)]*\)\s*\{([\s\S]*?)(?=\n\s*(?:it|test|describe|})\s*\(|$)/g
    ];

    for (const pattern of testPatterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const testName = match[1];
        const testBody = match[2] || '';
        
        // Find the full test block (including nested braces)
        const startIndex = match.index;
        let braceCount = 0;
        let inString = false;
        let stringChar = null;
        let endIndex = startIndex;
        
        for (let i = startIndex; i < code.length; i++) {
          const char = code[i];
          const prevChar = i > 0 ? code[i - 1] : '';
          
          // Handle string literals
          if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
            if (!inString) {
              inString = true;
              stringChar = char;
            } else if (char === stringChar) {
              inString = false;
              stringChar = null;
            }
          }
          
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                endIndex = i + 1;
                break;
              }
            }
          }
        }
        
        const fullTestCode = code.substring(startIndex, endIndex);
        
        // Categorize based on test name and content
        const lowerName = testName.toLowerCase();
        const lowerBody = testBody.toLowerCase();
        
        let category = 'unitTests'; // Default
        if (lowerName.includes('integration') || lowerName.includes('component') || 
            lowerName.includes('api') || lowerName.includes('endpoint') ||
            lowerName.includes('interaction') || lowerName.includes('workflow')) {
          category = 'integrationTests';
        } else if (lowerName.includes('edge') || lowerName.includes('boundary') || 
                   lowerName.includes('error') || lowerName.includes('exception') ||
                   lowerName.includes('empty') || lowerName.includes('null') || 
                   lowerName.includes('undefined') || lowerName.includes('invalid') ||
                   lowerName.includes('should throw') || lowerName.includes('should handle') ||
                   lowerBody.includes('edge') || lowerBody.includes('boundary') || 
                   lowerBody.includes('error') || lowerBody.includes('throw')) {
          category = 'edgeCases';
        }
        
        tests[category].push({
          id: testIndex++,
          name: testName,
          code: fullTestCode,
          fullCode: fullTestCode,
          category
        });
      }
    }
  }

  return tests;
}

export default function AIReviewNode({ data = {} }) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  // Parse actual generated test code
  const parsedTests = useMemo(() => {
    if (data.generatedCode && typeof data.generatedCode === 'string' && data.generatedCode.length > 50) {
      return parseTestCode(data.generatedCode, data.language || 'javascript');
    }
    return { unitTests: [], integrationTests: [], edgeCases: [] };
  }, [data.generatedCode, data.language]);

  return (
    <div className="relative px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-500 min-w-[280px] w-96">
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
            <span className="text-2xl">🤖</span>
            <div>
              <div className="font-bold text-gray-900">AI Review</div>
              <div className="text-xs text-gray-600">
                {data.provider || 'Gemini + MiniMax'}
              </div>
            </div>
          </div>
          <StatusBadge status={data.status || 'pending'} />
        </div>

        {/* Summary Stats */}
        {data.status === 'complete' && (
          <div className="bg-white rounded-lg p-3 border border-purple-200">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <div className="font-bold text-blue-600">{data.unitTests || 0}</div>
                <div className="text-xs text-gray-500">Unit Tests</div>
              </div>
              <div>
                <div className="font-bold text-purple-600">{data.integrationTests || 0}</div>
                <div className="text-xs text-gray-500">Integration</div>
              </div>
              <div>
                <div className="font-bold text-green-600">{data.edgeCases || 0}</div>
                <div className="text-xs text-gray-500">Edge Cases</div>
              </div>
            </div>
            {data.testCount && (
              <div className="mt-2 text-center text-xs text-gray-600">
                <span className="font-semibold text-purple-600">{data.testCount}</span> tests generated
                {data.language && (
                  <span className="text-gray-500"> • {data.language} • {data.framework}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Test Plan Visual Breakdown Toggle */}
        {data.status === 'complete' && (data.plan || data.unitTests || data.integrationTests || data.edgeCases) && (
          <div className="border-t border-purple-200 pt-3">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="w-full flex items-center justify-between text-sm font-semibold text-purple-700 hover:text-purple-900 transition-colors"
            >
              <span>🧠 Test Plan Breakdown</span>
              <span className="text-xs">{showReasoning ? '🔽 Hide' : '▶️ Show'}</span>
            </button>
            {showReasoning && (
              <div className="mt-3 space-y-4">
                {/* Visual Node Representation - Color Coded Paths */}
                <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                  <div className="text-xs font-semibold text-purple-800 mb-3">Visual Test Plan (Color-Coded Paths):</div>
                  
                  {/* Unit Tests Path - Blue - REAL TESTS */}
                  {parsedTests.unitTests.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <div className="font-bold text-blue-700 text-sm">
                          Unit Tests Path ({parsedTests.unitTests.length} {parsedTests.unitTests.length === 1 ? 'test' : 'tests'})
                          {data.unitTests && parsedTests.unitTests.length < data.unitTests && (
                            <span className="text-xs text-gray-500 ml-2">(Planned: {data.unitTests})</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-6">
                        {parsedTests.unitTests.map((test, i) => (
                          <div 
                            key={test.id} 
                            onClick={() => setSelectedTest(test)}
                            className="bg-blue-100 border-2 border-blue-400 rounded-lg px-3 py-2 hover:bg-blue-200 hover:shadow-sm transition-all cursor-pointer min-w-[100px] text-center"
                            title={test.name}
                          >
                            <div className="text-xs font-bold text-blue-700">UT{i + 1}</div>
                            <div className="text-[10px] text-blue-600 truncate max-w-[90px]">{test.name.substring(0, 20)}{test.name.length > 20 ? '...' : ''}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Integration Tests Path - Purple - REAL TESTS */}
                  {parsedTests.integrationTests.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                        <div className="font-bold text-purple-700 text-sm">
                          Integration Tests Path ({parsedTests.integrationTests.length} {parsedTests.integrationTests.length === 1 ? 'test' : 'tests'})
                          {data.integrationTests && parsedTests.integrationTests.length < data.integrationTests && (
                            <span className="text-xs text-gray-500 ml-2">(Planned: {data.integrationTests})</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-6">
                        {parsedTests.integrationTests.map((test, i) => (
                          <div 
                            key={test.id} 
                            onClick={() => setSelectedTest(test)}
                            className="bg-purple-100 border-2 border-purple-400 rounded-lg px-3 py-2 hover:bg-purple-200 hover:shadow-sm transition-all cursor-pointer min-w-[100px] text-center"
                            title={test.name}
                          >
                            <div className="text-xs font-bold text-purple-700">IT{i + 1}</div>
                            <div className="text-[10px] text-purple-600 truncate max-w-[90px]">{test.name.substring(0, 20)}{test.name.length > 20 ? '...' : ''}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edge Cases Path - Green - REAL TESTS */}
                  {parsedTests.edgeCases.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <div className="font-bold text-green-700 text-sm">
                          Edge Cases Path ({parsedTests.edgeCases.length} {parsedTests.edgeCases.length === 1 ? 'test' : 'tests'})
                          {data.edgeCases && parsedTests.edgeCases.length < data.edgeCases && (
                            <span className="text-xs text-gray-500 ml-2">(Planned: {data.edgeCases})</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-6">
                        {parsedTests.edgeCases.map((test, i) => (
                          <div 
                            key={test.id} 
                            onClick={() => setSelectedTest(test)}
                            className="bg-green-100 border-2 border-green-400 rounded-lg px-3 py-2 hover:bg-green-200 hover:shadow-sm transition-all cursor-pointer min-w-[100px] text-center"
                            title={test.name}
                          >
                            <div className="text-xs font-bold text-green-700">EC{i + 1}</div>
                            <div className="text-[10px] text-green-600 truncate max-w-[90px]">{test.name.substring(0, 20)}{test.name.length > 20 ? '...' : ''}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show planned vs actual if different */}
                  {parsedTests.unitTests.length === 0 && parsedTests.integrationTests.length === 0 && parsedTests.edgeCases.length === 0 && (
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3 text-xs text-yellow-800">
                      <div className="font-semibold mb-1">⚠️ Test code not yet available</div>
                      <div>Showing planned tests: {data.unitTests || 0} unit, {data.integrationTests || 0} integration, {data.edgeCases || 0} edge cases</div>
                      <div className="mt-1 text-yellow-700">Actual generated tests will appear here once test generation completes.</div>
                    </div>
                  )}
                </div>

                {/* Detailed Breakdown with List View */}
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 max-h-96 overflow-y-auto">
                  <div className="text-xs font-semibold text-purple-800 mb-3">Detailed Test Components:</div>
                  
                  {/* Unit Tests Details */}
                  {(data.unitTests || data.plan?.unitTests) > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <div className="font-bold text-blue-700 text-sm">Unit Tests ({data.unitTests || data.plan?.unitTests || 0})</div>
                      </div>
                      <div className="ml-6 space-y-2">
                        {data.reasoningFlow && data.reasoningFlow.filter(s => 
                          s.type?.includes('unit') || s.type?.includes('function') || 
                          s.decision?.toLowerCase().includes('unit') || 
                          s.findings?.some(f => f.toLowerCase().includes('unit') || f.toLowerCase().includes('function'))
                        ).slice(0, data.unitTests || data.plan?.unitTests || 5).map((step, i) => (
                          <div key={i} className="bg-white rounded p-2 border-l-4 border-blue-400 text-xs">
                            <div className="font-semibold text-blue-800 mb-1">
                              Test {i + 1}: {step.type?.replace(/_/g, ' ') || 'Unit Test'}
                            </div>
                            {step.findings && step.findings.length > 0 && (
                              <div className="text-gray-700 mb-1">
                                <span className="font-medium">Focus:</span> {step.findings[0]}
                              </div>
                            )}
                            {step.decision && (
                              <div className="text-gray-600 text-xs italic">
                                {step.decision.substring(0, 100)}{step.decision.length > 100 ? '...' : ''}
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Fallback if no reasoning flow matches */}
                        {(!data.reasoningFlow || data.reasoningFlow.filter(s => 
                          s.type?.includes('unit') || s.type?.includes('function')
                        ).length === 0) && (
                          <div className="bg-white rounded p-2 border-l-4 border-blue-400 text-xs text-gray-600">
                            {Array.from({ length: data.unitTests || data.plan?.unitTests || 0 }, (_, i) => (
                              <div key={i} className="mb-1">
                                Unit Test {i + 1}: Individual function validation
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Integration Tests Details */}
                  {(data.integrationTests || data.plan?.integrationTests) > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                        <div className="font-bold text-purple-700 text-sm">Integration Tests ({data.integrationTests || data.plan?.integrationTests || 0})</div>
                      </div>
                      <div className="ml-6 space-y-2">
                        {data.reasoningFlow && data.reasoningFlow.filter(s => 
                          s.type?.includes('integration') || s.type?.includes('component') ||
                          s.decision?.toLowerCase().includes('integration') ||
                          s.findings?.some(f => f.toLowerCase().includes('integration') || f.toLowerCase().includes('component'))
                        ).slice(0, data.integrationTests || data.plan?.integrationTests || 4).map((step, i) => (
                          <div key={i} className="bg-white rounded p-2 border-l-4 border-purple-400 text-xs">
                            <div className="font-semibold text-purple-800 mb-1">
                              Test {i + 1}: {step.type?.replace(/_/g, ' ') || 'Integration Test'}
                            </div>
                            {step.findings && step.findings.length > 0 && (
                              <div className="text-gray-700 mb-1">
                                <span className="font-medium">Focus:</span> {step.findings[0]}
                              </div>
                            )}
                            {step.decision && (
                              <div className="text-gray-600 text-xs italic">
                                {step.decision.substring(0, 100)}{step.decision.length > 100 ? '...' : ''}
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Fallback if no reasoning flow matches */}
                        {(!data.reasoningFlow || data.reasoningFlow.filter(s => 
                          s.type?.includes('integration') || s.type?.includes('component')
                        ).length === 0) && (
                          <div className="bg-white rounded p-2 border-l-4 border-purple-400 text-xs text-gray-600">
                            {Array.from({ length: data.integrationTests || data.plan?.integrationTests || 0 }, (_, i) => (
                              <div key={i} className="mb-1">
                                Integration Test {i + 1}: Component interaction validation
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Edge Cases Details */}
                  {(data.edgeCases || data.plan?.edgeCases) > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <div className="font-bold text-green-700 text-sm">Edge Cases ({data.edgeCases || data.plan?.edgeCases || 0})</div>
                      </div>
                      <div className="ml-6 space-y-2">
                        {data.reasoningFlow && data.reasoningFlow.filter(s => 
                          s.type?.includes('edge') || s.type?.includes('boundary') || s.type?.includes('error') ||
                          s.decision?.toLowerCase().includes('edge') || s.decision?.toLowerCase().includes('boundary') ||
                          s.findings?.some(f => f.toLowerCase().includes('edge') || f.toLowerCase().includes('boundary') || f.toLowerCase().includes('error'))
                        ).slice(0, data.edgeCases || data.plan?.edgeCases || 7).map((step, i) => (
                          <div key={i} className="bg-white rounded p-2 border-l-4 border-green-400 text-xs">
                            <div className="font-semibold text-green-800 mb-1">
                              Test {i + 1}: {step.type?.replace(/_/g, ' ') || 'Edge Case Test'}
                            </div>
                            {step.findings && step.findings.length > 0 && (
                              <div className="text-gray-700 mb-1">
                                <span className="font-medium">Focus:</span> {step.findings[0]}
                              </div>
                            )}
                            {step.decision && (
                              <div className="text-gray-600 text-xs italic">
                                {step.decision.substring(0, 100)}{step.decision.length > 100 ? '...' : ''}
                              </div>
                            )}
                            {step.impact && (
                              <div className="mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  step.impact === 'high' ? 'bg-red-100 text-red-700' :
                                  step.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {step.impact} impact
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Fallback if no reasoning flow matches */}
                        {(!data.reasoningFlow || data.reasoningFlow.filter(s => 
                          s.type?.includes('edge') || s.type?.includes('boundary')
                        ).length === 0) && (
                          <div className="bg-white rounded p-2 border-l-4 border-green-400 text-xs text-gray-600">
                            {Array.from({ length: data.edgeCases || data.plan?.edgeCases || 0 }, (_, i) => (
                              <div key={i} className="mb-1">
                                Edge Case {i + 1}: Error handling and boundary validation
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Reasoning Flow Toggle (Fallback - if no plan data) */}
        {data.reasoningFlow && Array.isArray(data.reasoningFlow) && data.reasoningFlow.length > 0 && 
         (!data.plan && !data.unitTests && !data.integrationTests && !data.edgeCases) && (
          <div className="border-t border-purple-200 pt-3">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="w-full flex items-center justify-between text-sm font-semibold text-purple-700 hover:text-purple-900 transition-colors"
            >
              <span>🧠 AI Reasoning Flow</span>
              <span className="text-xs">{showReasoning ? '🔽 Hide' : '▶️ Show'}</span>
            </button>
            {showReasoning && (
              <div className="mt-3 bg-purple-50 rounded-lg p-3 border border-purple-200 max-h-64 overflow-y-auto">
                <div className="text-xs font-semibold text-purple-800 mb-3">AI Decision Process:</div>
                {data.reasoningFlow.map((step, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                        {step.step || i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-purple-800 text-xs mb-1">
                          {step.type || 'analysis'}
                        </div>
                        {step.findings && Array.isArray(step.findings) && step.findings.length > 0 && (
                          <div className="text-xs text-gray-700 mb-1">
                            <span className="font-medium">Found:</span> {step.findings.join(', ')}
                          </div>
                        )}
                        {step.decision && (
                          <div className="text-xs text-gray-700 mb-1">
                            <span className="font-medium">Decision:</span> {step.decision}
                          </div>
                        )}
                        {step.impact && (
                          <span className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                            step.impact === 'high' ? 'bg-red-100 text-red-700' :
                            step.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {step.impact} impact
                          </span>
                        )}
                      </div>
                    </div>
                    {i < data.reasoningFlow.length - 1 && (
                      <div className="ml-3 mt-2 mb-2 border-l-2 border-purple-300 h-3" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fallback: AI Reasoning Text (if no reasoningFlow) */}
        {data.reasoning && (!data.reasoningFlow || !Array.isArray(data.reasoningFlow) || data.reasoningFlow.length === 0) && (
          <div className="border-t border-purple-200 pt-3">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="w-full flex items-center justify-between text-sm font-semibold text-purple-700 hover:text-purple-900 transition-colors"
            >
              <span>🧠 AI Reasoning</span>
              <span>{showReasoning ? '▲' : '▼'}</span>
            </button>
            {showReasoning && (
              <div className="mt-3 bg-purple-50 rounded-lg p-3 text-xs text-gray-700 border border-purple-200 max-h-48 overflow-y-auto">
                <div className="font-semibold text-purple-800 mb-2">Why these tests?</div>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {data.reasoning}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading State with Progress */}
        {(data.status === 'analyzing' || data.status === 'generating') && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-sm text-purple-600 mb-2">
              <div className="animate-spin">⚙️</div>
              <span>
                {data.status === 'analyzing' ? 'Analyzing code changes...' : 'Generating test code...'}
              </span>
            </div>
            {data.currentThought && (
              <div className="bg-white rounded-lg p-3 border-2 border-purple-300 animate-pulse mb-2">
                <div className="flex items-start gap-2">
                  <div className="text-lg animate-bounce">💭</div>
                  <div className="flex-1 text-xs text-gray-600 italic">
                    {data.currentThought}
                  </div>
                </div>
              </div>
            )}
            <div className="w-full bg-purple-100 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${data.progress || 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />

      {/* Test Detail Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedTest(null)}>
          <div className="bg-white rounded-lg p-6 max-w-3xl max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                  selectedTest.category === 'unitTests' ? 'bg-blue-100 text-blue-700' :
                  selectedTest.category === 'integrationTests' ? 'bg-purple-100 text-purple-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {selectedTest.category === 'unitTests' ? 'Unit Test' :
                   selectedTest.category === 'integrationTests' ? 'Integration Test' :
                   'Edge Case Test'}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{selectedTest.name}</h3>
              </div>
              <button
                onClick={() => setSelectedTest(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs font-semibold text-gray-700 mb-2">Generated Test Code:</div>
              <pre className="text-xs bg-white p-3 rounded border border-gray-300 overflow-x-auto">
                <code>{selectedTest.fullCode}</code>
              </pre>
            </div>
            <div className="mt-4 text-xs text-gray-600">
              <div className="font-semibold">Source:</div>
              <div>This test was generated by {data.provider || 'MiniMax'} based on the AI test plan.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

