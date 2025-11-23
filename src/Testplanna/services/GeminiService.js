import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * GeminiService - Uses Gemini AI for code analysis and test planning
 */
export class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  /**
   * Plan test coverage based on code changes and CodeRabbit review insights
   * @param {object} jiraTicket - Jira ticket information
   * @param {string} codeDiff - Code diff to analyze (or full repo structure if no PR)
   * @param {string|null} codeRabbitInsights - CodeRabbit review findings (optional)
   * @param {object|null} repoStructure - Full repo structure organized by category (if no PR)
   * @param {boolean} isPR - Whether this is a PR or full repo analysis
   * @param {object} logger - Optional logger instance
   */
  async planTestCoverage(jiraTicket, codeDiff, codeRabbitInsights = null, repoStructure = null, isPR = true, logger = null) {
    if (!this.genAI) {
      if (logger) logger.warning('No Gemini API key, using mock data');
      // Fallback to mock if no API key
      return this.getMockPlan();
    }

    try {
      if (logger) logger.apiCall('Gemini', 'POST', 'gemini-2.0-flash');
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        }
      });
      
      // Build prompt based on whether this is a PR or full repo analysis
      let codeRabbitSection = '';
      let repoStructureSection = '';
      let analysisContext = '';

      if (codeRabbitInsights && codeRabbitInsights !== 'no_pr_available') {
        codeRabbitSection = `

CodeRabbit Review Findings:
${codeRabbitInsights}

IMPORTANT: Your test plan should specifically address the issues CodeRabbit identified.
- If CodeRabbit found security issues, plan security-focused tests
- If CodeRabbit found architectural concerns, plan integration tests for those areas
- If CodeRabbit found code quality issues, plan edge case tests to cover them
- Prioritize tests that address CodeRabbit's critical findings`;
      } else if (!isPR) {
        codeRabbitSection = `

CodeRabbit Status: No PR available - CodeRabbit reviews PRs only.
You are analyzing the full repository structure instead of PR changes.`;
      }

      if (!isPR && repoStructure) {
        repoStructureSection = `

Repository Structure (Full Codebase Analysis):
- Frontend: ${repoStructure.categories.frontend.count} files
  Key files: ${repoStructure.categories.frontend.files.slice(0, 5).join(', ')}
- Backend: ${repoStructure.categories.backend.count} files
  Key files: ${repoStructure.categories.backend.files.slice(0, 5).join(', ')}
- DevOps: ${repoStructure.categories.devops.count} files
  Key files: ${repoStructure.categories.devops.files.slice(0, 3).join(', ')}
- Tests: ${repoStructure.categories.tests.count} existing test files
- Config: ${repoStructure.categories.config.count} config files

Total files in repository: ${repoStructure.totalFiles}`;

        analysisContext = `
Since this is a full repository analysis (no PR), you should:
1. Review the codebase structure and identify testable components
2. Organize your test plan by category (Frontend, Backend, DevOps)
3. Focus on critical paths in each category
4. Consider integration points between frontend and backend
5. Plan infrastructure/DevOps validation tests`;
      }

      const codeSection = isPR 
        ? `Code Changes (PR Diff):
\`\`\`
${codeDiff.substring(0, 4000)}
\`\`\``
        : `Repository Code Structure:
${repoStructure ? repoStructure.categories.frontend.contents.slice(0, 3).map(f => 
  `\n// ${f.filename}\n${f.content.substring(0, 500)}...`
).join('\n\n') : 'Repository structure analyzed'}`;

      const prompt = `You are a senior QA engineer analyzing ${isPR ? 'code changes' : 'a full codebase'} for test planning.

Jira Ticket: ${jiraTicket.jiraTicketKey || 'N/A'}
Summary: ${jiraTicket.summary || 'N/A'}${codeRabbitSection}${repoStructureSection}${analysisContext}

${codeSection}

Analyze this ${isPR ? 'code' : 'codebase'} and create a comprehensive test plan. ${!isPR ? 'Organize by category (Frontend, Backend, DevOps).' : ''} Respond in JSON format:
{
  "unitTests": <number>,
  "integrationTests": <number>,
  "edgeCases": <number>,
  ${!isPR ? `"frontend": { "unitTests": <number>, "integrationTests": <number>, "edgeCases": <number> },
  "backend": { "unitTests": <number>, "integrationTests": <number>, "edgeCases": <number> },
  "devops": { "unitTests": <number>, "integrationTests": <number>, "edgeCases": <number> },` : ''}
  "reasoning": "<detailed explanation>",
  "reasoningFlow": [
    {
      "step": 1,
      "type": "security_review|architecture_review|edge_case_analysis|...",
      "findings": ["finding 1", "finding 2"],
      "decision": "decision made",
      "impact": "high|medium|low"
    }
  ]
}

Focus on:
- Critical paths that need unit testing
- Integration points that need integration tests
- Edge cases and error scenarios
- Security considerations if applicable${codeRabbitInsights && codeRabbitInsights !== 'no_pr_available' ? '\n- Addressing CodeRabbit\'s identified issues' : ''}
${!isPR ? '\n- Organizing tests by category (Frontend/Backend/DevOps)' : ''}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Try to parse JSON from response
      let plan;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          plan = JSON.parse(jsonMatch[0]);
        } else {
          plan = JSON.parse(text);
        }
      } catch (parseError) {
        // If parsing fails, extract numbers and create structured response
        console.warn('Failed to parse Gemini response as JSON, using fallback');
        plan = this.extractPlanFromText(text);
      }

      return {
        testPlan: {
          unitTests: plan.unitTests || 8,
          integrationTests: plan.integrationTests || 3,
          edgeCases: plan.edgeCases || 5,
          // Organized by category if full repo analysis
          frontend: plan.frontend || null,
          backend: plan.backend || null,
          devops: plan.devops || null
        },
        reasoning: plan.reasoning || text.substring(0, 500),
        reasoningFlow: plan.reasoningFlow || this.generateDefaultReasoningFlow(plan, codeRabbitInsights, isPR)
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback to mock on error
      return this.getMockPlan();
    }
  }

  /**
   * Generate default reasoning flow if not provided by Gemini
   */
  generateDefaultReasoningFlow(plan, codeRabbitInsights, isPR) {
    const flow = [];
    
    if (codeRabbitInsights && codeRabbitInsights !== 'no_pr_available') {
      flow.push({
        step: 1,
        type: 'codeRabbit_review',
        findings: ['CodeRabbit insights received'],
        decision: 'Incorporate CodeRabbit findings into test plan',
        impact: 'high'
      });
    } else if (!isPR) {
      flow.push({
        step: 1,
        type: 'repository_analysis',
        findings: ['Full repository structure analyzed'],
        decision: 'Organize test plan by category (Frontend/Backend/DevOps)',
        impact: 'high'
      });
    }
    
    flow.push({
      step: flow.length + 1,
      type: 'code_analysis',
      findings: [`${plan.unitTests || 8} unit test areas identified`, `${plan.integrationTests || 3} integration points found`],
      decision: `Plan ${plan.unitTests || 8} unit tests and ${plan.integrationTests || 3} integration tests`,
      impact: 'high'
    });
    
    flow.push({
      step: flow.length + 1,
      type: 'edge_case_analysis',
      findings: ['Edge cases and boundary conditions identified'],
      decision: `Plan ${plan.edgeCases || 5} edge case tests`,
      impact: 'medium'
    });
    
    return flow;
  }

  /**
   * Extract plan from unstructured text
   */
  extractPlanFromText(text) {
    const unitMatch = text.match(/(\d+)\s*(?:unit|unit test)/i);
    const integrationMatch = text.match(/(\d+)\s*(?:integration|integration test)/i);
    const edgeMatch = text.match(/(\d+)\s*(?:edge case|edge)/i);

    return {
      unitTests: unitMatch ? parseInt(unitMatch[1]) : 8,
      integrationTests: integrationMatch ? parseInt(integrationMatch[1]) : 3,
      edgeCases: edgeMatch ? parseInt(edgeMatch[1]) : 5,
      reasoning: text.substring(0, 500)
    };
  }

  /**
   * Mock plan fallback
   */
  getMockPlan() {
    return {
      testPlan: {
        unitTests: 8,
        integrationTests: 3,
        edgeCases: 5
      },
      reasoning: `Based on the code changes, we need comprehensive unit tests for core functions, integration tests for component interactions, and edge case coverage for error handling and boundary conditions.`
    };
  }

  /**
   * Analyze code complexity
   */
  async analyzeCodeComplexity(codeDiff) {
    if (!this.genAI) {
      return {
        complexity: 'medium',
        riskAreas: ['authentication', 'session management']
      };
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
        }
      });
      const prompt = `Analyze this code diff for complexity and risk areas. Respond with JSON:
{
  "complexity": "low|medium|high",
  "riskAreas": ["area1", "area2"]
}

Code:
\`\`\`
${codeDiff}
\`\`\``;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : {
          complexity: 'medium',
          riskAreas: []
        };
      } catch {
        return {
          complexity: 'medium',
          riskAreas: []
        };
      }
    } catch (error) {
      console.error('Gemini complexity analysis error:', error);
      return {
        complexity: 'medium',
        riskAreas: []
      };
    }
  }
}
