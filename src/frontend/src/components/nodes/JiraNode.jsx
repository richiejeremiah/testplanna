import { Handle, Position } from 'reactflow';
import StatusBadge from '../StatusBadge';

export default function JiraNode({ data = {} }) {
  return (
    <div className="relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-green-500 min-w-[280px] w-80">
      {/* Step Number Badge */}
      {data.stepNumber && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
          {data.stepNumber}
        </div>
      )}
      
      <Handle type="target" position={Position.Top} />
      
      <div className="flex items-start gap-3">
        <div className="text-3xl">📋</div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-gray-900">Jira Subtask</div>
            <StatusBadge status={data.status || 'pending'} />
          </div>
          
          {data.status === 'complete' && data.issueKey && (
            <div className="text-xs space-y-1 mt-2 bg-green-50 rounded-lg p-2 border border-green-200">
              <div className="font-semibold text-green-700">
                {data.issueKey} Created
              </div>
              {data.parentKey && (
                <div className="text-gray-600">
                  Parent: {data.parentKey}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                {data.coverage && (
                  <div className="text-gray-600">
                    <span className="font-semibold">{data.coverage}%</span> coverage
                  </div>
                )}
                {data.testCount && (
                  <div className="text-gray-600">
                    <span className="font-semibold">{data.testCount}</span> tests
                  </div>
                )}
              </div>
              {data.jiraUrl && (
                <a
                  href={data.jiraUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline block mt-2 font-semibold"
                >
                  View in Jira →
                </a>
              )}
            </div>
          )}
          
          {data.status === 'creating' && (
            <div className="text-xs text-green-600 mt-2 flex items-center gap-2">
              <div className="animate-spin">⚙️</div>
              <span>Creating subtask with test scripts...</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

