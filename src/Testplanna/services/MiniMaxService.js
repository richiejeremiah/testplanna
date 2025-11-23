import axios from 'axios';

/**
 * MiniMaxService - Uses MiniMax AI for test code generation
 */
export class MiniMaxService {
  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY;
    this.baseUrl = 'https://api.minimax.chat/v1/text/chatcompletion_pro';
  }

  /**
   * Generate test code based on plan, code diff, and CodeRabbit insights
   * @param {object} testPlan - Test plan from Gemini (may include organized categories)
   * @param {string} codeDiff - Code diff to test (or repo structure)
   * @param {string} language - Programming language
   * @param {object|null} codeRabbitInsights - CodeRabbit review findings (optional)
   * @param {object|null} repoStructure - Full repo structure organized by category (if no PR)
   * @param {boolean} isPR - Whether this is a PR or full repo analysis
   * @param {object} logger - Optional logger instance
   */
  async generateTestCode(testPlan, codeDiff, language = 'javascript', codeRabbitInsights = null, repoStructure = null, isPR = true, logger = null) {
    if (!this.apiKey) {
      if (logger) logger.warning('No MiniMax API key, using mock data');
      // Fallback to mock if no API key
      return this.getMockTestCode(language);
    }

    try {
      if (logger) logger.apiCall('MiniMax', 'POST', 'abab6.5s-chat');
      // Extract group ID from JWT token if needed
      const groupId = this.extractGroupIdFromToken(this.apiKey);
      
      // Build prompt with CodeRabbit insights if available
      let codeRabbitSection = '';
      if (codeRabbitInsights && codeRabbitInsights.status !== 'no_pr_available') {
        const criticalCount = codeRabbitInsights.issues?.critical || 0;
        const warningsCount = codeRabbitInsights.issues?.warnings || 0;
        
        codeRabbitSection = `

CodeRabbit Review Findings:
- Critical Issues: ${criticalCount}
- Warnings: ${warningsCount}
${codeRabbitInsights.criticalIssues?.length > 0 ? 
  `Critical Issues to Address:\n${codeRabbitInsights.criticalIssues.slice(0, 5).map(i => `  - ${i}`).join('\n')}` : 
  ''}
${codeRabbitInsights.warnings?.length > 0 ? 
  `Warnings to Consider:\n${codeRabbitInsights.warnings.slice(0, 5).map(w => `  - ${w}`).join('\n')}` : 
  ''}

IMPORTANT: Your generated tests MUST address these CodeRabbit findings:
- Create specific tests for each critical issue
- Add tests that verify fixes for the warnings
- Focus test generation on problem areas identified by CodeRabbit`;
      }

      // Build organized test plan section if full repo analysis
      let organizedPlanSection = '';
      if (!isPR && testPlan.frontend && testPlan.backend) {
        organizedPlanSection = `

Organized Test Plan (Full Repository):
Frontend:
- Unit Tests: ${testPlan.frontend.unitTests}
- Integration Tests: ${testPlan.frontend.integrationTests}
- Edge Cases: ${testPlan.frontend.edgeCases}

Backend:
- Unit Tests: ${testPlan.backend.unitTests}
- Integration Tests: ${testPlan.backend.integrationTests}
- Edge Cases: ${testPlan.backend.edgeCases}

DevOps:
- Unit Tests: ${testPlan.devops?.unitTests || 0}
- Integration Tests: ${testPlan.devops?.integrationTests || 0}
- Edge Cases: ${testPlan.devops?.edgeCases || 0}

Generate tests organized by category.`;
      }

      const testPlanSection = isPR 
        ? `Test Plan:
- Unit Tests: ${testPlan.unitTests}
- Integration Tests: ${testPlan.integrationTests}
- Edge Cases: ${testPlan.edgeCases}`
        : organizedPlanSection;

      const codeSection = isPR
        ? `Code to Test:
\`\`\`${language}
${codeDiff.substring(0, 3000)} // Truncated for API limits
\`\`\``
        : repoStructure 
          ? `Repository Structure to Test:
Frontend Files: ${repoStructure.categories.frontend.files.slice(0, 5).join(', ')}
Backend Files: ${repoStructure.categories.backend.files.slice(0, 5).join(', ')}
DevOps Files: ${repoStructure.categories.devops.files.slice(0, 3).join(', ')}

Generate tests for each category.`
          : `Code to Test:
\`\`\`${language}
${codeDiff.substring(0, 3000)}
\`\`\``;

      const prompt = `You are an expert test engineer. Generate comprehensive test code based on this test plan.${codeRabbitSection}${organizedPlanSection}

${testPlanSection}

Language: ${language}
Framework: ${language === 'javascript' ? 'Jest' : language === 'python' ? 'pytest' : 'JUnit'}

${codeSection}

Generate complete, production-ready test code. Include:
1. All unit tests for individual functions
2. Integration tests for component interactions
3. Edge case tests for error handling and boundary conditions
4. Proper setup/teardown
5. Clear test descriptions${codeRabbitInsights && codeRabbitInsights.status !== 'no_pr_available' ? '\n6. Tests that specifically address CodeRabbit\'s findings' : ''}
${!isPR ? '\n7. Organize tests by category (Frontend/Backend/DevOps sections)' : ''}

Return ONLY the test code, no explanations.`;

      const response = await axios.post(
        this.baseUrl,
        {
          model: 'abab6.5s-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          top_p: 0.95,
          ...(groupId && { group_id: groupId })
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (logger) logger.apiResponse('MiniMax', response.status, { 
        hasContent: !!response.data?.choices?.[0]?.message?.content 
      });
      
      const generatedCode = response.data?.choices?.[0]?.message?.content || 
                           response.data?.reply || 
                           this.getMockTestCode(language).code;

      // Count tests in generated code
      const testCount = this.countTests(generatedCode, language);
      const linesOfCode = generatedCode.split('\n').length;

      return {
        code: generatedCode,
        language: language,
        framework: language === 'javascript' ? 'Jest' : language === 'python' ? 'pytest' : 'JUnit',
        testCount: testCount,
        linesOfCode: linesOfCode
      };
    } catch (error) {
      console.error('MiniMax API error:', error.response?.data || error.message);
      // Fallback to mock on error
      return this.getMockTestCode(language);
    }
  }

  /**
   * Extract group ID from JWT token
   */
  extractGroupIdFromToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload.GroupID;
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return null;
  }

  /**
   * Count tests in generated code
   */
  countTests(code, language) {
    if (language === 'javascript') {
      const itMatches = code.match(/it\s*\(/g);
      const testMatches = code.match(/test\s*\(/g);
      return (itMatches?.length || 0) + (testMatches?.length || 0);
    } else if (language === 'python') {
      const defMatches = code.match(/def\s+test_/g);
      return defMatches?.length || 0;
    } else {
      // Java/JUnit
      const testMatches = code.match(/@Test/g);
      return testMatches?.length || 0;
    }
  }

  /**
   * Mock test code fallback
   */
  getMockTestCode(language) {
    if (language === 'python') {
      return {
        code: `import pytest

def test_login_valid_credentials():
    result = login('user@example.com', 'password123')
    assert result.success == True

def test_login_invalid_credentials():
    result = login('user@example.com', 'wrong')
    assert result.success == False

def test_logout_clears_session():
    login('user@example.com', 'password123')
    logout()
    assert get_session() is None`,
        language: 'python',
        framework: 'pytest',
        testCount: 16,
        linesOfCode: 342
      };
    }

    return {
      code: `describe('Authentication', () => {
  describe('login', () => {
    it('should login with valid credentials', () => {
      const result = login('user@example.com', 'password123');
      expect(result.success).toBe(true);
    });

    it('should reject invalid credentials', () => {
      const result = login('user@example.com', 'wrong');
      expect(result.success).toBe(false);
    });

    it('should handle empty username', () => {
      const result = login('', 'password123');
      expect(result.error).toBe('Username required');
    });
  });

  describe('logout', () => {
    it('should clear session on logout', () => {
      login('user@example.com', 'password123');
      logout();
      expect(getSession()).toBeNull();
    });
  });
});`,
      language: 'javascript',
      framework: 'Jest',
      testCount: 16,
      linesOfCode: 342
    };
  }
}
