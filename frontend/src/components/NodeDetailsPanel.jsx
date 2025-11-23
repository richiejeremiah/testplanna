export default function NodeDetailsPanel({ node, onClose }) {
  if (!node) return null;

  const formatData = (data) => {
    if (!data || typeof data !== 'object') return String(data || '');
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 shadow-xl overflow-y-auto h-full">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Node Details</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Node ID</h4>
          <p className="text-sm text-gray-600 font-mono">{node.id}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Type</h4>
          <p className="text-sm text-gray-600">{node.type || 'default'}</p>
        </div>

        {node.data && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Data</h4>
            <pre className="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
              {formatData(node.data)}
            </pre>
          </div>
        )}

        {node.position && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Position</h4>
            <p className="text-sm text-gray-600">
              X: {Math.round(node.position.x)}, Y: {Math.round(node.position.y)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

