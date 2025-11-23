import express from 'express';
import { JiraService } from '../services/JiraService.js';

const router = express.Router();

/**
 * POST /api/jira/connect - Validate Jira credentials
 * Body: { email, apiToken }
 */
router.post('/connect', async (req, res) => {
  try {
    const { email, apiToken } = req.body;

    if (!email || !apiToken) {
      return res.status(400).json({ error: 'Email and API token are required' });
    }

    const jiraService = new JiraService();
    const result = await jiraService.listProjects(email, apiToken);

    if (result.error) {
      return res.status(result.error.status || 500).json({ 
        error: result.error.message,
        type: result.error.type
      });
    }

    res.json({ 
      success: true,
      projects: result.projects.map(p => ({
        key: p.key,
        name: p.name,
        id: p.id,
        projectTypeKey: p.projectTypeKey
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jira/projects - List all accessible projects
 * Query: ?email=...&apiToken=... (optional, uses env defaults if not provided)
 */
router.get('/projects', async (req, res) => {
  try {
    const { email, apiToken } = req.query;
    const jiraService = new JiraService();
    const result = await jiraService.listProjects(email, apiToken);

    if (result.error) {
      return res.status(result.error.status || 500).json({ 
        error: result.error.message,
        type: result.error.type
      });
    }

    res.json({ 
      projects: result.projects.map(p => ({
        key: p.key,
        name: p.name,
        id: p.id,
        projectTypeKey: p.projectTypeKey
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jira/projects/:projectKey/issues - List issues in a project
 * Query: ?email=...&apiToken=...&maxResults=50
 */
router.get('/projects/:projectKey/issues', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const { email, apiToken, maxResults = 50 } = req.query;
    
    const jiraService = new JiraService();
    const result = await jiraService.listProjectIssues(
      projectKey, 
      parseInt(maxResults),
      email,
      apiToken
    );

    if (result.error) {
      return res.status(result.error.status || 500).json({ 
        error: result.error.message,
        type: result.error.type
      });
    }

    res.json({ 
      issues: result.issues.map(issue => ({
        key: issue.key,
        summary: issue.fields?.summary || '',
        status: issue.fields?.status?.name || 'Unknown',
        issueType: issue.fields?.issuetype?.name || 'Unknown',
        created: issue.fields?.created || '',
        updated: issue.fields?.updated || '',
        assignee: issue.fields?.assignee?.displayName || 'Unassigned'
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/jira/projects/:projectKey/issues - Create a new issue
 * Body: { summary, description, issueType, email, apiToken }
 */
router.post('/projects/:projectKey/issues', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const { summary, description = '', issueType = 'Task', email, apiToken } = req.body;

    if (!summary) {
      return res.status(400).json({ error: 'Summary is required' });
    }

    const jiraService = new JiraService();
    const result = await jiraService.createIssue(
      projectKey,
      summary,
      description,
      issueType,
      email,
      apiToken
    );

    if (result.error) {
      return res.status(result.error.status || 500).json({ 
        error: result.error.message,
        type: result.error.type
      });
    }

    res.json({ 
      issue: {
        key: result.issue.key,
        summary: result.issue.fields?.summary || summary,
        url: `${jiraService.baseUrl}/browse/${result.issue.key}`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/jira/projects - Create a new project
 * Body: { projectKey, projectName, projectTypeKey, email, apiToken }
 */
router.post('/projects', async (req, res) => {
  try {
    const { projectKey, projectName, projectTypeKey = 'software', email, apiToken } = req.body;

    if (!projectKey || !projectName) {
      return res.status(400).json({ error: 'Project key and name are required' });
    }

    const jiraService = new JiraService();
    const result = await jiraService.createProject(
      projectKey,
      projectName,
      projectTypeKey,
      null, // leadAccountId - will be auto-detected
      email,
      apiToken
    );

    if (result.error) {
      return res.status(result.error.status || 500).json({ 
        error: result.error.message,
        type: result.error.type,
        details: result.error.details
      });
    }

    res.status(201).json({ 
      project: {
        key: result.project.key,
        name: result.project.name,
        id: result.project.id,
        projectTypeKey: result.project.projectTypeKey,
        url: `${jiraService.baseUrl}/browse/${result.project.key}`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/jira/issues/:issueKey/validate - Validate that an issue exists and is accessible
 * Query: ?email=...&apiToken=...
 */
router.get('/issues/:issueKey/validate', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { email, apiToken } = req.query;

    const jiraService = new JiraService();
    const result = await jiraService.validateIssue(issueKey, email, apiToken);

    if (!result.valid) {
      return res.status(result.error.status || 500).json({ 
        valid: false,
        error: result.error.message,
        type: result.error.type
      });
    }

    res.json({ 
      valid: true,
      issue: result.issue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

