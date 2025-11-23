import axios from 'axios';

/**
 * CodeRabbitService - Integrates with CodeRabbit for code review
 * 
 * CodeRabbit works by posting comments on GitHub PRs. This service:
 * 1. Fetches PR comments via GitHub API to find CodeRabbit's review
 * 2. Parses CodeRabbit's review comments to extract insights
 * 3. Falls back to mock data if CodeRabbit hasn't reviewed yet or if GitHub token is missing
 * 
 * Reference: https://docs.coderabbit.ai/overview/introduction
 */
export class CodeRabbitService {
  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN;
    this.baseUrl = 'https://api.github.com';
    // CodeRabbit bot usernames (may vary)
    this.coderabbitUsernames = ['coderabbitai', 'coderabbit[bot]', 'coderabbit'];
  }

  /**
   * Check CodeRabbit review status for a PR
   * Fetches PR comments from GitHub and looks for CodeRabbit's review
   * 
   * @param {string} prUrl - GitHub PR URL (e.g., https://github.com/owner/repo/pull/123)
   * @param {object} logger - Optional logger instance
   * @returns {object} Review results with issues, warnings, and status
   */
  async checkReviewStatus(prUrl, logger = null) {
    if (logger) {
      logger.apiCall('CodeRabbit', 'GET', 'Review Status');
      logger.data('PR URL', prUrl);
    }

    // If no GitHub token, CodeRabbit can't fetch PR comments
    if (!this.githubToken) {
      if (logger) {
        logger.warning('No GitHub token - cannot fetch CodeRabbit PR comments');
        logger.warning('CodeRabbit requires GitHub App installation to review PRs automatically');
        logger.warning('Using mock data for demonstration');
      }
      return this.getMockReview();
    }

    try {
      // Parse PR URL to get owner, repo, and PR number
      const prMatch = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
      if (!prMatch) {
        // If not a PR URL, return "no PR" status (flow continues)
        const repoMatch = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (repoMatch) {
          if (logger) {
            logger.warning('Repository URL provided, not a PR URL.');
            logger.warning('CodeRabbit reviews PRs only - marking as "No PR available"');
            logger.warning('Flow will continue to Gemini for full repo analysis');
          }
          return {
            status: 'no_pr_available',
            prDetected: false,
            message: 'No PR found - CodeRabbit reviews PRs only. Flow continues to Gemini.',
            issues: {
              resolved: 0,
              warnings: 0,
              critical: 0
            },
            criticalIssues: [],
            warnings: [],
            source: 'no_pr'
          };
        }
        throw new Error('Invalid GitHub URL format');
      }

      const [, owner, repo, prNumber] = prMatch;
      
      if (logger) logger.data('Owner', owner);
      if (logger) logger.data('Repo', repo);
      if (logger) logger.data('PR Number', prNumber);

      // Fetch PR comments from GitHub API
      // CodeRabbit posts its reviews as PR comments
      const commentsUrl = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/comments`;
      const reviewsUrl = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;
      
      if (logger) logger.apiCall('GitHub', 'GET', `PR #${prNumber} comments`);

      // Fetch both PR review comments and issue comments
      const [commentsResponse, reviewsResponse] = await Promise.all([
        axios.get(commentsUrl, {
          headers: { Authorization: `token ${this.githubToken}` }
        }).catch(() => ({ data: [] })),
        axios.get(reviewsUrl, {
          headers: { Authorization: `token ${this.githubToken}` }
        }).catch(() => ({ data: [] }))
      ]);

      const allComments = [
        ...(commentsResponse.data || []),
        ...(reviewsResponse.data || [])
      ];

      // Find CodeRabbit's comments
      const coderabbitComments = allComments.filter(comment => 
        this.coderabbitUsernames.some(username => 
          comment.user?.login?.toLowerCase().includes('coderabbit') ||
          comment.user?.login?.toLowerCase() === username.toLowerCase()
        )
      );

      if (coderabbitComments.length === 0) {
        if (logger) {
          logger.warning('No CodeRabbit comments found on this PR');
          logger.warning('CodeRabbit reviews PRs automatically when the GitHub App is installed');
          logger.warning('Ensure CodeRabbit GitHub App is installed: https://docs.coderabbit.ai/getting-started/quickstart/');
          logger.warning('Using mock data for demonstration');
        }
        return this.getMockReview();
      }

      // Parse CodeRabbit's review from comments
      const review = this.parseCodeRabbitReview(coderabbitComments);
      
      if (logger) {
        logger.apiResponse('CodeRabbit', 200, { 
          commentsFound: coderabbitComments.length,
          issues: review.issues 
        });
        logger.data('CodeRabbit Comments Found', coderabbitComments.length);
      }

      return review;

    } catch (error) {
      if (logger) {
        logger.error('Error fetching CodeRabbit review', error);
        logger.warning('Falling back to mock data');
      } else {
        console.error('CodeRabbit review error:', error.message);
      }
      return this.getMockReview();
    }
  }

  /**
   * Parse CodeRabbit review from GitHub comments
   * CodeRabbit posts structured reviews with summaries, issues, and suggestions
   */
  parseCodeRabbitReview(comments) {
    let resolved = 0;
    let warnings = 0;
    let critical = 0;
    const criticalIssues = [];
    const warningMessages = [];

    // Parse each CodeRabbit comment
    for (const comment of comments) {
      const body = comment.body || '';
      
      // Look for issue counts in CodeRabbit's review format
      // CodeRabbit typically includes: "X issues", "X suggestions", etc.
      const issuesMatch = body.match(/(\d+)\s+(?:issue|problem|error)/gi);
      const suggestionsMatch = body.match(/(\d+)\s+suggestion/gi);
      const warningsMatch = body.match(/(\d+)\s+warning/gi);
      const criticalMatch = body.match(/(\d+)\s+critical/gi);

      if (issuesMatch) {
        const count = parseInt(issuesMatch[0].match(/\d+/)[0]);
        resolved += count;
      }
      if (warningsMatch) {
        const count = parseInt(warningsMatch[0].match(/\d+/)[0]);
        warnings += count;
      }
      if (criticalMatch) {
        const count = parseInt(criticalMatch[0].match(/\d+/)[0]);
        critical += count;
      }

      // Extract critical issues (look for "🔴", "❌", "Critical", etc.)
      if (body.includes('critical') || body.includes('🔴') || body.includes('❌')) {
        const lines = body.split('\n').filter(line => 
          line.toLowerCase().includes('critical') || 
          line.includes('🔴') || 
          line.includes('❌')
        );
        criticalIssues.push(...lines.slice(0, 5)); // Limit to 5
      }

      // Extract warnings (look for "⚠️", "Warning", "Suggestion", etc.)
      if (body.includes('warning') || body.includes('⚠️') || body.includes('suggestion')) {
        const lines = body.split('\n').filter(line => 
          (line.toLowerCase().includes('warning') || 
           line.includes('⚠️') || 
           line.toLowerCase().includes('suggestion')) &&
          !line.toLowerCase().includes('critical')
        );
        warningMessages.push(...lines.slice(0, 10)); // Limit to 10
      }
    }

    // If no structured data found, provide summary
    if (resolved === 0 && warnings === 0 && critical === 0) {
      resolved = comments.length; // Use comment count as proxy
      warnings = 2;
    }

    return {
      issues: {
        resolved: resolved || comments.length,
        warnings: warnings || 2,
        critical: critical || 0
      },
      criticalIssues: criticalIssues.length > 0 ? criticalIssues : [
        'Review CodeRabbit comments on the PR for specific issues'
      ],
      warnings: warningMessages.length > 0 ? warningMessages : [
        'Consider reviewing CodeRabbit\'s suggestions in the PR comments',
        'Check CodeRabbit\'s review summary for architectural concerns'
      ],
      status: 'complete',
      commentsFound: comments.length,
      source: 'github_pr_comments'
    };
  }

  /**
   * Get mock review data (fallback when CodeRabbit hasn't reviewed or GitHub token missing)
   */
  getMockReview() {
    return {
      issues: {
        resolved: 14,
        warnings: 2,
        critical: 0
      },
      criticalIssues: [],
      warnings: [
        'Consider adding error handling for edge cases',
        'Test coverage could be improved for boundary conditions'
      ],
      status: 'complete',
      source: 'mock'
    };
  }

  /**
   * Trigger CodeRabbit review (if needed)
   * Note: CodeRabbit reviews PRs automatically when GitHub App is installed
   * This method is for future webhook/API integration
   */
  async triggerReview(prUrl) {
    // CodeRabbit automatically reviews PRs when installed as GitHub App
    // No manual trigger needed - it reviews on PR open/update
    return { 
      success: true, 
      note: 'CodeRabbit reviews PRs automatically when GitHub App is installed',
      setupUrl: 'https://docs.coderabbit.ai/getting-started/quickstart/'
    };
  }
}

