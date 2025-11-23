import { useState } from 'react';
import axios from 'axios';

export default function JiraConnectionModal({ isOpen, onClose, onConnect }) {
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/jira/connect', {
        email: email.trim(),
        apiToken: apiToken.trim()
      });

      if (response.data.success) {
        // Store credentials in localStorage (in production, use secure session)
        localStorage.setItem('jira_email', email.trim());
        localStorage.setItem('jira_apiToken', apiToken.trim());
        
        onConnect({
          email: email.trim(),
          apiToken: apiToken.trim(),
          projects: response.data.projects
        });
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to connect to Jira');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Connect to Jira</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jira Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Token
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Enter your Jira API token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowTokenHelp(!showTokenHelp)}
                  className="text-blue-600 hover:text-blue-800 text-sm whitespace-nowrap"
                >
                  {showTokenHelp ? 'Hide' : 'Help'}
                </button>
              </div>
              {showTokenHelp && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md text-sm text-gray-700">
                  <p className="font-semibold mb-1">How to get your API token:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Atlassian Account Settings</a></li>
                    <li>Click "Create API token"</li>
                    <li>Copy the token and paste it here</li>
                  </ol>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

