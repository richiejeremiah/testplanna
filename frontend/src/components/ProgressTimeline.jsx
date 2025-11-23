/**
 * ProgressTimeline - Shows overall workflow progress with clickable navigation
 */
export default function ProgressTimeline({ nodes = [], onStepClick }) {
  const steps = [
    { 
      num: 1, 
      name: 'GitHub PR', 
      icon: '📦', 
      type: 'github-push',
      description: 'Fetches code changes from GitHub PR or repository'
    },
    { 
      num: 2, 
      name: 'CodeRabbit', 
      icon: '🔍', 
      type: 'coderabbit-review',
      description: 'Reviews code quality, security, and architecture'
    },
    { 
      num: 3, 
      name: 'AI Planning', 
      icon: '🧠', 
      type: 'ai-review',
      description: 'AI analyzes code and plans test strategy'
    },
    { 
      num: 4, 
      name: 'Test Generation', 
      icon: '⚡', 
      type: 'ai-review',
      description: 'AI generates test code based on plan'
    },
    { 
      num: 5, 
      name: 'Test Execution', 
      icon: '🧪', 
      type: 'test-execution',
      description: 'Executes generated tests and calculates coverage'
    },
    { 
      num: 6, 
      name: 'Reward Signals', 
      icon: '⭐', 
      type: 'reward-computation',
      description: 'Computes RL training reward signals'
    },
    { 
      num: 7, 
      name: 'Jira Push', 
      icon: '📋', 
      type: 'jira-subtask',
      description: 'Creates Jira subtask with generated tests'
    }
  ];

  // Calculate current step
  function getCurrentStep(nodes) {
    if (!nodes || nodes.length === 0) return 0;
    
    const stepOrder = ['github-push', 'coderabbit-review', 'ai-review', 'test-execution', 'reward-computation', 'jira-subtask'];
    let currentStep = 0;
    
    for (let i = 0; i < stepOrder.length; i++) {
      const node = nodes.find(n => n && n.type === stepOrder[i]);
      if (!node || !node.data) break;
      
      if (node.data.status === 'complete') {
        currentStep = i + 1;
      } else if (['analyzing', 'generating', 'reviewing', 'creating', 'fetching', 'ready'].includes(node.data.status)) {
        currentStep = i + 1;
        break;
      }
    }
    
    return currentStep;
  }

  const currentStep = getCurrentStep(nodes);

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-6 border border-gray-200">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const stepNode = nodes && nodes.length > 0 ? nodes.find(n => {
            if (!n || !n.type) return false;
            if (step.type === 'ai-review') {
              return n.type === 'ai-review';
            }
            return n.type === step.type;
          }) : null;
          
          const isComplete = currentStep > step.num;
          const isActive = currentStep === step.num;
          const isPending = currentStep < step.num;

          // Determine connector color based on current step's status
          // Get status from stepNode if available, otherwise use completion state
          const stepStatus = stepNode?.data?.status || (isComplete ? 'complete' : 'pending');
          
          // Determine connector color based on status
          let connectorColor = '#CBD5E0'; // Default gray
          if (stepStatus === 'complete') {
            connectorColor = '#10B981'; // Green
          } else if (['ready', 'pending'].includes(stepStatus)) {
            connectorColor = '#CBD5E0'; // Gray
          } else if (['analyzing', 'generating', 'reviewing', 'creating', 'fetching', 'executing', 'computing'].includes(stepStatus)) {
            connectorColor = '#3B82F6'; // Blue for active states
          }

          // Determine if connector should be solid or dashed
          const isConnectorComplete = stepStatus === 'complete';
          const connectorStyle = isConnectorComplete ? 'solid' : 'dashed';

          return (
            <div key={step.num} className="flex items-center flex-1 relative">
              {/* Step Circle - Clickable */}
              <div 
                className={`flex flex-col items-center flex-1 ${isPending ? 'opacity-40' : 'opacity-100'} relative group`}
                title={step.description}
              >
                {/* Left connection dot */}
                {i > 0 && (
                  <div 
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10"
                    style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%',
                      backgroundColor: connectorColor,
                      border: '2px solid white',
                      boxShadow: '0 0 0 1px ' + connectorColor
                    }}
                  />
                )}

                <button
                  onClick={() => {
                    if (onStepClick && stepNode) {
                      onStepClick(stepNode.id);
                    }
                  }}
                  disabled={!stepNode}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border-4 transition-all relative z-20
                    ${isComplete
                      ? 'bg-green-500 border-green-600 text-white hover:bg-green-600 cursor-pointer'
                      : isActive
                      ? 'bg-blue-500 border-blue-600 text-white animate-pulse cursor-pointer'
                      : stepNode
                      ? 'bg-gray-200 border-gray-300 text-gray-500 hover:bg-gray-300 cursor-pointer'
                      : 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                    }
                    ${stepNode ? 'hover:scale-110 hover:shadow-lg' : ''}
                  `}
                >
                  {isComplete ? '✓' : step.icon}
                </button>
                <span className="text-xs mt-2 font-medium text-gray-700 text-center">
                  {step.name}
                </span>
                {stepNode && stepNode.data.status && (
                  <span className={`text-xs mt-1 ${
                    stepNode.data.status === 'complete' ? 'text-green-600' :
                    ['analyzing', 'generating', 'reviewing', 'creating'].includes(stepNode.data.status) ? 'text-blue-600' :
                    'text-gray-500'
                  }`}>
                    {stepNode.data.status}
                  </span>
                )}
                {/* Tooltip */}
                {step.description && (
                  <div className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {step.description}
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}

                {/* Right connection dot */}
                {i < steps.length - 1 && (
                  <div 
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 z-10"
                    style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%',
                      backgroundColor: connectorColor,
                      border: '2px solid white',
                      boxShadow: '0 0 0 1px ' + connectorColor
                    }}
                  />
                )}
              </div>
              
              {/* Connecting Line - Horizontal line between steps */}
              {i < steps.length - 1 && (
                <div className="flex items-center flex-1 mx-2 relative" style={{ height: '2px' }}>
                <div
                    className="flex-1 transition-all duration-300"
                    style={{
                      height: '2px',
                      backgroundColor: connectorStyle === 'solid' ? connectorColor : 'transparent',
                      borderTop: connectorStyle === 'dashed' ? `2px dashed ${connectorColor}` : 'none',
                      borderBottom: 'none',
                      backgroundImage: connectorStyle === 'dashed' 
                        ? `repeating-linear-gradient(to right, ${connectorColor} 0px, ${connectorColor} 6px, transparent 6px, transparent 10px)`
                        : 'none',
                      backgroundSize: connectorStyle === 'dashed' ? '10px 2px' : 'auto',
                      backgroundRepeat: connectorStyle === 'dashed' ? 'repeat-x' : 'no-repeat'
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

