import { useState, useEffect } from 'react';
import axios from 'axios';
import JiraConnectionModal from './JiraConnectionModal';
import JiraTicketSelector from './JiraTicketSelector';

export default function Dashboard({ onStartWorkflow, onViewRLMetrics }) {
  const [formData, setFormData] = useState({
    jiraTicketKey: '',
    assignee: 'demo.user',
    prUrl: '', // User must provide a real PR URL
    prNumber: '',
    branch: 'feature/add-auth',
    summary: 'Add user authentication'
  });
  const [loading, setLoading] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [jiraCredentials, setJiraCredentials] = useState(null);
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('jira_email');
    const savedToken = localStorage.getItem('jira_apiToken');
    if (savedEmail && savedToken) {
      // Validate credentials by loading projects
      axios.get('/api/jira/projects', {
        params: { email: savedEmail, apiToken: savedToken }
      })
        .then(response => {
          setJiraCredentials({
            email: savedEmail,
            apiToken: savedToken,
            projects: response.data.projects
          });
        })
        .catch(() => {
          // Credentials invalid, clear them
          localStorage.removeItem('jira_email');
          localStorage.removeItem('jira_apiToken');
        });
    }
  }, []);

  const handleJiraConnect = (credentials) => {
    setJiraCredentials(credentials);
    setShowJiraModal(false);
  };

  const handleTicketSelect = (ticket) => {
    setSelectedTicket(ticket);
    if (ticket) {
      setFormData({
        ...formData,
        jiraTicketKey: ticket.key
      });
    }
  };

  const handleProjectSelect = (projectKey) => {
    // Store selected project in credentials for use in workflow
    if (jiraCredentials) {
      setJiraCredentials({
        ...jiraCredentials,
        selectedProjectKey: projectKey
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.prUrl || !formData.prUrl.trim()) {
      alert('Please enter a GitHub PR URL or repository URL');
      return;
    }
    
    setLoading(true);

    try {
      // jiraTicketKey is optional - backend will auto-create if missing
      // Also send selected project key if user connected to Jira
      const payload = {
        jiraTicketKey: formData.jiraTicketKey?.trim() || null,
        projectKey: selectedTicket?.project || (jiraCredentials && jiraCredentials.selectedProjectKey) || null,
        selectedProjectKey: (jiraCredentials && jiraCredentials.selectedProjectKey) || null, // Store user's selected project
        prUrl: formData.prUrl.trim(),
        summary: formData.summary || 'Test workflow',
        assignee: formData.assignee || 'system'
      };
      
      console.log('📋 Submitting workflow with data:', payload);
      
      const response = await axios.post('/api/workflows/trigger', payload);
      
      // Use the workflowId returned from backend
      const workflowId = response.data.workflowId;
      console.log('✅ Workflow started:', workflowId);
      
      onStartWorkflow(workflowId);
    } catch (error) {
      console.error('❌ Failed to start workflow:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert('Failed to start workflow: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                TestFlow AI - Automated Test Generation
              </h1>
              <p className="text-gray-600">
                Trigger automated test generation workflow for your code changes
              </p>
            </div>
            {onViewRLMetrics && (
              <button
                onClick={onViewRLMetrics}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-md"
              >
                📊 View RL Metrics
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jira Ticket Key <span className="text-gray-400 text-xs">(optional - will be auto-created if not provided)</span>
                </label>
                {jiraCredentials && selectedTicket ? (
                  <div className="relative">
                    <input
                      type="text"
                      name="jiraTicketKey"
                      value={formData.jiraTicketKey}
                      readOnly
                      className="w-full px-3 py-2 border border-green-300 bg-green-50 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                      <span className="text-xs text-gray-600">{selectedTicket.summary}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTicket(null);
                          setFormData({ ...formData, jiraTicketKey: '' });
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                <input
                  type="text"
                  name="jiraTicketKey"
                  value={formData.jiraTicketKey}
                  onChange={handleInputChange}
                      placeholder={jiraCredentials ? "Select a ticket below or leave empty to auto-create" : "Connect to Jira first (optional)"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!jiraCredentials}
                    />
                    {!jiraCredentials && (
                      <p className="text-xs text-gray-500">
                        Click "Jira" in "How It Works" below to connect (optional - ticket will be auto-created)
                      </p>
                    )}
                  </div>
                )}
                {jiraCredentials && !selectedTicket && (
                  <div className="mt-2">
                    <JiraTicketSelector
                      credentials={jiraCredentials}
                      selectedTicket={selectedTicket}
                      onSelectTicket={handleTicketSelect}
                      onProjectSelect={handleProjectSelect}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignee
                </label>
                <input
                  type="text"
                  name="assignee"
                  value={formData.assignee}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PR URL or Repository <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  name="prUrl"
                  value={formData.prUrl}
                  onChange={handleInputChange}
                  placeholder="https://github.com/richiejeremiah/doclittle-platform/pull/1 OR https://github.com/richiejeremiah/doclittle-platform"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a GitHub PR URL, or repository URL (will use latest commit from branch)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PR Number (optional)
                </label>
                <input
                  type="number"
                  name="prNumber"
                  value={formData.prNumber}
                  onChange={handleInputChange}
                  placeholder="Auto-detected from PR URL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Will be extracted from PR URL if not provided</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary
                </label>
                <input
                  type="text"
                  name="summary"
                  value={formData.summary}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Starting Workflow...' : '🚀 Start Test Generation Workflow'}
            </button>
          </form>

          {/* Jira Connection Modal */}
          <JiraConnectionModal
            isOpen={showJiraModal}
            onClose={() => setShowJiraModal(false)}
            onConnect={handleJiraConnect}
          />
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">How It Works</h2>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📦</span>
              </div>
              <h3 className="font-semibold mb-1">1. GitHub Push</h3>
              <p className="text-sm text-gray-600">Code changes detected</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="font-semibold mb-1">2. AI Review</h3>
              <p className="text-sm text-gray-600">Gemini + MiniMax analyze & generate tests</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="font-semibold mb-1">3. CodeRabbit</h3>
              <p className="text-sm text-gray-600">Quality review & validation</p>
            </div>
            <div 
              className="text-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowJiraModal(true)}
            >
              <div className={`rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 relative ${
                jiraCredentials ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <span className="text-2xl">📋</span>
                {jiraCredentials && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <h3 className="font-semibold mb-1">4. Jira {jiraCredentials && <span className="text-green-600">✓</span>}</h3>
              <p className="text-sm text-gray-600">
                {jiraCredentials ? 'Connected' : 'Click to connect'}
              </p>
              {jiraCredentials && selectedTicket && (
                <p className="text-xs text-green-600 mt-1 font-medium">
                  {selectedTicket.key}
                </p>
              )}
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="font-semibold mb-1">5. Jira Push</h3>
              <p className="text-sm text-gray-600">Tests pushed to Jira subtask</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

