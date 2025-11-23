export default function StatusBadge({ status }) {
  const statusConfig = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    running: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Running' },
    complete: { bg: 'bg-green-100', text: 'text-green-800', label: 'Complete' },
    failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
    reviewing: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Reviewing' },
    executing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Executing' },
    passed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Passed' },
    partial: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Partial' },
    computing: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Computing' },
    creating: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Creating' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

