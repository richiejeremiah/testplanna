/**
 * StatusBadge - Prominent status indicator for workflow nodes
 */
export default function StatusBadge({ status }) {
  const config = {
    pending: {
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: '⏱️',
      text: 'Pending'
    },
    fetching: {
      color: 'bg-blue-100 text-blue-700 border-blue-400 animate-pulse',
      icon: '📥',
      text: 'Fetching...'
    },
    analyzing: {
      color: 'bg-blue-100 text-blue-700 border-blue-400 animate-pulse',
      icon: '🔍',
      text: 'Analyzing...'
    },
    generating: {
      color: 'bg-purple-100 text-purple-700 border-purple-400 animate-pulse',
      icon: '⚡',
      text: 'Generating...'
    },
    reviewing: {
      color: 'bg-orange-100 text-orange-700 border-orange-400 animate-pulse',
      icon: '🔬',
      text: 'Reviewing...'
    },
    creating: {
      color: 'bg-green-100 text-green-700 border-green-400 animate-pulse',
      icon: '📝',
      text: 'Creating...'
    },
    ready: {
      color: 'bg-blue-100 text-blue-700 border-blue-500',
      icon: '✅',
      text: 'Ready'
    },
    complete: {
      color: 'bg-green-100 text-green-700 border-green-500',
      icon: '✅',
      text: 'Complete'
    },
    failed: {
      color: 'bg-red-100 text-red-700 border-red-500',
      icon: '❌',
      text: 'Failed'
    }
  };

  const { color, icon, text } = config[status] || config.pending;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 ${color} font-semibold text-xs whitespace-nowrap`}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

