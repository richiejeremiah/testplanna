import { Handle, Position } from 'reactflow';
import StatusBadge from '../StatusBadge';

export default function TrainingNode({ data = {} }) {
  const status = data.status || 'pending';
  const modelVersion = data.modelVersion || 'v1.0';
  const improvement = data.improvement || null;
  const trainingExamples = data.trainingExamples || 0;
  const mode = data.mode || 'simulation';

  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return 'border-green-500';
      case 'training':
        return 'border-blue-500';
      case 'pending':
      case 'checking':
        return 'border-yellow-500';
      case 'failed':
        return 'border-red-500';
      default:
        return 'border-gray-500';
    }
  };

  const getIconColor = () => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-600';
      case 'training':
        return 'bg-blue-100 text-blue-600';
      case 'pending':
      case 'checking':
        return 'bg-yellow-100 text-yellow-600';
      case 'failed':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className={`relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 ${getStatusColor()} min-w-[280px] w-80`}>
      {/* Step Number Badge */}
      {data.stepNumber && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
          {data.stepNumber}
        </div>
      )}

      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500" />
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-lg ${getIconColor()} flex items-center justify-center`}>
            {status === 'training' ? (
              <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">Model Training</h3>
            <StatusBadge status={status} />
          </div>
          
          {status === 'complete' && (
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">New Model:</span>
                <span className="font-bold text-purple-600">{modelVersion}</span>
              </div>
              {improvement && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Improvement:</span>
                  <span className="font-bold text-green-600">+{improvement}%</span>
                </div>
              )}
              {trainingExamples > 0 && (
                <div className="flex items-center justify-between text-gray-600">
                  <span>Training Examples:</span>
                  <span>{trainingExamples}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-gray-600">
                <span>Mode:</span>
                <span className="text-xs">{mode === 'simulation' ? '🎮 Simulation' : '🤖 HuggingFace'}</span>
              </div>
            </div>
          )}

          {status === 'training' && (
            <div className="mt-2 space-y-1 text-xs">
              <div className="text-gray-600">{data.message || 'Training in progress...'}</div>
              {data.progress !== undefined && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${data.progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {(status === 'pending' || status === 'checking') && (
            <div className="mt-2 text-xs text-gray-600">
              {data.reason || 'Checking training conditions...'}
            </div>
          )}

          {status === 'skipped' && (
            <div className="mt-2 text-xs text-gray-500">
              {data.reason || 'Training skipped'}
            </div>
          )}

          {status === 'failed' && (
            <div className="mt-2 text-xs text-red-600">
              {data.error || 'Training failed'}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500" />
    </div>
  );
}

