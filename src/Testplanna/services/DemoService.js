import Workflow from '../models/Workflow.js';

/**
 * DemoService - Creates pre-seeded demo workflows for instant demo
 */
export class DemoService {
  /**
   * Create a completed demo workflow for instant visualization
   */
  async createDemoWorkflow() {
    const workflowId = 'demo-workflow-' + Date.now();
    
    const demoWorkflow = await Workflow.create({
      workflowId,
      jiraTicketKey: 'DEMO-456',
      status: 'completed',
      createdBy: 'demo.user',
      createdAt: new Date(),
      completedAt: new Date(),
      
      github: {
        prUrl: 'https://github.com/demo/repo/pull/789',
        prNumber: 789,
        branch: 'feature/add-authentication',
        commitSha: 'abc123def456',
        diff: `diff --git a/src/auth.js b/src/auth.js
+ export function login(username, password) {
+   // Login logic
+   if (!username || !password) {
+     throw new Error('Credentials required');
+   }
+   return authenticate(username, password);
+ }
+ export function logout() {
+   clearSession();
+   redirect('/login');
+ }`,
        files: [
          { filename: 'src/auth.js', additions: 25, deletions: 0 },
          { filename: 'src/session.js', additions: 15, deletions: 5 }
        ]
      },
      
      aiPlanning: {
        status: 'complete',
        plan: {
          unitTests: 8,
          integrationTests: 3,
          edgeCases: 5
        },
        reasoning: 'Based on the authentication flow changes, we need comprehensive unit tests for login/logout functions, integration tests for session management, and edge case coverage for password validation, token expiry, and error handling scenarios. The code introduces new security-critical paths that require thorough testing.',
        completedAt: new Date()
      },
      
      aiGeneration: {
        status: 'complete',
        generatedCode: `describe('Authentication', () => {
  describe('login', () => {
    it('should login with valid credentials', () => {
      const result = login('user@example.com', 'password123');
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('should reject invalid credentials', () => {
      expect(() => {
        login('user@example.com', 'wrong');
      }).toThrow('Invalid credentials');
    });

    it('should handle empty username', () => {
      expect(() => {
        login('', 'password123');
      }).toThrow('Credentials required');
    });

    it('should handle empty password', () => {
      expect(() => {
        login('user@example.com', '');
      }).toThrow('Credentials required');
    });

    it('should handle null username', () => {
      expect(() => {
        login(null, 'password123');
      }).toThrow('Credentials required');
    });
  });

  describe('logout', () => {
    it('should clear session on logout', () => {
      login('user@example.com', 'password123');
      logout();
      expect(getSession()).toBeNull();
    });

    it('should redirect to login after logout', () => {
      const redirectSpy = jest.spyOn(window.location, 'href', 'set');
      logout();
      expect(redirectSpy).toHaveBeenCalledWith('/login');
    });
  });
});`,
        language: 'javascript',
        framework: 'Jest',
        testCount: 16,
        linesOfCode: 342,
        completedAt: new Date()
      },
      
      codeRabbitReview: {
        status: 'complete',
        issues: {
          resolved: 14,
          warnings: 2,
          critical: 0
        },
        criticalIssues: [],
        warnings: [
          'Consider adding rate limiting for login attempts',
          'Session expiry time could be configurable'
        ],
        completedAt: new Date()
      },
      
      jiraSubtask: {
        created: true,
        issueKey: 'DEMO-457',
        issueUrl: 'https://drlittlekids.atlassian.net/browse/DEMO-457',
        parentKey: 'DEMO-456',
        createdAt: new Date()
      }
    });

    return demoWorkflow;
  }

  /**
   * Get demo workflow data (for frontend to load instantly)
   */
  getDemoWorkflowData() {
    return {
      workflowId: 'demo-workflow-instant',
      nodes: [
        {
          id: 'demo-github-push',
          type: 'github-push',
          position: { x: 250, y: 50 },
          data: {
            label: 'GitHub Push',
            prUrl: 'https://github.com/demo/repo/pull/789',
            prNumber: 789,
            branch: 'feature/add-authentication',
            status: 'ready'
          }
        },
        {
          id: 'demo-ai-review',
          type: 'ai-review',
          position: { x: 250, y: 200 },
          data: {
            label: 'AI Review',
            status: 'complete',
            provider: 'Gemini + MiniMax',
            unitTests: 8,
            integrationTests: 3,
            edgeCases: 5,
            testCount: 16,
            language: 'javascript',
            framework: 'Jest',
            linesOfCode: 342
          }
        },
        {
          id: 'demo-coderabbit-review',
          type: 'coderabbit-review',
          position: { x: 250, y: 350 },
          data: {
            label: 'CodeRabbit Review',
            status: 'complete',
            issues: {
              resolved: 14,
              warnings: 2,
              critical: 0
            },
            criticalIssues: []
          }
        },
        {
          id: 'demo-jira-subtask',
          type: 'jira-subtask',
          position: { x: 250, y: 500 },
          data: {
            label: 'Jira Subtask',
            status: 'complete',
            issueKey: 'DEMO-457',
            jiraUrl: 'https://drlittlekids.atlassian.net/browse/DEMO-457',
            parentKey: 'DEMO-456',
            coverage: 87,
            testCount: 16
          }
        }
      ],
      edges: [
        {
          id: 'edge-demo-github-ai',
          source: 'demo-github-push',
          target: 'demo-ai-review',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-demo-ai-coderabbit',
          source: 'demo-ai-review',
          target: 'demo-coderabbit-review',
          type: 'smoothstep',
          animated: true
        },
        {
          id: 'edge-demo-coderabbit-jira',
          source: 'demo-coderabbit-review',
          target: 'demo-jira-subtask',
          type: 'smoothstep',
          animated: true
        }
      ]
    };
  }
}

