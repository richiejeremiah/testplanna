/**
 * GitHubService - Handles GitHub API interactions
 */
import axios from 'axios';

export class GitHubService {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.baseUrl = 'https://api.github.com';
  }

  /**
   * Find associated PR from Jira ticket
   */
  async findAssociatedPR(jiraTicket) {
    // Try to extract PR URL from ticket description or comments
    if (jiraTicket.fields?.description) {
      const desc = typeof jiraTicket.fields.description === 'string' 
        ? jiraTicket.fields.description 
        : jiraTicket.fields.description.content?.map(c => c.text || '').join('') || '';
      
      const prMatch = desc.match(/github\.com\/([^\/\s]+)\/([^\/\s]+)\/pull\/(\d+)/i);
      if (prMatch) {
        return `https://github.com/${prMatch[1]}/${prMatch[2]}/pull/${prMatch[3]}`;
      }
    }
    return null;
  }

  /**
   * Detect if URL is PR or repository
   */
  detectPRorRepo(url) {
    if (!url) return null;
    
    const prMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/i);
    if (prMatch) {
      return {
        isPR: true,
        owner: prMatch[1],
        repo: prMatch[2],
        prNumber: parseInt(prMatch[3])
      };
    }
    
    const repoMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/i);
    if (repoMatch) {
      return {
        isPR: false,
        owner: repoMatch[1],
        repo: repoMatch[2],
        branch: repoMatch[3] || 'main'
      };
    }
    
    return null;
  }

  /**
   * Get code context from PR or repository
   */
  async getCodeContext(prUrl, logger = null) {
    const detection = this.detectPRorRepo(prUrl);
    
    if (!detection) {
      throw new Error('Invalid GitHub URL');
    }

    if (detection.isPR) {
      return await this.getPRContext(detection.owner, detection.repo, detection.prNumber, logger);
    } else {
      return await this.getRepoContext(detection.owner, detection.repo, detection.branch, logger);
    }
  }

  /**
   * Get PR context
   */
  async getPRContext(owner, repo, prNumber, logger = null) {
    try {
      const headers = this.token ? { Authorization: `token ${this.token}` } : {};
      
      // Get PR details
      const prResponse = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`,
        { headers }
      );
      const pr = prResponse.data;

      // Get PR files
      const filesResponse = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/files`,
        { headers }
      );
      const files = filesResponse.data;

      // Get diff
      const diffResponse = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`,
        { 
          headers: { ...headers, Accept: 'application/vnd.github.v3.diff' }
        }
      );

      return {
        prUrl: pr.html_url,
        prNumber: pr.number,
        branch: pr.head.ref,
        commitSha: pr.head.sha,
        diff: diffResponse.data,
        files: files.map(f => ({
          filename: f.filename,
          additions: f.additions,
          deletions: f.deletions
        })),
        isPR: true,
        repoStructure: null
      };
    } catch (error) {
      // If PR not found (404), fall back to repository mode
      if (error.response?.status === 404) {
        if (logger) logger.warning(`PR #${prNumber} not found, falling back to repository mode`);
        return await this.getRepoContext(owner, repo, 'main', logger);
      }
      if (logger) logger.error('Failed to fetch PR context', error.message);
      throw error;
    }
  }

  /**
   * Get repository context (latest commit)
   */
  async getRepoContext(owner, repo, branch, logger = null) {
    try {
      const headers = this.token ? { Authorization: `token ${this.token}` } : {};
      
      // First, get repository info to find default branch
      let defaultBranch = branch;
      let repoInfo = null;
      try {
        const repoResponse = await axios.get(
          `${this.baseUrl}/repos/${owner}/${repo}`,
          { headers }
        );
        repoInfo = repoResponse.data;
        defaultBranch = repoInfo.default_branch || branch;
        if (logger && defaultBranch !== branch) {
          logger.data('Using default branch', `${defaultBranch} (instead of ${branch})`);
        }
      } catch (repoError) {
        if (logger) logger.warning('Could not fetch repo info, will try to list branches');
      }
      
      // If we couldn't get repo info, try to list branches to find what exists
      let branchesToTry = [defaultBranch, branch, 'master', 'main'];
      if (!repoInfo) {
        try {
          const branchesResponse = await axios.get(
            `${this.baseUrl}/repos/${owner}/${repo}/branches`,
            { headers }
          );
          const availableBranches = branchesResponse.data.map(b => b.name);
          if (availableBranches.length > 0) {
            branchesToTry = [...new Set([...availableBranches, ...branchesToTry])];
            if (logger) logger.data('Found branches', availableBranches.join(', '));
          }
        } catch (branchesError) {
          if (logger) logger.warning('Could not list branches, trying common names');
        }
      }
      
      // Try to get branch info
      let branchData = null;
      for (const branchName of branchesToTry) {
        if (!branchName) continue; // Skip empty branch names
        try {
          const branchResponse = await axios.get(
            `${this.baseUrl}/repos/${owner}/${repo}/branches/${branchName}`,
            { headers }
          );
          branchData = branchResponse.data;
          if (logger && branchName !== branch) {
            logger.data('Found branch', branchName);
          }
          break;
        } catch (branchError) {
          // Try next branch
          continue;
        }
      }
      
      if (!branchData) {
        // If repository is empty or doesn't exist, return minimal context
        if (logger) logger.warning('Could not find any branch, repository may be empty or private');
        return {
          prUrl: `https://github.com/${owner}/${repo}`,
          prNumber: null,
          branch: branch || 'unknown',
          commitSha: null,
          diff: '',
          files: [],
          isPR: false,
          repoStructure: null
        };
      }

      // Get latest commit
      const commitResponse = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/commits/${branchData.commit.sha}`,
        { headers }
      );
      const commit = commitResponse.data;

      // Get commit files
      const commitFilesResponse = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/commits/${branchData.commit.sha}`,
        { headers }
      );
      const files = commitFilesResponse.data.files || [];

      return {
        prUrl: `https://github.com/${owner}/${repo}`,
        prNumber: null,
        branch: branch,
        commitSha: branchData.commit.sha,
        diff: '', // No diff for repo view
        files: files.map(f => ({
          filename: f.filename,
          additions: f.additions || 0,
          deletions: f.deletions || 0
        })),
        isPR: false,
        repoStructure: null // Will be fetched separately if needed
      };
    } catch (error) {
      if (logger) logger.error('Failed to fetch repo context', error.message);
      throw error;
    }
  }

  /**
   * Get full repository structure organized by category
   */
  async getFullRepoStructure(owner, repo, branch, logger = null) {
    try {
      const headers = this.token ? { Authorization: `token ${this.token}` } : {};
      
      // Get repository tree
      const treeResponse = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers }
      );
      const tree = treeResponse.data.tree || [];

      // Organize by category
      const categories = {
        frontend: { files: [], count: 0 },
        backend: { files: [], count: 0 },
        devops: { files: [], count: 0 },
        other: { files: [], count: 0 }
      };

      tree.forEach(item => {
        if (item.type === 'blob' && item.path) {
          const ext = item.path.split('.').pop()?.toLowerCase();
          const path = item.path.toLowerCase();

          if (path.includes('frontend') || path.includes('client') || path.includes('src/components') || 
              ['jsx', 'tsx', 'vue', 'svelte'].includes(ext)) {
            categories.frontend.files.push(item.path);
            categories.frontend.count++;
          } else if (path.includes('backend') || path.includes('server') || path.includes('api') ||
                     ['py', 'java', 'go', 'rb', 'php'].includes(ext)) {
            categories.backend.files.push(item.path);
            categories.backend.count++;
          } else if (path.includes('docker') || path.includes('kubernetes') || path.includes('ci') ||
                     ['yml', 'yaml', 'dockerfile'].includes(ext)) {
            categories.devops.files.push(item.path);
            categories.devops.count++;
          } else {
            categories.other.files.push(item.path);
            categories.other.count++;
          }
        }
      });

      return {
        categories,
        totalFiles: tree.length
      };
    } catch (error) {
      if (logger) logger.error('Failed to fetch repo structure', error.message);
      return null;
    }
  }
}

