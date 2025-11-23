import { useState, useEffect } from 'react';
import axios from 'axios';

export default function JiraTicketSelector({ 
  credentials, 
  selectedTicket, 
  onSelectTicket,
  onCreateTicket,
  onProjectSelect
}) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTicketSummary, setNewTicketSummary] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [showCreateProjectForm, setShowCreateProjectForm] = useState(false);
  const [newProjectKey, setNewProjectKey] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);

  // Load projects on mount
  useEffect(() => {
    if (credentials) {
      loadProjects();
    }
  }, [credentials]);

  // Load issues when project changes
  useEffect(() => {
    if (selectedProject) {
      loadIssues(selectedProject.key);
    }
  }, [selectedProject, credentials]);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/jira/projects', {
        params: {
          email: credentials.email,
          apiToken: credentials.apiToken
        }
      });
      const projectsList = response.data.projects || [];
      
      // Update projects state
      setProjects(projectsList);
      
      if (projectsList.length > 0) {
        // If we already have a selected project, try to keep it selected
        // Otherwise, select the first one
        let projectToSelect = selectedProject;
        if (!projectToSelect || !projectsList.find(p => p.key === projectToSelect.key)) {
          projectToSelect = projectsList[0];
        } else {
          // Find the updated project from the list
          projectToSelect = projectsList.find(p => p.key === projectToSelect.key) || projectsList[0];
        }
        
        setSelectedProject(projectToSelect);
        // Notify parent of project selection
        if (onProjectSelect) {
          onProjectSelect(projectToSelect.key);
        }
      } else {
        // No projects found - clear error so user can see the auto-create option
        setError(null);
        setSelectedProject(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load projects');
      setProjects([]);
      setSelectedProject(null);
    } finally {
      setLoading(false);
    }
  };

  const loadIssues = async (projectKey) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/jira/projects/${projectKey}/issues`, {
        params: {
          email: credentials.email,
          apiToken: credentials.apiToken,
          maxResults: 50
        }
      });
      setIssues(response.data.issues || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectKey.trim() || !newProjectName.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await axios.post(
        '/api/jira/projects',
        {
          projectKey: newProjectKey.trim().toUpperCase(),
          projectName: newProjectName.trim(),
          projectTypeKey: 'software',
          email: credentials.email,
          apiToken: credentials.apiToken
        }
      );

      const createdProject = response.data.project;
      
      // Show detailed success message with what was created
      const successDetails = `✅ Project Created Successfully!

📋 Details:
• Project Key: ${createdProject.key}
• Project Name: ${createdProject.name}
• Project Type: ${createdProject.projectTypeKey || 'software'}
• Project ID: ${createdProject.id}
${createdProject.url ? `• View in Jira: ${createdProject.url}` : ''}`;
      
      setSuccessMessage(successDetails);

      // Create project object for immediate use
      const newProject = {
        key: createdProject.key,
        name: createdProject.name,
        id: createdProject.id,
        projectTypeKey: createdProject.projectTypeKey || 'software'
      };
      
      // Immediately add to projects list and select it (optimistic update)
      setProjects(prevProjects => {
        // Check if project already exists (shouldn't, but just in case)
        const exists = prevProjects.find(p => p.key === newProject.key);
        return exists ? prevProjects : [...prevProjects, newProject];
      });
      setSelectedProject(newProject);
      if (onProjectSelect) {
        onProjectSelect(newProject.key);
      }

      // Reload projects from server to ensure we have the latest data
      // This will update the list with any additional server-side data
      // and won't duplicate since loadProjects replaces the entire list
      loadProjects().catch(err => {
        console.warn('Failed to reload projects, but project was created:', err);
        // Don't show error since project was successfully created
      });

      // Reset form
      setNewProjectKey('');
      setNewProjectName('');
      setShowCreateProjectForm(false);
      
      // Clear success message after 10 seconds (longer to read details)
      setTimeout(() => setSuccessMessage(null), 10000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create project';
      // If it's a permission error, provide helpful message
      if (err.response?.status === 403) {
        setError(`${errorMsg}. Note: Creating projects requires admin permissions in Jira.`);
      } else {
        setError(errorMsg);
      }
      setSuccessMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!selectedProject || !newTicketSummary.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `/api/jira/projects/${selectedProject.key}/issues`,
        {
          summary: newTicketSummary,
          description: newTicketDescription,
          issueType: 'Task',
          email: credentials.email,
          apiToken: credentials.apiToken
        }
      );

      // Reload issues to include new ticket
      await loadIssues(selectedProject.key);
      
      // Auto-select the new ticket
      onSelectTicket({
        key: response.data.issue.key,
        summary: response.data.issue.summary,
        url: response.data.issue.url
      });

      // Reset form
      setNewTicketSummary('');
      setNewTicketDescription('');
      setShowCreateForm(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const filteredIssues = issues.filter(issue =>
    issue.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!credentials) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
        Please connect to Jira first
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Project Selector */}
      {projects.length > 0 ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          <select
            value={selectedProject?.key || ''}
            onChange={(e) => {
              const project = projects.find(p => p.key === e.target.value);
              setSelectedProject(project);
              setIssues([]);
              setSearchTerm('');
              // Notify parent of project selection
              if (onProjectSelect && project) {
                onProjectSelect(project.key);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map(project => (
              <option key={project.key} value={project.key}>
                {project.name} ({project.key})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-blue-900 mb-1">No projects found</p>
              <p className="text-sm text-blue-800">Create a new project to get started, or start a workflow and a project will be auto-created.</p>
            </div>
          </div>
          {!showCreateProjectForm ? (
            <button
              type="button"
              onClick={() => setShowCreateProjectForm(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Auto-create Project
            </button>
          ) : (
            <div className="mt-3 p-4 border border-blue-200 rounded-md bg-white">
              <h4 className="text-lg font-semibold mb-3 text-gray-900">Create New Project</h4>
              <form onSubmit={handleCreateProject} className="space-y-3">
                <div>
                  <label htmlFor="newProjectKey" className="block text-sm font-medium text-gray-700">
                    Project Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="newProjectKey"
                    value={newProjectKey}
                    onChange={(e) => setNewProjectKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="e.g., TEST"
                    maxLength={10}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Project key must be uppercase letters and numbers only (max 10 characters)</p>
                </div>
                <div>
                  <label htmlFor="newProjectName" className="block text-sm font-medium text-gray-700">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="newProjectName"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., Test Project"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateProjectForm(false);
                      setNewProjectKey('');
                      setNewProjectName('');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newProjectKey.trim() || !newProjectName.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      {selectedProject && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Issues
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by key or summary..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="text-sm text-green-800 whitespace-pre-line">
            {successMessage}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Issues List */}
      {selectedProject && projects.length > 0 && (
        <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
          {loading && issues.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Loading issues...</div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No issues found{searchTerm && ` matching "${searchTerm}"`}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredIssues.map(issue => (
                <button
                  key={issue.key}
                  onClick={() => onSelectTicket({
                    key: issue.key,
                    summary: issue.summary,
                    status: issue.status
                  })}
                  className={`w-full text-left p-3 hover:bg-blue-50 transition-colors ${
                    selectedTicket?.key === issue.key ? 'bg-blue-100' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{issue.key}</div>
                      <div className="text-sm text-gray-600">{issue.summary}</div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs rounded ${
                        issue.status === 'Done' ? 'bg-green-100 text-green-800' :
                        issue.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {issue.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create New Ticket */}
      {selectedProject && projects.length > 0 && (
        <div>
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              + Create New Ticket in {selectedProject.name}
            </button>
          ) : (
            <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3">Create New Ticket</h3>
              <form onSubmit={handleCreateTicket} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Summary *
                  </label>
                  <input
                    type="text"
                    value={newTicketSummary}
                    onChange={(e) => setNewTicketSummary(e.target.value)}
                    placeholder="Enter ticket summary"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newTicketDescription}
                    onChange={(e) => setNewTicketDescription(e.target.value)}
                    placeholder="Enter ticket description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewTicketSummary('');
                      setNewTicketDescription('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newTicketSummary.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : 'Create Ticket'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Selected Ticket Display */}
      {selectedTicket && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-green-900">{selectedTicket.key}</div>
              <div className="text-sm text-green-700">{selectedTicket.summary}</div>
            </div>
            <button
              onClick={() => onSelectTicket(null)}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

