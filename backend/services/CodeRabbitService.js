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
      const headers = this.token ? { 
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json'
      } : { Accept: 'application/vnd.github.v3+json' };
      
      // CodeRabbit can post in multiple places:
      // 1. Review comments (line-by-line suggestions)
      // 2. Issue comments (general PR comments)
      // 3. Review body (summary reviews)
      
      const allComments = [];
      
      // Get review comments (line-by-line suggestions)
      try {
        const reviewCommentsResponse = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
          { headers }
        );
        allComments.push(...(reviewCommentsResponse.data || []));
      } catch (err) {
        if (logger) logger.warning('Could not fetch review comments', err.message);
      }
      
      // Get issue comments (general PR comments)
      try {
        const issueCommentsResponse = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
          { headers }
        );
        allComments.push(...(issueCommentsResponse.data || []));
      } catch (err) {
        if (logger) logger.warning('Could not fetch issue comments', err.message);
      }
      
      // Get PR reviews (summary reviews)
      try {
        const reviewsResponse = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
          { headers }
        );
        const reviews = reviewsResponse.data || [];
        // CodeRabbit reviews have a body field
        reviews.forEach(review => {
          if (review.body) {
            allComments.push({
              body: review.body,
              user: review.user,
              created_at: review.submitted_at || review.created_at
            });
          }
        });
      } catch (err) {
        if (logger) logger.warning('Could not fetch PR reviews', err.message);
      }

      // Find CodeRabbit comments - check username and body content
      const codeRabbitComments = allComments.filter(c => {
        const username = c.user?.login?.toLowerCase() || '';
        const body = (c.body || '').toLowerCase();
        return username.includes('coderabbit') || 
               username.includes('code-rabbit') ||
               body.includes('coderabbit') ||
               body.includes('code-rabbit') ||
               body.includes('my gpus mine bugs');
      });

      if (codeRabbitComments.length === 0) {
        if (logger) logger.data('CodeRabbit Comments Found', '0');
        return {
          status: 'complete',
          issues: { resolved: 0, warnings: 0, critical: 0, minorFixes: 0 },
          criticalIssues: [],
          warnings: [],
          message: 'No CodeRabbit review found'
        };
      }

      if (logger) logger.data('CodeRabbit Comments Found', codeRabbitComments.length);

      // IMPROVED: Parse CodeRabbit findings more accurately
      const issues = { resolved: 0, warnings: 0, critical: 0, minorFixes: 0 };
      const criticalIssues = [];
      const warnings = [];
      const suggestions = [];

      codeRabbitComments.forEach(comment => {
        const body = comment.body || '';
        const bodyLower = body.toLowerCase();
        
        // Count suggestions (CodeRabbit's main output)
        // Suggestions are usually in code blocks or marked with "suggestion"
        const suggestionMatches = body.match(/suggestion|apply this diff|recommend|consider/gi);
        if (suggestionMatches) {
          issues.minorFixes += suggestionMatches.length;
          // Extract suggestion text
          const suggestionText = body.match(/(?:suggestion|recommend|consider)[^.!?]*(?:\.|!|\?|$)/gi);
          if (suggestionText) {
            suggestions.push(...suggestionText.slice(0, 3).map(s => s.trim()));
          }
        }
        
        // Look for critical/security issues
        if (bodyLower.includes('critical') || 
            bodyLower.includes('security') || 
            bodyLower.includes('vulnerability') ||
            bodyLower.includes('🚨') ||
            bodyLower.includes('severe')) {
          issues.critical++;
          // Extract the issue description
          const issueMatch = body.match(/(?:critical|security|vulnerability|severe)[^.!?]*(?:\.|!|\?|$)/gi);
          if (issueMatch) {
            criticalIssues.push(issueMatch[0].trim().substring(0, 300));
          } else {
            criticalIssues.push(body.substring(0, 300));
          }
        }
        
        // Look for warnings
        if (bodyLower.includes('warning') || 
            bodyLower.includes('⚠️') ||
            bodyLower.includes('caution') ||
            bodyLower.includes('concern')) {
          issues.warnings++;
          const warningMatch = body.match(/(?:warning|caution|concern)[^.!?]*(?:\.|!|\?|$)/gi);
          if (warningMatch) {
            warnings.push(warningMatch[0].trim().substring(0, 300));
          } else {
            warnings.push(body.substring(0, 300));
          }
        }
        
        // Look for resolved items
        if (bodyLower.includes('✅') || 
            bodyLower.includes('resolved') ||
            bodyLower.includes('fixed') ||
            bodyLower.includes('addressed')) {
          issues.resolved++;
        }
        
        // If it's a suggestion but not categorized, count as minor fix
        if (body.includes('```') && body.includes('diff') && !suggestionMatches) {
          issues.minorFixes++;
          suggestions.push('Code suggestion found in review');
        }
      });
      
      // If we found suggestions but no other categories, count them
      if (suggestions.length > 0 && issues.minorFixes === 0) {
        issues.minorFixes = suggestions.length;
      }

      // Include suggestions in warnings if no other warnings found
      if (warnings.length === 0 && suggestions.length > 0) {
        warnings.push(...suggestions.slice(0, 5));
        issues.warnings = suggestions.length;
      }

      if (logger) {
        logger.data('CodeRabbit Issues', `Critical: ${issues.critical}, Warnings: ${issues.warnings}, Suggestions: ${issues.minorFixes}, Resolved: ${issues.resolved}`);
      }

      return {
        status: 'complete',
        issues,
        criticalIssues: criticalIssues.slice(0, 10),
        warnings: warnings.slice(0, 10),
        suggestions: suggestions.slice(0, 10),
        message: `Found ${codeRabbitComments.length} CodeRabbit review(s) with ${issues.critical} critical, ${issues.warnings} warnings, ${issues.minorFixes} suggestions`
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

