import axios from 'axios';

/**
 * JiraService - Creates Jira subtasks with test scripts
 */
export class JiraService {
  constructor() {
    this.baseUrl = process.env.JIRA_BASE_URL;
    this.email = process.env.JIRA_EMAIL;
    this.apiToken = process.env.JIRA_API_TOKEN;
    this.projectKey = process.env.JIRA_PROJECT_KEY || 'TEST';
    this.useMock = process.env.JIRA_USE_MOCK === 'true';
  }

  /**
   * Create a standalone issue (not a subtask)
   */
  async createStandaloneIssue(projectKey, testData, logger = null) {
    if (!this.baseUrl || !this.email || !this.apiToken) {
      if (logger) logger.warning('No Jira credentials');
      if (this.useMock) {
        return this.getMockIssue(null, testData);
      }
      throw new Error('Jira credentials not configured');
    }

    // Validate project access first
    if (logger) logger.data('Validating', `Project ${projectKey} access`);
    const projectValidation = await this.validateProjectAccess(projectKey);
    if (!projectValidation.valid) {
      const errorMsg = projectValidation.error.message;
      if (logger) logger.error('Project validation failed', errorMsg);
      if (this.useMock) {
        logger.warning('Using mock data due to project validation failure');
        return this.getMockIssue(null, testData);
      }
      throw new Error(errorMsg);
    }

    if (logger) logger.data('Project', `${projectKey} is accessible`);

    // Create standalone issue
    const issueData = {
      fields: {
        project: {
          key: projectKey
        },
        summary: `Automated Test Scripts - ${testData.testCount} tests (${testData.coveragePercentage}% coverage)`,
        description: {
          type: 'doc',
          version: 1,
          content: this.buildIssueDescription(testData)
        },
        issuetype: {
          name: 'Task' // Standalone issue, not subtask
        }
      }
    };

    if (logger) logger.apiCall('Jira', 'POST', `Create standalone issue in ${projectKey}`);
    const response = await axios.post(
      `${this.baseUrl}/rest/api/3/issue`,
      issueData,
      {
        auth: {
          username: this.email,
          password: this.apiToken
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    if (logger) logger.apiResponse('Jira', response.status, { issueKey: response.data.key });
    const issueKey = response.data.key;
    const issueUrl = `${this.baseUrl}/browse/${issueKey}`;

    if (logger) logger.success(`Standalone issue created: ${issueKey}`);

    return {
      issueKey,
      issueUrl,
      parentKey: null, // No parent for standalone issue
      summary: issueData.fields.summary,
      description: testData,
      isStandalone: true
    };
  }

  /**
   * Build issue description content (reusable for subtasks and standalone)
   */
  buildIssueDescription(testData) {
    return [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Automated Test Scripts Generated' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Test Coverage: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: `${testData.coveragePercentage}%` },
          { type: 'hardBreak' },
          { type: 'text', text: 'Test Count: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: `${testData.testCount}` },
          { type: 'hardBreak' },
          { type: 'text', text: 'Language: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: testData.language }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'AI Reasoning' }]
      },
      {
        type: 'codeBlock',
        attrs: { language: 'text' },
        content: [{ type: 'text', text: testData.aiReasoning }]
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Generated Test Code' }]
      },
      {
        type: 'codeBlock',
        attrs: { language: testData.language },
        content: [{ type: 'text', text: testData.testCode.substring(0, 10000) }] // Limit to 10k chars
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'CodeRabbit Review Status' }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: testData.codeRabbitStatus, marks: [{ type: 'strong' }] },
          { type: 'hardBreak' },
          { type: 'text', text: testData.codeRabbitInsights }
        ]
      }
    ];
  }

  /**
   * Create a test subtask in Jira
   * Falls back to standalone issue if parent doesn't exist
   */
  async createTestSubtask(parentKey, testData, logger = null) {
    if (!this.baseUrl || !this.email || !this.apiToken) {
      if (logger) logger.warning('No Jira credentials');
      if (this.useMock) {
        return this.getMockIssue(parentKey, testData);
      }
      throw new Error('Jira credentials not configured');
    }

    try {
      if (logger) logger.apiCall('Jira', 'GET', `Issue ${parentKey}`);
      // First, get the parent issue to find the project key
      const { issue: parentIssue, error: parentError } = await this.getIssue(parentKey);
      
      if (parentError) {
        // Handle different error types
        if (parentError.type === 'not_found') {
          // Parent doesn't exist - try creating standalone issue
          if (logger) {
            logger.warning(`Parent issue ${parentKey} not found`);
            logger.data('Falling back', `Creating standalone issue in project ${this.projectKey}`);
          }
          
          try {
            return await this.createStandaloneIssue(this.projectKey, testData, logger);
          } catch (standaloneError) {
            if (logger) logger.error('Failed to create standalone issue', standaloneError.message);
            if (this.useMock) {
              logger.warning('Using mock data as final fallback');
              return this.getMockIssue(parentKey, testData);
            }
            throw new Error(`Parent issue ${parentKey} not found and failed to create standalone issue: ${standaloneError.message}`);
          }
        } else if (parentError.type === 'no_permission') {
          // No permission to view parent - try standalone issue
          if (logger) {
            logger.warning(`No permission to view parent issue ${parentKey}`);
            logger.data('Falling back', `Creating standalone issue in project ${this.projectKey}`);
          }
          
          try {
            return await this.createStandaloneIssue(this.projectKey, testData, logger);
          } catch (standaloneError) {
            if (logger) logger.error('Failed to create standalone issue', standaloneError.message);
            if (this.useMock) {
              logger.warning('Using mock data as final fallback');
              return this.getMockIssue(parentKey, testData);
            }
            throw new Error(`No permission to view parent issue ${parentKey} and failed to create standalone issue: ${standaloneError.message}`);
          }
        } else {
          // Other errors (401, 500, etc.)
          if (logger) logger.error('Failed to get parent issue', parentError.message);
          if (this.useMock) {
            logger.warning('Using mock data due to error');
            return this.getMockIssue(parentKey, testData);
          }
          throw new Error(`Failed to get parent issue ${parentKey}: ${parentError.message}`);
        }
      }

      if (!parentIssue) {
        throw new Error(`Parent issue ${parentKey} not found`);
      }

      const projectKey = parentIssue.fields.project.key;
      if (logger) logger.data('Project Key', projectKey);
      
      // Validate project access
      const projectValidation = await this.validateProjectAccess(projectKey);
      if (!projectValidation.valid) {
        if (logger) logger.error('Project validation failed', projectValidation.error.message);
        if (this.useMock) {
          logger.warning('Using mock data due to project validation failure');
          return this.getMockIssue(parentKey, testData);
        }
        throw new Error(projectValidation.error.message);
      }
      
      // Create subtask
      const issueData = {
        fields: {
          project: {
            key: projectKey
          },
          parent: {
            key: parentKey
          },
          summary: `Automated Test Scripts - ${testData.testCount} tests (${testData.coveragePercentage}% coverage)`,
          description: {
            type: 'doc',
            version: 1,
            content: this.buildIssueDescription(testData)
          },
          issuetype: {
            name: 'Sub-task'
          }
        }
      };

      if (logger) logger.apiCall('Jira', 'POST', 'Create Issue');
      const response = await axios.post(
        `${this.baseUrl}/rest/api/3/issue`,
        issueData,
        {
          auth: {
            username: this.email,
            password: this.apiToken
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      if (logger) logger.apiResponse('Jira', response.status, { issueKey: response.data.key });
      const issueKey = response.data.key;
      const issueUrl = `${this.baseUrl}/browse/${issueKey}`;

      return {
        issueKey,
        issueUrl,
        parentKey,
        summary: issueData.fields.summary,
        description: testData,
        isStandalone: false
      };
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      if (logger) {
        if (status === 404) {
          logger.error('Jira API error', `Issue not found: ${errorData?.errorMessages?.join(', ') || error.message}`);
        } else if (status === 403) {
          logger.error('Jira API error', `Permission denied: ${errorData?.errorMessages?.join(', ') || error.message}`);
        } else if (status === 401) {
          logger.error('Jira API error', `Authentication failed: Check JIRA_EMAIL and JIRA_API_TOKEN`);
        } else {
          logger.error('Jira API error', errorData?.errorMessages?.join(', ') || error.message);
        }
      }
      
      // Only use mock if explicitly enabled
      if (this.useMock) {
        if (logger) logger.warning('Using mock data as fallback (JIRA_USE_MOCK=true)');
        return this.getMockIssue(parentKey, testData);
      }
      
      // Otherwise, throw real error
      const errorMessage = errorData?.errorMessages?.join(', ') || error.message;
      throw new Error(`Failed to create Jira issue: ${errorMessage}`);
    }
  }

  /**
   * Get issue details with proper error handling
   * @param {string} issueKey - Issue key
   * @param {string} email - Jira email (optional)
   * @param {string} apiToken - Jira API token (optional)
   * @returns {Object} { issue: {...}, error: null } or { issue: null, error: { type, message, status } }
   */
  async getIssue(issueKey, email = null, apiToken = null) {
    const userEmail = email || this.email;
    const userToken = apiToken || this.apiToken;

    if (!this.baseUrl || !userEmail || !userToken) {
      return { issue: null, error: { type: 'no_credentials', message: 'Jira credentials not configured' } };
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}`,
        {
          auth: {
            username: userEmail,
            password: userToken
          },
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      return { issue: response.data, error: null };
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      if (status === 404) {
        return { 
          issue: null, 
          error: { 
            type: 'not_found', 
            message: `Issue ${issueKey} not found`,
            status: 404,
            details: errorData
          } 
        };
      } else if (status === 403) {
        return { 
          issue: null, 
          error: { 
            type: 'no_permission', 
            message: `No permission to view issue ${issueKey}. Check Jira project permissions.`,
            status: 403,
            details: errorData
          } 
        };
      } else if (status === 401) {
        return { 
          issue: null, 
          error: { 
            type: 'unauthorized', 
            message: 'Invalid Jira credentials. Check JIRA_EMAIL and JIRA_API_TOKEN.',
            status: 401,
            details: errorData
          } 
        };
      } else {
        return { 
          issue: null, 
          error: { 
            type: 'unknown', 
            message: error.message || 'Failed to get issue',
            status: status || 500,
            details: errorData
          } 
        };
      }
    }
  }

  /**
   * Validate project access and get project info
   * @param {string} projectKey - Project key
   * @param {string} email - Jira email (optional)
   * @param {string} apiToken - Jira API token (optional)
   * @returns {Object} { valid: true, project: {...} } or { valid: false, error: {...} }
   */
  async validateProjectAccess(projectKey, email = null, apiToken = null) {
    const userEmail = email || this.email;
    const userToken = apiToken || this.apiToken;

    if (!this.baseUrl || !userEmail || !userToken) {
      return { valid: false, error: { type: 'no_credentials', message: 'Jira credentials not configured' } };
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/rest/api/3/project/${projectKey}`,
        {
          auth: {
            username: userEmail,
            password: userToken
          },
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      return { valid: true, project: response.data };
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      if (status === 404) {
        return { 
          valid: false, 
          error: { 
            type: 'project_not_found', 
            message: `Project ${projectKey} not found. Check JIRA_PROJECT_KEY in .env`,
            status: 404,
            details: errorData
          } 
        };
      } else if (status === 403) {
        return { 
          valid: false, 
          error: { 
            type: 'no_permission', 
            message: `No permission to access project ${projectKey}. Check Jira project permissions.`,
            status: 403,
            details: errorData
          } 
        };
      } else {
        return { 
          valid: false, 
          error: { 
            type: 'unknown', 
            message: error.message || 'Failed to validate project',
            status: status || 500,
            details: errorData
          } 
        };
      }
    }
  }

  /**
   * List all projects accessible to the user
   * @param {string} email - Jira email (optional, uses instance default if not provided)
   * @param {string} apiToken - Jira API token (optional, uses instance default if not provided)
   * @returns {Object} { projects: [...], error: null } or { projects: [], error: {...} }
   */
  async listProjects(email = null, apiToken = null) {
    const userEmail = email || this.email;
    const userToken = apiToken || this.apiToken;

    if (!this.baseUrl || !userEmail || !userToken) {
      return { projects: [], error: { type: 'no_credentials', message: 'Jira credentials not configured' } };
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/rest/api/3/project`,
        {
          auth: {
            username: userEmail,
            password: userToken
          },
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      return { projects: response.data || [], error: null };
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      return { 
        projects: [], 
        error: { 
          type: 'api_error', 
          message: errorData?.errorMessages?.join(', ') || error.message,
          status: status || 500,
          details: errorData
        } 
      };
    }
  }

  /**
   * Create a new Jira project
   * @param {string} projectKey - Project key (e.g., "TEST")
   * @param {string} projectName - Project name
   * @param {string} projectTypeKey - Project type ("business" or "software", default: "software")
   * @param {string} leadAccountId - Account ID of the project lead (optional, uses email if not provided)
   * @param {string} email - Jira email (optional)
   * @param {string} apiToken - Jira API token (optional)
   * @returns {Object} { project: {...}, error: null } or { project: null, error: {...} }
   */
  async createProject(projectKey, projectName, projectTypeKey = 'software', leadAccountId = null, email = null, apiToken = null) {
    const userEmail = email || this.email;
    const userToken = apiToken || this.apiToken;

    if (!this.baseUrl || !userEmail || !userToken) {
      return { project: null, error: { type: 'no_credentials', message: 'Jira credentials not configured' } };
    }

    // If leadAccountId is not provided, try to get it from the user's account
    if (!leadAccountId) {
      try {
        // Get current user's account ID
        const userResponse = await axios.get(
          `${this.baseUrl}/rest/api/3/myself`,
          {
            auth: {
              username: userEmail,
              password: userToken
            },
            headers: {
              'Accept': 'application/json'
            }
          }
        );
        leadAccountId = userResponse.data.accountId;
      } catch (error) {
        // If we can't get account ID, we'll try without it (some Jira instances allow this)
        console.warn('Could not get account ID, proceeding without leadAccountId');
      }
    }

    try {
      const projectData = {
        key: projectKey,
        name: projectName,
        projectTypeKey: projectTypeKey,
        ...(leadAccountId && { leadAccountId: leadAccountId })
      };

      const response = await axios.post(
        `${this.baseUrl}/rest/api/3/project`,
        projectData,
        {
          auth: {
            username: userEmail,
            password: userToken
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      return { project: response.data, error: null };
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      return { 
        project: null, 
        error: { 
          type: 'api_error', 
          message: errorData?.errorMessages?.join(', ') || error.message,
          status: status || 500,
          details: errorData
        } 
      };
    }
  }

  /**
   * List issues in a project (for finding parent tickets)
   * @param {string} projectKey - Project key (e.g., "TEST")
   * @param {number} maxResults - Maximum number of issues to return (default: 50)
   * @param {string} email - Jira email (optional)
   * @param {string} apiToken - Jira API token (optional)
   * @returns {Object} { issues: [...], error: null } or { issues: [], error: {...} }
   */
  async listProjectIssues(projectKey, maxResults = 50, email = null, apiToken = null) {
    const userEmail = email || this.email;
    const userToken = apiToken || this.apiToken;

    if (!this.baseUrl || !userEmail || !userToken) {
      return { issues: [], error: { type: 'no_credentials', message: 'Jira credentials not configured' } };
    }

    try {
      // Use JQL to search for issues in the project
      // Using the updated /rest/api/3/search/jql endpoint (migrated from /rest/api/3/search)
      const jql = `project = ${projectKey} ORDER BY updated DESC`;
      const response = await axios.post(
        `${this.baseUrl}/rest/api/3/search/jql`,
        {
          jql: jql,
          maxResults: maxResults,
          fields: ['summary', 'status', 'issuetype', 'created', 'updated', 'assignee']
        },
        {
          auth: {
            username: userEmail,
            password: userToken
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      return { issues: response.data?.issues || [], error: null };
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      return { 
        issues: [], 
        error: { 
          type: 'api_error', 
          message: errorData?.errorMessages?.join(', ') || error.message,
          status: status || 500,
          details: errorData
        } 
      };
    }
  }

  /**
   * Create a parent issue (Task or Story) in a project
   * @param {string} projectKey - Project key
   * @param {string} summary - Issue summary
   * @param {string} description - Issue description (optional)
   * @param {string} issueType - Issue type (default: "Task")
   * @param {string} email - Jira email (optional)
   * @param {string} apiToken - Jira API token (optional)
   * @returns {Object} { issue: {...}, error: null } or { issue: null, error: {...} }
   */
  async createIssue(projectKey, summary, description = '', issueType = 'Task', email = null, apiToken = null) {
    const userEmail = email || this.email;
    const userToken = apiToken || this.apiToken;

    if (!this.baseUrl || !userEmail || !userToken) {
      return { issue: null, error: { type: 'no_credentials', message: 'Jira credentials not configured' } };
    }

    // Validate project access first (but don't fail if validation fails - try to create anyway)
    const projectValidation = await this.validateProjectAccess(projectKey, userEmail, userToken);
    if (!projectValidation.valid && projectValidation.error.type === 'project_not_found') {
      // Project not found - return error but allow caller to try direct creation
      return { issue: null, error: projectValidation.error };
    } else if (!projectValidation.valid) {
      // Other errors (permission, etc.) - return error
      return { issue: null, error: projectValidation.error };
    }

    // Project is valid, proceed with creation
    return await this.createIssueDirectly(projectKey, summary, description, issueType, userEmail, userToken);
  }

  /**
   * Create issue directly without validation (internal method)
   * @param {string} projectKey - Project key
   * @param {string} summary - Issue summary
   * @param {string} description - Issue description (optional)
   * @param {string} issueType - Issue type (default: "Task")
   * @param {string} email - Jira email
   * @param {string} apiToken - Jira API token
   * @returns {Object} { issue: {...}, error: null } or { issue: null, error: {...} }
   */
  async createIssueDirectly(projectKey, summary, description = '', issueType = 'Task', email = null, apiToken = null) {
    const userEmail = email || this.email;
    const userToken = apiToken || this.apiToken;

    if (!this.baseUrl || !userEmail || !userToken) {
      return { issue: null, error: { type: 'no_credentials', message: 'Jira credentials not configured' } };
    }

    try {
      const issueData = {
        fields: {
          project: {
            key: projectKey
          },
          summary: summary,
          issuetype: {
            name: issueType
          }
        }
      };

      // Add description if provided
      if (description) {
        issueData.fields.description = {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: description }]
            }
          ]
        };
      }

      const response = await axios.post(
        `${this.baseUrl}/rest/api/3/issue`,
        issueData,
        {
          auth: {
            username: userEmail,
            password: userToken
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      return { issue: response.data, error: null };
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      return { 
        issue: null, 
        error: { 
          type: 'api_error', 
          message: errorData?.errorMessages?.join(', ') || error.message,
          status: status || 500,
          details: errorData
        } 
      };
    }
  }

  /**
   * Validate that a ticket exists and user has access
   * @param {string} issueKey - Issue key (e.g., "TEST-123")
   * @param {string} email - Jira email (optional)
   * @param {string} apiToken - Jira API token (optional)
   * @returns {Object} { valid: true, issue: {...} } or { valid: false, error: {...} }
   */
  async validateIssue(issueKey, email = null, apiToken = null) {
    const userEmail = email || this.email;
    const userToken = apiToken || this.apiToken;

    if (!this.baseUrl || !userEmail || !userToken) {
      return { valid: false, error: { type: 'no_credentials', message: 'Jira credentials not configured' } };
    }

    const { issue, error } = await this.getIssue(issueKey, userEmail, userToken);
    
    if (error) {
      return { valid: false, error };
    }

    return { 
      valid: true, 
      issue: {
        key: issue.key,
        summary: issue.fields?.summary || '',
        status: issue.fields?.status?.name || 'Unknown',
        project: issue.fields?.project?.key || '',
        projectName: issue.fields?.project?.name || '',
        issueType: issue.fields?.issuetype?.name || 'Unknown'
      }
    };
  }

  /**
   * Extract PR URL from Jira issue
   */
  extractPRUrl(issue) {
    if (!issue || !issue.fields) return null;
    
    // Check description
    const description = issue.fields?.description || '';
    if (typeof description === 'string') {
      const match = description.match(/github\.com\/([^\/\s]+)\/([^\/\s]+)\/pull\/(\d+)/i);
      if (match) {
        return `https://github.com/${match[1]}/${match[2]}/pull/${match[3]}`;
      }
    }

    // Check if description is structured (Atlassian Document Format)
    if (description && typeof description === 'object' && description.content) {
      const text = JSON.stringify(description);
      const match = text.match(/github\.com\/([^\/\s]+)\/([^\/\s]+)\/pull\/(\d+)/i);
      if (match) {
        return `https://github.com/${match[1]}/${match[2]}/pull/${match[3]}`;
      }
    }

    // Check comments (if available)
    if (issue.fields?.comment?.comments) {
      for (const comment of issue.fields.comment.comments) {
        const commentText = comment.body || '';
        const match = commentText.match(/github\.com\/([^\/\s]+)\/([^\/\s]+)\/pull\/(\d+)/i);
        if (match) {
          return `https://github.com/${match[1]}/${match[2]}/pull/${match[3]}`;
        }
      }
    }

    return null;
  }

  /**
   * Mock issue fallback (only used when JIRA_USE_MOCK=true)
   * WARNING: Creates fake issue keys that don't exist in Jira
   */
  getMockIssue(parentKey, testData) {
    const issueKey = `${this.projectKey}-${Math.floor(Math.random() * 1000)}`;
    const baseUrl = this.baseUrl || 'https://drlittlekids.atlassian.net';
    
    console.warn(`⚠️  MOCK MODE: Created fake Jira issue ${issueKey}. This ticket does NOT exist in Jira!`);
    console.warn(`⚠️  Set JIRA_USE_MOCK=false to create real tickets.`);
    
    return {
      issueKey,
      issueUrl: `${baseUrl}/browse/${issueKey}`,
      parentKey,
      summary: `Automated Test Scripts - ${testData.testCount} tests`,
      description: this.formatJiraDescription(testData),
      isMock: true // Flag to indicate this is mock data
    };
  }

  /**
   * Format test data into Jira description (for mock/fallback)
   */
  formatJiraDescription(testData) {
    return `
h2. Automated Test Scripts Generated

*Test Coverage:* ${testData.coveragePercentage}%
*Test Count:* ${testData.testCount}
*Language:* ${testData.language}

h3. AI Reasoning
{code}
${testData.aiReasoning}
{code}

h3. Generated Test Code
{code:${testData.language}}
${testData.testCode.substring(0, 500)}...
{code}

h3. CodeRabbit Review Status
${testData.codeRabbitStatus}

${testData.codeRabbitInsights}
    `.trim();
  }

  /**
   * Update Jira ticket status (transition)
   * @param {string} issueKey - Jira issue key
   * @param {string} statusName - Target status name (e.g., "In Progress", "Done", "To Do")
   * @param {Object} logger - Optional logger
   * @returns {Promise<Object>} { success: boolean, status: string, error: string }
   */
  async updateTicketStatus(issueKey, statusName, logger = null) {
    if (!this.baseUrl || !this.email || !this.apiToken) {
      if (logger) logger.warning('No Jira credentials');
      if (this.useMock) {
        return { success: true, status: statusName, mock: true };
      }
      throw new Error('Jira credentials not configured');
    }

    try {
      // First, get available transitions for this issue
      if (logger) logger.apiCall('Jira', 'GET', `Get transitions for ${issueKey}`);
      const transitionsResponse = await axios.get(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
        {
          auth: {
            username: this.email,
            password: this.apiToken
          },
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      // Find the transition ID that matches the target status
      const transitions = transitionsResponse.data.transitions || [];
      const targetTransition = transitions.find(t => 
        t.to?.name?.toLowerCase() === statusName.toLowerCase() ||
        t.name?.toLowerCase() === statusName.toLowerCase()
      );

      if (!targetTransition) {
        const availableStatuses = transitions.map(t => t.to?.name || t.name).join(', ');
        if (logger) logger.warning(`Status "${statusName}" not available. Available: ${availableStatuses}`);
        return { 
          success: false, 
          error: `Status "${statusName}" not available. Available transitions: ${availableStatuses}` 
        };
      }

      // Execute the transition
      if (logger) logger.apiCall('Jira', 'POST', `Transition ${issueKey} to ${statusName}`);
      await axios.post(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
        {
          transition: {
            id: targetTransition.id
          }
        },
        {
          auth: {
            username: this.email,
            password: this.apiToken
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      if (logger) logger.success(`Ticket ${issueKey} status updated to: ${statusName}`);
      return { success: true, status: statusName, transitionId: targetTransition.id };
    } catch (error) {
      if (logger) logger.error('Failed to update ticket status', error.message);
      if (this.useMock) {
        return { success: true, status: statusName, mock: true };
      }
      return { 
        success: false, 
        error: error.response?.data?.errorMessages?.join(', ') || error.message 
      };
    }
  }

  /**
   * Create a new Jira ticket for critical issues or bugs
   * @param {string} projectKey - Jira project key
   * @param {Object} issueData - Issue data (summary, description, issueType, priority, etc.)
   * @param {Object} logger - Optional logger
   * @returns {Promise<Object>} { issueKey, issueUrl, error }
   */
  async createNewTicket(projectKey, issueData, logger = null) {
    if (!this.baseUrl || !this.email || !this.apiToken) {
      if (logger) logger.warning('No Jira credentials');
      if (this.useMock) {
        const mockKey = `${projectKey}-${Math.floor(Math.random() * 1000)}`;
        return {
          issueKey: mockKey,
          issueUrl: `${this.baseUrl || 'https://example.atlassian.net'}/browse/${mockKey}`,
          mock: true
        };
      }
      throw new Error('Jira credentials not configured');
    }

    try {
      // Validate project access
      if (logger) logger.data('Validating', `Project ${projectKey} access`);
      const projectValidation = await this.validateProjectAccess(projectKey);
      if (!projectValidation.valid) {
        const errorMsg = projectValidation.error.message;
        if (logger) logger.error('Project validation failed', errorMsg);
        if (this.useMock) {
          logger.warning('Using mock data due to project validation failure');
          const mockKey = `${projectKey}-${Math.floor(Math.random() * 1000)}`;
          return {
            issueKey: mockKey,
            issueUrl: `${this.baseUrl}/browse/${mockKey}`,
            mock: true
          };
        }
        throw new Error(errorMsg);
      }

      // Build issue data
      const jiraIssueData = {
        fields: {
          project: {
            key: projectKey
          },
          summary: issueData.summary || 'New Issue',
          description: {
            type: 'doc',
            version: 1,
            content: issueData.description ? [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: issueData.description }]
              }
            ] : []
          },
          issuetype: {
            name: issueData.issueType || 'Bug'
          }
        }
      };

      // Add priority if provided
      if (issueData.priority) {
        jiraIssueData.fields.priority = { name: issueData.priority };
      }

      // Add labels if provided
      if (issueData.labels && Array.isArray(issueData.labels)) {
        jiraIssueData.fields.labels = issueData.labels;
      }

      // Add custom fields if provided
      if (issueData.customFields) {
        Object.assign(jiraIssueData.fields, issueData.customFields);
      }

      if (logger) logger.apiCall('Jira', 'POST', `Create new ticket in ${projectKey}`);
      const response = await axios.post(
        `${this.baseUrl}/rest/api/3/issue`,
        jiraIssueData,
        {
          auth: {
            username: this.email,
            password: this.apiToken
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      const issueKey = response.data.key;
      const issueUrl = `${this.baseUrl}/browse/${issueKey}`;

      if (logger) logger.success(`New ticket created: ${issueKey}`);
      return { issueKey, issueUrl };
    } catch (error) {
      if (logger) logger.error('Failed to create new ticket', error.message);
      if (this.useMock) {
        const mockKey = `${projectKey}-${Math.floor(Math.random() * 1000)}`;
        return {
          issueKey: mockKey,
          issueUrl: `${this.baseUrl || 'https://example.atlassian.net'}/browse/${mockKey}`,
          mock: true
        };
      }
      throw error;
    }
  }
}
