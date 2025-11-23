import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

/**
 * WorkflowBoard - Jira-like board view for managing workflows
 * Shows workflows in a table/list format with filters, status columns, and details
 */
export default function WorkflowBoard({ onStartWorkflow }) {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'board'
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    assignee: 'all',
    project: 'all',
    search: ''
  });

  // Load workflows
  useEffect(() => {
    loadWorkflows();
    // Refresh every 5 seconds
    const interval = setInterval(loadWorkflows, 5000);
    return () => clearInterval(interval);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...workflows];

    if (filters.status !== 'all') {
      filtered = filtered.filter(w => w.status === filters.status);
    }

    if (filters.assignee !== 'all') {
      filtered = filtered.filter(w => w.createdBy === filters.assignee);
    }

    if (filters.project !== 'all') {
      filtered = filtered.filter(w => w.jiraProjectKey === filters.project);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(w => 
        w.jiraTicketKey?.toLowerCase().includes(searchLower) ||
        w.jiraTicketSummary?.toLowerCase().includes(searchLower) ||
        w.workflowId?.toLowerCase().includes(searchLower) ||
        w.github?.prUrl?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredWorkflows(filtered);
  }, [workflows, filters]);

  const loadWorkflows = async (syncWithJira = false) => {
    try {
      if (syncWithJira) {
        setSyncing(true);
      }
      const response = await axios.get('/api/workflows', {
        params: syncWithJira ? { sync: 'true' } : {}
      });
      setWorkflows(response.data || []);
      if (syncWithJira) {
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Generate a clean, short identifier for workflows
  const getWorkflowBadge = (workflow, index) => {
    // If it has a Jira ticket key, extract just the number part
    if (workflow.jiraTicketKey) {
      const match = workflow.jiraTicketKey.match(/-(\d+)$/);
      if (match) {
        return `#${match[1]}`;
      }
      // If no number found, use first 3 chars of project + last 2 digits
      const project = workflow.jiraTicketKey.split('-')[0];
      return project.substring(0, 3).toUpperCase();
    }
    // For workflows without Jira key, use a short hash
    if (workflow.workflowId) {
      return `#${workflow.workflowId.substring(0, 6).toUpperCase()}`;
    }
    // Fallback to index
    return `#${index + 1}`;
  };

  const getWorkflowProgress = (workflow) => {
    const steps = [
      workflow.github?.prUrl ? 1 : 0,
      workflow.codeRabbitReview?.status === 'complete' ? 1 : 0,
      workflow.aiPlanning?.status === 'complete' ? 1 : 0,
      workflow.aiGeneration?.status === 'complete' ? 1 : 0,
      workflow.testExecution?.status ? 1 : 0,
      workflow.jiraSubtask?.created ? 1 : 0
    ];
    const completed = steps.reduce((a, b) => a + b, 0);
    return Math.round((completed / 6) * 100);
  };

  const uniqueAssignees = [...new Set(workflows.map(w => w.createdBy).filter(Boolean))];
  const uniqueProjects = [...new Set(workflows.map(w => w.jiraProjectKey).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
              <p className="text-sm text-gray-600 mt-1">
                {filteredWorkflows.length} of {workflows.length} workflows
                {workflows.some(w => w.jiraTicketKey) && (
                  <span className="ml-2 text-xs text-gray-500">
                    (Data from MongoDB - click "Sync with Jira" to update from Jira)
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadWorkflows(true)}
                disabled={syncing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                title="Sync with Jira to get latest ticket status"
              >
                {syncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    🔄 Sync with Jira
                  </>
                )}
              </button>
              {lastSync && (
                <span className="text-xs text-gray-500">
                  Last synced: {lastSync.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => navigate('/demo')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <span>+</span> Create Workflow
              </button>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 text-sm font-medium ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('board')}
                  className={`px-4 py-2 text-sm font-medium ${
                    viewMode === 'board' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Board
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <input
                type="text"
                placeholder="Search workflows..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={filters.assignee}
              onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Assignees</option>
              {uniqueAssignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
            <select
              value={filters.project}
              onChange={(e) => setFilters({ ...filters, project: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Projects</option>
              {uniqueProjects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
            <button
              onClick={() => setFilters({ status: 'all', assignee: 'all', project: 'all', search: '' })}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {viewMode === 'list' ? (
          /* List View */
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reporter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWorkflows.map((workflow, index) => {
                  const progress = getWorkflowProgress(workflow);
                  const badge = getWorkflowBadge(workflow, index);
                  return (
                    <tr
                      key={workflow._id || workflow.workflowId}
                      onClick={() => setSelectedWorkflow(workflow)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                              <span className="text-white font-bold text-sm">
                                {badge}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4 min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {workflow.jiraTicketSummary || workflow.github?.prUrl?.split('/').pop() || 'Untitled Workflow'}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                              <span className="truncate">{workflow.jiraTicketKey || workflow.workflowId}</span>
                              {workflow.jiraTicketKey && (
                                <span className="text-xs text-blue-600 flex-shrink-0" title="Synced from Jira">
                                  📋
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(workflow.status)}`}>
                          {workflow.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                progress === 100 ? 'bg-green-500' : 
                                progress > 50 ? 'bg-blue-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {workflow.createdBy || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {workflow.createdBy || 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getPriorityColor('medium')}`}>
                          Medium
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(workflow.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredWorkflows.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No workflows found</p>
                <button
                  onClick={() => navigate('/demo')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Your First Workflow
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Board View */
          <div className="grid grid-cols-4 gap-4">
            {['pending', 'running', 'completed', 'failed'].map(status => {
              const statusWorkflows = filteredWorkflows.filter(w => (w.status || 'pending') === status);
              return (
                <div key={status} className="bg-gray-100 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3 capitalize">
                    {status} ({statusWorkflows.length})
                  </h3>
                  <div className="space-y-3">
                    {statusWorkflows.map((workflow, idx) => {
                      const progress = getWorkflowProgress(workflow);
                      const badge = getWorkflowBadge(workflow, idx);
                      return (
                        <div
                          key={workflow._id || workflow.workflowId}
                          onClick={() => setSelectedWorkflow(workflow)}
                          className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow border border-gray-200"
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                              <span className="text-white font-bold text-xs">
                                {badge}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                {workflow.jiraTicketSummary || workflow.github?.prUrl?.split('/').pop() || 'Untitled'}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {workflow.jiraTicketKey || workflow.workflowId}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                              <div
                                className={`h-1.5 rounded-full ${
                                  progress === 100 ? 'bg-green-500' : 
                                  progress > 50 ? 'bg-blue-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{workflow.createdBy || 'Unassigned'}</span>
                              <span>{progress}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Workflow Detail Panel */}
      {selectedWorkflow && (
        <WorkflowDetailPanel
          workflow={selectedWorkflow}
          onClose={() => setSelectedWorkflow(null)}
          onViewWorkflow={(workflowId) => {
            setSelectedWorkflow(null);
            navigate(`/workflow/${workflowId}`);
          }}
        />
      )}
    </div>
  );
}

/**
 * WorkflowDetailPanel - Side panel showing workflow details
 */
function WorkflowDetailPanel({ workflow, onClose, onViewWorkflow }) {
  const getWorkflowProgress = (workflow) => {
    const steps = [
      workflow.github?.prUrl ? 1 : 0,
      workflow.codeRabbitReview?.status === 'complete' ? 1 : 0,
      workflow.aiPlanning?.status === 'complete' ? 1 : 0,
      workflow.aiGeneration?.status === 'complete' ? 1 : 0,
      workflow.testExecution?.status ? 1 : 0,
      workflow.jiraSubtask?.created ? 1 : 0
    ];
    const completed = steps.reduce((a, b) => a + b, 0);
    return { completed, total: 6, percentage: Math.round((completed / 6) * 100) };
  };

  const progress = getWorkflowProgress(workflow);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Details</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Workflow Info */}
        <div>
          <div className="text-sm font-semibold text-gray-500 mb-2">Work</div>
          <div className="text-lg font-bold text-gray-900 mb-1">
            {workflow.jiraTicketKey || workflow.workflowId}
          </div>
          <div className="text-sm text-gray-600">
            {workflow.jiraTicketSummary || 'Untitled Workflow'}
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="text-sm font-semibold text-gray-500 mb-2">Progress</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full ${
                progress.percentage === 100 ? 'bg-green-500' : 
                progress.percentage > 50 ? 'bg-blue-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="text-sm text-gray-600">
            {progress.completed} of {progress.total} steps completed
          </div>
        </div>

        {/* Subtasks */}
        <div>
          <div className="text-sm font-semibold text-gray-500 mb-2">Subtasks</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <span className="text-xs">✓</span>
                <span className="text-sm">GitHub Push</span>
              </div>
              <span className="text-xs text-gray-500">
                {workflow.github?.prUrl ? 'Complete' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <span className="text-xs">✓</span>
                <span className="text-sm">CodeRabbit Review</span>
              </div>
              <span className="text-xs text-gray-500">
                {workflow.codeRabbitReview?.status === 'complete' ? 'Complete' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <span className="text-xs">✓</span>
                <span className="text-sm">AI Planning</span>
              </div>
              <span className="text-xs text-gray-500">
                {workflow.aiPlanning?.status === 'complete' ? 'Complete' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <span className="text-xs">✓</span>
                <span className="text-sm">Test Generation</span>
              </div>
              <span className="text-xs text-gray-500">
                {workflow.aiGeneration?.status === 'complete' ? 'Complete' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <span className="text-xs">✓</span>
                <span className="text-sm">Test Execution</span>
              </div>
              <span className="text-xs text-gray-500">
                {workflow.testExecution?.status ? 'Complete' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <span className="text-xs">✓</span>
                <span className="text-sm">Jira Push</span>
              </div>
              <span className="text-xs text-gray-500">
                {workflow.jiraSubtask?.created ? 'Complete' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="text-sm font-semibold text-gray-500 mb-2">Details</div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Reporter:</span>
              <span className="ml-2 text-gray-900">{workflow.createdBy || 'System'}</span>
            </div>
            <div>
              <span className="text-gray-500">Assignee:</span>
              <span className="ml-2 text-gray-900">{workflow.createdBy || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-gray-500">Priority:</span>
              <span className="ml-2 text-gray-900">Medium</span>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>
              <span className="ml-2 text-gray-900">
                {new Date(workflow.createdAt).toLocaleString()}
              </span>
            </div>
            {workflow.github?.prUrl && (
              <div>
                <span className="text-gray-500">PR:</span>
                <a
                  href={workflow.github.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline"
                >
                  {workflow.github.prUrl}
                </a>
              </div>
            )}
            {workflow.jiraSubtask?.issueUrl && (
              <div>
                <span className="text-gray-500">Jira Subtask:</span>
                <a
                  href={workflow.jiraSubtask.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline"
                >
                  {workflow.jiraSubtask.issueKey}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={() => onViewWorkflow(workflow.workflowId)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            View Workflow Canvas
          </button>
        </div>
      </div>
    </div>
  );
}

