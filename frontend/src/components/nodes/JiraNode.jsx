import { Handle, Position } from 'reactflow';
import StatusBadge from '../StatusBadge';

export default function JiraNode({ data = {} }) {
  return (
    <div className="relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-jira-blue min-w-[280px] w-80">
      {/* Step Number Badge */}
      {data.stepNumber && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-jira-blue text-white flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
          {data.stepNumber}
        </div>
      )}

      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-jira-blue" />
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-jira-blue" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.53 2C6.45 2.16 2.5 6.5 2.5 12c0 6.07 5.35 10.5 10.5 10.5 5.15 0 10.5-4.43 10.5-10.5 0-5.5-3.95-9.84-9.03-10 0 0-.17 0-.17 0H11.53zM12 4h1.5l-4.5 9h5.5l-5.5 9V11H4.5L12 4z"/>
            </svg>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">Jira Push</h3>
            <StatusBadge status={data.status || 'pending'} />
          </div>
          
          {data.issueKey && (
            <div className="mt-2 text-xs text-gray-600">
              <div className="font-medium text-jira-blue">{data.issueKey}</div>
              {data.issueUrl && (
                <a 
                  href={data.issueUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View in Jira →
                </a>
              )}
            </div>
          )}
          
          {data.error && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
              {data.error}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-jira-blue" />
    </div>
  );
}

