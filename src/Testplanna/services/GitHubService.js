import axios from 'axios';

/**
 * GitHubService - Fetches PR and code context from GitHub
 */
export class GitHubService {
  constructor() {
    this.baseUrl = 'https://api.github.com';
    this.token = process.env.GITHUB_TOKEN;
  }

  /**
   * Detect if URL is a PR or repository
   * Returns: { isPR: boolean, owner: string, repo: string, prNumber?: number, branch?: string }
   */
  detectPRorRepo(prUrl) {
    const prMatch = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    const repoMatch = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/);
    
    if (prMatch) {
      return {
        isPR: true,
        owner: prMatch[1],
        repo: prMatch[2],
        prNumber: parseInt(prMatch[3])
      };
    } else if (repoMatch) {
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
   * Get code context from GitHub PR or repository
   * Supports:
   * - PR URL: https://github.com/owner/repo/pull/123
   * - Repo URL: https://github.com/owner/repo (uses latest commit from main branch)
   * Returns context with isPR flag for downstream processing
   */
  async getCodeContext(prUrl, logger = null) {
    if (!this.token) {
      if (logger) logger.warning('No GitHub token, using mock data');
      // Fallback to mock if no token
      return this.getMockContext(prUrl);
    }

    try {
      // Detect if PR or repo
      const detection = this.detectPRorRepo(prUrl);
      if (!detection) {
        throw new Error('Invalid GitHub URL format. Expected PR or repository URL');
      }

      if (detection.isPR) {
        if (logger) {
          logger.apiCall('GitHub', 'GET', `PR #${detection.prNumber}`);
          logger.data('Type', 'Pull Request');
        }
        const context = await this.getPRContext([null, detection.owner, detection.repo, detection.prNumber.toString()], logger);
        return { ...context, isPR: true, prNumber: detection.prNumber };
      } else {
        if (logger) {
          logger.apiCall('GitHub', 'GET', `Repo: ${detection.owner}/${detection.repo}`);
          logger.data('Type', 'Repository');
          logger.data('Branch', detection.branch);
        }
        const context = await this.getRepoContext([null, detection.owner, detection.repo, detection.branch], logger);
        return { ...context, isPR: false, branch: detection.branch };
      }
    } catch (error) {
      if (logger) {
        logger.error('GitHub API error', error);
        logger.warning('Falling back to mock data');
      } else {
        console.error('GitHub API error:', error.response?.data || error.message);
      }
      // Fallback to mock on error
      return this.getMockContext(prUrl);
    }
  }

  /**
   * Get code context from a PR
   */
  async getPRContext([, owner, repo, prNumber], logger = null) {
    if (logger) logger.data('Owner', owner);
    if (logger) logger.data('Repo', repo);
    if (logger) logger.data('PR Number', prNumber);

    // Get PR details
    const prResponse = await axios.get(
      `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (logger) logger.apiResponse('GitHub', prResponse.status);
    const pr = prResponse.data;

    // Get PR files
    const filesResponse = await axios.get(
      `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    const files = filesResponse.data;

    // Get diff for each file
    const fileDiffs = await Promise.all(
      files.map(async (file) => {
        try {
          // Get file content from PR
          const contentResponse = await axios.get(
            file.contents_url.replace('{+path}', file.filename),
            {
              headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );
          return {
            filename: file.filename,
            additions: file.additions,
            deletions: file.deletions,
            patch: file.patch || ''
          };
        } catch (error) {
          return {
            filename: file.filename,
            additions: file.additions,
            deletions: file.deletions,
            patch: ''
          };
        }
      })
    );

    // Combine all patches into one diff
    const combinedDiff = fileDiffs
      .map(f => f.patch)
      .filter(Boolean)
      .join('\n\n');

    return {
      prUrl: pr.html_url,
      prNumber: parseInt(prNumber),
      branch: pr.head.ref,
      commitSha: pr.head.sha,
      diff: combinedDiff || this.generateDiffFromFiles(fileDiffs),
      files: fileDiffs.map(f => ({
        filename: f.filename,
        additions: f.additions,
        deletions: f.deletions
      }))
    };
  }

  /**
   * Get code context from repository (latest commit from branch)
   */
  async getRepoContext([, owner, repo, branch = 'main'], logger = null) {
    try {
      if (logger) logger.data('Owner', owner);
      if (logger) logger.data('Repo', repo);
      if (logger) logger.data('Branch', branch || 'main');
      // Try 'main' first, fallback to 'master'
      let defaultBranch = branch;
      if (branch === 'main' || !branch) {
        try {
          const repoInfo = await axios.get(
            `${this.baseUrl}/repos/${owner}/${repo}`,
            {
              headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );
          defaultBranch = repoInfo.data.default_branch || 'main';
        } catch (e) {
          defaultBranch = 'main';
        }
      }

      // Get latest commit from branch
      const commitResponse = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/commits/${defaultBranch}`,
        {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      const commit = commitResponse.data;
      const commitSha = commit.sha;

      // Get files changed in this commit
      const commitFilesResponse = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/commits/${commitSha}`,
        {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      const commitFiles = commitFilesResponse.data.files || [];

      // Build diff from commit files
      const fileDiffs = commitFiles.map(file => ({
        filename: file.filename,
        additions: file.additions || 0,
        deletions: file.deletions || 0,
        patch: file.patch || ''
      }));

      // Combine patches
      const combinedDiff = fileDiffs
        .map(f => f.patch)
        .filter(Boolean)
        .join('\n\n') || this.generateDiffFromFiles(fileDiffs);

      return {
        prUrl: `https://github.com/${owner}/${repo}/tree/${defaultBranch}`,
        prNumber: null,
        branch: defaultBranch,
        commitSha: commitSha,
        diff: combinedDiff,
        files: fileDiffs.map(f => ({
          filename: f.filename,
          additions: f.additions,
          deletions: f.deletions
        }))
      };
    } catch (error) {
      console.error('Error fetching repo context:', error.message);
      throw error;
    }
  }

  /**
   * Generate a simple diff from file info
   */
  generateDiffFromFiles(files) {
    return files.map(f => 
      `diff --git a/${f.filename} b/${f.filename}\n+${f.filename} (${f.additions} additions, ${f.deletions} deletions)`
    ).join('\n');
  }

  /**
   * Find GitHub PR associated with Jira ticket
   * Tries multiple methods to discover PR URL
   */
  async findAssociatedPR(jiraTicket) {
    // Option 1: Parse PR URL from Jira description
    if (jiraTicket.description) {
      const descMatch = jiraTicket.description.match(
        /github\.com\/([^\/\s]+)\/([^\/\s]+)\/pull\/(\d+)/i
      );
      if (descMatch) {
        return `https://github.com/${descMatch[1]}/${descMatch[2]}/pull/${descMatch[3]}`;
      }
    }

    // Option 2: Search GitHub for PRs mentioning this Jira key
    if (this.token && jiraTicket.key) {
      try {
        const searchQuery = `is:pr ${jiraTicket.key}`;
        const response = await axios.get(
          `${this.baseUrl}/search/issues`,
          {
            params: { q: searchQuery },
            headers: {
              'Authorization': `token ${this.token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (response.data.items && response.data.items.length > 0) {
          return response.data.items[0].html_url;
        }
      } catch (error) {
        console.warn('GitHub search failed:', error.message);
      }
    }

    // Option 3: Check if PR URL was passed directly
    if (jiraTicket.prUrl) {
      return jiraTicket.prUrl;
    }

    return null;
  }

  /**
   * Search PRs by Jira ticket key
   */
  async searchPRsByJiraKey(jiraKey) {
    if (!this.token) {
      return [];
    }

    try {
      const searchQuery = `is:pr ${jiraKey}`;
      const response = await axios.get(
        `${this.baseUrl}/search/issues`,
        {
          params: { q: searchQuery },
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      return response.data.items || [];
    } catch (error) {
      console.error('GitHub search error:', error.message);
      return [];
    }
  }

  /**
   * Get PR diff (alias for getCodeContext)
   */
  async getPRDiff(owner, repo, prNumber) {
    const prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;
    return this.getCodeContext(prUrl);
  }

  /**
   * Organize repository files by category (Frontend, Backend, DevOps, etc.)
   * Used when analyzing full repository (no PR)
   */
  organizeFilesByCategory(files) {
    const categories = {
      frontend: [],
      backend: [],
      devops: [],
      tests: [],
      config: [],
      other: []
    };

    files.forEach(file => {
      const filename = file.filename.toLowerCase();
      const path = file.filename.split('/');
      
      // Frontend files
      if (filename.includes('.jsx') || filename.includes('.tsx') || 
          filename.includes('.vue') || filename.includes('.svelte') ||
          path.includes('frontend') || path.includes('client') || 
          path.includes('components') || path.includes('src') && 
          (path.includes('app') || path.includes('pages'))) {
        categories.frontend.push(file);
      }
      // Backend files
      else if (filename.includes('server') || filename.includes('api') || 
               filename.includes('routes') || filename.includes('services') ||
               filename.includes('controllers') || filename.includes('models') ||
               path.includes('backend') || path.includes('server') ||
               path.includes('api') || (filename.endsWith('.js') && 
               !filename.includes('.test') && !filename.includes('.spec'))) {
        categories.backend.push(file);
      }
      // DevOps files
      else if (filename.includes('dockerfile') || filename.includes('docker-compose') ||
               filename.includes('.yml') || filename.includes('.yaml') ||
               path.includes('k8s') || path.includes('kubernetes') ||
               path.includes('terraform') || path.includes('.github') ||
               filename.includes('ci') || filename.includes('cd')) {
        categories.devops.push(file);
      }
      // Test files
      else if (filename.includes('.test.') || filename.includes('.spec.') ||
               path.includes('__tests__') || path.includes('test') ||
               path.includes('tests') || path.includes('spec')) {
        categories.tests.push(file);
      }
      // Config files
      else if (filename.includes('package.json') || filename.includes('requirements.txt') ||
               filename.includes('.env') || filename.includes('tsconfig') ||
               filename.includes('webpack') || filename.includes('vite.config') ||
               filename.includes('tailwind') || filename.includes('postcss')) {
        categories.config.push(file);
      }
      // Other
      else {
        categories.other.push(file);
      }
    });

    return categories;
  }

  /**
   * Get full repository structure organized by category
   * Used when no PR is available - analyzes entire codebase
   */
  async getFullRepoStructure(owner, repo, branch = 'main', logger = null) {
    if (!this.token) {
      if (logger) logger.warning('No GitHub token, cannot fetch full repo structure');
      return null;
    }

    try {
      if (logger) logger.data('Fetching', `Full repository structure for ${owner}/${repo}`);
      
      // Get repository tree (recursive)
      const treeResponse = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        {
          headers: {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      const tree = treeResponse.data.tree || [];
      
      // Filter to only files (not directories) and get file contents
      const files = tree.filter(item => item.type === 'blob' && item.size > 0 && item.size < 100000); // Max 100KB per file
      
      // Organize by category
      const organized = this.organizeFilesByCategory(files.map(f => ({ filename: f.path })));
      
      // Get content for key files (limit to avoid API rate limits)
      const keyFiles = [
        ...organized.frontend.slice(0, 10),
        ...organized.backend.slice(0, 15),
        ...organized.devops.slice(0, 5),
        ...organized.config.slice(0, 5)
      ];

      const fileContents = [];
      for (const file of keyFiles) {
        try {
          const contentResponse = await axios.get(
            `${this.baseUrl}/repos/${owner}/${repo}/contents/${file.filename}?ref=${branch}`,
            {
              headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );
          
          if (contentResponse.data.content) {
            const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');
            fileContents.push({
              filename: file.filename,
              content: content.substring(0, 5000), // Limit content size
              size: contentResponse.data.size
            });
          }
        } catch (err) {
          // Skip files that can't be read
          continue;
        }
      }

      if (logger) {
        logger.data('Frontend Files', organized.frontend.length);
        logger.data('Backend Files', organized.backend.length);
        logger.data('DevOps Files', organized.devops.length);
        logger.data('Test Files', organized.tests.length);
        logger.data('Config Files', organized.config.length);
        logger.data('Files Analyzed', fileContents.length);
      }

      return {
        categories: {
          frontend: {
            files: organized.frontend.map(f => f.filename),
            count: organized.frontend.length,
            contents: fileContents.filter(f => organized.frontend.some(ff => ff.filename === f.filename))
          },
          backend: {
            files: organized.backend.map(f => f.filename),
            count: organized.backend.length,
            contents: fileContents.filter(f => organized.backend.some(ff => ff.filename === f.filename))
          },
          devops: {
            files: organized.devops.map(f => f.filename),
            count: organized.devops.length,
            contents: fileContents.filter(f => organized.devops.some(ff => ff.filename === f.filename))
          },
          tests: {
            files: organized.tests.map(f => f.filename),
            count: organized.tests.length
          },
          config: {
            files: organized.config.map(f => f.filename),
            count: organized.config.length
          }
        },
        totalFiles: files.length,
        branch: branch
      };
    } catch (error) {
      if (logger) {
        logger.error('Error fetching full repo structure', error);
      }
      return null;
    }
  }

  /**
   * Mock context fallback
   */
  getMockContext(prUrl) {
    return {
      prUrl: prUrl || 'https://github.com/example/repo/pull/123',
      prNumber: 123,
      branch: 'feature/add-auth',
      commitSha: 'abc123def456',
      diff: `diff --git a/src/auth.js b/src/auth.js
+ export function login(username, password) {
+   // Login logic
+ }
+ export function logout() {
+   // Logout logic
+ }`,
      files: [
        {
          filename: 'src/auth.js',
          additions: 25,
          deletions: 0
        },
        {
          filename: 'src/utils.js',
          additions: 10,
          deletions: 5
        }
      ]
    };
  }
}
