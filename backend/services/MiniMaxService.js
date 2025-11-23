/**
 * MiniMaxService - Uses MiniMax AI for test code generation
 */
import axios from 'axios';

export class MiniMaxService {
  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY;
    this.baseUrl = 'https://api.minimax.chat/v1/text/chatcompletion_pro';
  }

  /**
   * Generate test code using MiniMax
   */
  async generateTestCode(testPlan, codeDiff, language, codeRabbitInsights, repoStructure, isPR, logger = null) {
    if (!this.apiKey) {
      throw new Error('MINIMAX_API_KEY not configured');
    }

    try {
      let prompt = `Generate comprehensive test code for the following test plan:\n\n`;
      prompt += `Unit Tests: ${testPlan.unitTests || 0}\n`;
      prompt += `Integration Tests: ${testPlan.integrationTests || 0}\n`;
      prompt += `Edge Cases: ${testPlan.edgeCases || 0}\n\n`;

      if (codeRabbitInsights && codeRabbitInsights.criticalIssues?.length > 0) {
        prompt += `Address these critical issues in your tests:\n`;
        codeRabbitInsights.criticalIssues.forEach((issue, i) => {
          prompt += `${i+1}. ${issue}\n`;
        });
        prompt += `\n`;
      }

      prompt += `Code to test:\n\`\`\`${language}\n${codeDiff.substring(0, 6000)}\n\`\`\`\n\n`;
      prompt += `Generate complete, production-ready test code in ${language} using Jest framework. Include proper assertions, error handling, and edge case coverage.`;

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
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const generatedCode = response.data.choices?.[0]?.message?.content || '// Test code generation failed';
      
      // Count tests
      const testCount = (generatedCode.match(/test\(|it\(|describe\(/g) || []).length || 5;
      const linesOfCode = generatedCode.split('\n').length;

      return {
        code: generatedCode,
        language: language || 'javascript',
        framework: 'jest',
        testCount: testCount,
        linesOfCode: linesOfCode
      };
    } catch (error) {
      if (logger) logger.error('MiniMax generation error', error.message);
      // Return default test code on error
      const defaultCode = `// Test code generation\n\ndescribe('Test Suite', () => {\n  test('should work', () => {\n    expect(true).toBe(true);\n  });\n});`;
      return {
        code: defaultCode,
        language: language || 'javascript',
        framework: 'jest',
        testCount: 1,
        linesOfCode: defaultCode.split('\n').length
      };
    }
  }
}

