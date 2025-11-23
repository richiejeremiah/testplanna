/**
 * CodeRabbitService - Fetches CodeRabbit review from GitHub PR
 */
import axios from 'axios';

export class CodeRabbitService {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
  }

  /**
   * Check CodeRabbit review status from GitHub PR
   */
  async checkReviewStatus(prUrl, logger = null) {
    if (!prUrl) {
      return {
        status: 'no_pr_available',
        issues: { resolved: 0, warnings: 0, critical: 0 },
        message: 'No PR URL provided'
      };
    }

    // Check if it's a PR
    const prMatch = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/i);
    if (!prMatch) {
      return {
        status: 'no_pr_available',
        issues: { resolved: 0, warnings: 0, critical: 0 },
        message: 'Not a PR URL - CodeRabbit only reviews PRs'
      };
    }

    const [, owner, repo, prNumber] = prMatch;

    try {
      const headers = this.token ? { Authorization: `token ${this.token}` } : {};
      
      // Get PR comments (CodeRabbit posts reviews as comments)
      const commentsResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
        { headers }
      );
      const comments = commentsResponse.data || [];

      // Find CodeRabbit comments
      const codeRabbitComments = comments.filter(c => 
        c.user?.login?.toLowerCase().includes('coderabbit') ||
        c.body?.toLowerCase().includes('coderabbit')
      );

      if (codeRabbitComments.length === 0) {
        return {
          status: 'complete',
          issues: { resolved: 0, warnings: 0, critical: 0, minorFixes: 0 },
          criticalIssues: [],
          warnings: [],
          message: 'No CodeRabbit review found'
        };
      }

      // Parse CodeRabbit findings from comments
      const issues = { resolved: 0, warnings: 0, critical: 0, minorFixes: 0 };
      const criticalIssues = [];
      const warnings = [];

      codeRabbitComments.forEach(comment => {
        const body = comment.body || '';
        if (body.includes('✅') || body.includes('resolved')) issues.resolved++;
        if (body.includes('⚠️') || body.includes('warning')) {
          issues.warnings++;
          warnings.push(body.substring(0, 200));
        }
        if (body.includes('🚨') || body.includes('critical') || body.includes('security')) {
          issues.critical++;
          criticalIssues.push(body.substring(0, 200));
        }
        if (body.includes('minor') || body.includes('suggestion')) issues.minorFixes++;
      });

      return {
        status: 'complete',
        issues,
        criticalIssues: criticalIssues.slice(0, 10),
        warnings: warnings.slice(0, 10),
        message: `Found ${codeRabbitComments.length} CodeRabbit review(s)`
      };
    } catch (error) {
      if (logger) logger.warning('Could not fetch CodeRabbit review', error.message);
      // Return neutral status - don't fail workflow
      return {
        status: 'complete',
        issues: { resolved: 0, warnings: 0, critical: 0, minorFixes: 0 },
        criticalIssues: [],
        warnings: [],
        message: 'Could not fetch CodeRabbit review'
      };
    }
  }
}

