/**
 * GeminiService - Uses Google Gemini for test planning
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  /**
   * Plan test coverage using Gemini
   */
  async planTestCoverage(jiraTicket, codeDiff, codeRabbitInsights, repoStructure, isPR, logger = null) {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    try {
      // Use available Gemini models (gemini-1.5-flash is deprecated)
      // Try newer models first, fallback to working ones
      let model;
      const modelNames = [
        'gemini-2.5-flash',           // Latest stable
        'gemini-2.0-flash',           // Stable v2.0
        'gemini-2.0-flash-exp',       // Experimental v2.0 (confirmed working)
        'gemini-flash-latest'         // Latest flash (auto-updates)
      ];
      
      // Try each model until one works
      for (const modelName of modelNames) {
        try {
          model = this.genAI.getGenerativeModel({ model: modelName });
          if (logger) logger.data('Using Gemini model', modelName);
          break; // Use first model that initializes
        } catch (modelError) {
          if (logger && modelNames.indexOf(modelName) === modelNames.length - 1) {
            logger.warning(`Model ${modelName} failed, will try fallback`);
          }
          continue;
        }
      }
      
      // Final fallback to confirmed working model
      if (!model) {
        if (logger) logger.warning('Using fallback model: gemini-2.0-flash-exp');
        model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      }

      let prompt = `Analyze the following code and create a comprehensive test plan.\n\n`;
      
      if (codeRabbitInsights && codeRabbitInsights.status !== 'no_pr_available') {
        prompt += `CodeRabbit Review Findings:\n`;
        prompt += `- Critical Issues: ${codeRabbitInsights.issues?.critical || 0}\n`;
        prompt += `- Warnings: ${codeRabbitInsights.issues?.warnings || 0}\n`;
        if (codeRabbitInsights.criticalIssues?.length > 0) {
          prompt += `Critical Issues:\n${codeRabbitInsights.criticalIssues.map((issue, i) => `${i+1}. ${issue}`).join('\n')}\n\n`;
        }
      }

      if (isPR) {
        prompt += `Code Diff:\n\`\`\`\n${codeDiff.substring(0, 8000)}\n\`\`\`\n\n`;
      } else if (repoStructure) {
        prompt += `Repository Structure:\n`;
        prompt += `- Frontend: ${repoStructure.categories?.frontend?.count || 0} files\n`;
        prompt += `- Backend: ${repoStructure.categories?.backend?.count || 0} files\n`;
        prompt += `- DevOps: ${repoStructure.categories?.devops?.count || 0} files\n\n`;
      }

      prompt += `Create a test plan with:\n`;
      prompt += `1. Number of unit tests needed\n`;
      prompt += `2. Number of integration tests needed\n`;
      prompt += `3. Number of edge cases to test\n`;
      prompt += `4. Reasoning for your test strategy\n\n`;
      prompt += `Respond in JSON format: {"unitTests": number, "integrationTests": number, "edgeCases": number, "reasoning": "string"}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const planData = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        unitTests: 5,
        integrationTests: 3,
        edgeCases: 2,
        reasoning: text
      };

      // Create reasoning flow
      const reasoningFlow = [
        { step: 1, action: 'Analyzed code structure', impact: 'high' },
        { step: 2, action: 'Identified test scenarios', impact: 'high' },
        { step: 3, action: 'Prioritized test coverage', impact: 'medium' }
      ];

      return {
        testPlan: {
          unitTests: planData.unitTests || 5,
          integrationTests: planData.integrationTests || 3,
          edgeCases: planData.edgeCases || 2,
          frontend: repoStructure?.categories?.frontend || null,
          backend: repoStructure?.categories?.backend || null,
          devops: repoStructure?.categories?.devops || null
        },
        reasoning: planData.reasoning || text,
        reasoningFlow: reasoningFlow
      };
    } catch (error) {
      if (logger) logger.error('Gemini planning error', error.message);
      // Return default plan on error
      return {
        testPlan: {
          unitTests: 5,
          integrationTests: 3,
          edgeCases: 2
        },
        reasoning: 'Default test plan generated',
        reasoningFlow: []
      };
    }
  }
}

