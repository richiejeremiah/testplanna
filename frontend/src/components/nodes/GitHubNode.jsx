import { Handle, Position } from 'reactflow';
import StatusBadge from '../StatusBadge';

export default function GitHubNode({ data = {} }) {
  return (
    <div className="relative px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-blue-500 min-w-[280px] w-80">
      {/* Step Number Badge */}
      {data.stepNumber && (
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white z-10">
          {data.stepNumber}
        </div>
      )}
      
      <Handle type="target" position={Position.Top} />
      
      <div className="flex items-start gap-3">
        <div className="text-3xl">📦</div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
            <div className="font-bold text-gray-900">GitHub Push</div>
              <div className="group relative">
                <span className="text-xs text-gray-400 hover:text-gray-600 cursor-help">ℹ️</span>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <div className="font-semibold mb-1">Purpose:</div>
                  <div>Fetches code changes from GitHub Pull Request or repository. This provides the code context needed for test generation.</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>
            <StatusBadge status={data.status || 'pending'} />
          </div>
          
          <div className="text-xs text-gray-600 mb-2">
            {data.prNumber && `PR #${data.prNumber}`}
            {data.branch && ` • ${data.branch}`}
          </div>
          
          {data.prUrl && (
            <a
              href={data.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              View PR →
            </a>
          )}
          
          {data.filesChanged && (
            <div className="text-xs text-gray-500 mt-1">
              {data.filesChanged} file{data.filesChanged !== 1 ? 's' : ''} changed
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

