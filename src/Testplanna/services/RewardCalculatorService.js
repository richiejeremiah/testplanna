/**
 * RewardCalculatorService - Computes reward signals from workflow feedback
 * Combines multiple reward sources into a single score for RL training
 */
export class RewardCalculatorService {
  constructor() {
    // Reward weights
    this.weights = {
      codeQuality: 0.5,      // 50% weight
      testExecution: 0.4,     // 40% weight
      reasoning: 0.1         // 10% weight
    };
  }

  /**
   * Compute reward from CodeRabbit review
   * @param {Object} codeRabbitReview - CodeRabbit review object
   * @returns {number} Reward between 0.0 and 1.0
   */
  computeCodeQualityReward(codeRabbitReview) {
    if (!codeRabbitReview || !codeRabbitReview.issues) {
      return 0.5; // Neutral if no review
    }

    // Check if review is complete
    if (codeRabbitReview.status !== 'complete' && codeRabbitReview.status !== 'no_pr_available') {
      return 0.5; // Neutral if review not complete
    }

    const { resolved = 0, warnings = 0, critical = 0, minorFixes = 0 } = codeRabbitReview.issues;

    // Perfect code (no issues)
    if (resolved === 0 && warnings === 0 && critical === 0 && minorFixes === 0) {
      return 1.0;
    }

    // IMPROVED: Clipped linear mapping (prevents division-by-zero and extreme sensitivity)
    // Step 1: Compute weighted points
    const points = (1.0 * resolved) + (0.2 * minorFixes) - (0.5 * warnings) - (2.0 * critical);

    // Step 2: Clip points to sensible range [-10, +10]
    const pointsClipped = Math.max(-10, Math.min(10, points));

    // Step 3: Map to [0, 1] with linear transform
    // Maps [-10, 10] to [0, 1]
    const codeQuality = (pointsClipped + 10) / 20;

    return Math.max(0.0, Math.min(1.0, codeQuality));
  }

  /**
   * Compute reward from test execution results
   * @param {Object} testResults - Test execution results
   * @returns {number} Reward between 0.0 and 1.0
   */
  computeTestExecutionReward(testResults) {
    if (!testResults || !testResults.total || testResults.total === 0) {
      return 0.0; // No reward if no tests
    }

    // Pass rate (70% weight)
    const passRate = testResults.passed / testResults.total;

    // Coverage (30% weight) - normalize to 0-1
    const coverage = (testResults.coverage || 0) / 100;

    // Base reward
    const base = (passRate * 0.7) + (coverage * 0.3);

    // IMPROVED: Add flakiness penalty (if available)
    // Flakiness = flaky_failures / runs_over_window
    // For now, we'll use a simple heuristic: if tests failed but coverage is high, might be flaky
    let flakinessPenalty = 0;
    if (testResults.flakiness !== undefined) {
      // Only penalize if flakiness > 5%
      flakinessPenalty = Math.max(0, (testResults.flakiness - 0.05) * 2);
    } else if (passRate < 0.8 && coverage > 0.7) {
      // Heuristic: low pass rate but high coverage suggests flakiness
      flakinessPenalty = (0.8 - passRate) * 0.5; // Moderate penalty
    }

    // Apply flakiness penalty
    const reward = base * (1 - flakinessPenalty);

    return Math.max(0.0, Math.min(1.0, reward));
  }

  /**
   * Compute reward from reasoning flow quality
   * @param {Array} reasoningFlow - Array of reasoning steps
   * @returns {number} Reward between 0.0 and 1.0
   */
  computeReasoningReward(reasoningFlow, codeRabbitFindings = null, reasoningText = '') {
    if (!reasoningFlow || !Array.isArray(reasoningFlow) || reasoningFlow.length === 0) {
      return 0.5; // Neutral if no reasoning
    }

    // IMPROVED: Use structural heuristics instead of just step count
    // 1. Check if reasoning references CodeRabbit findings
    const referencesFindings = codeRabbitFindings && reasoningText 
      ? (reasoningText.toLowerCase().includes('coderabbit') || 
         reasoningText.toLowerCase().includes('review') ||
         reasoningText.toLowerCase().includes('finding'))
      : 0;

    // 2. Edge case coverage score (heuristic: look for edge case mentions)
    const edgeCaseKeywords = ['edge', 'boundary', 'corner', 'exception', 'error', 'invalid', 'null', 'empty'];
    const edgeCaseMentions = edgeCaseKeywords.filter(keyword => 
      reasoningText.toLowerCase().includes(keyword)
    ).length;
    const edgeCaseCoverageScore = Math.min(1.0, edgeCaseMentions / 3); // Cap at 3 mentions

    // 3. Conciseness penalty (penalize overly verbose reasoning)
    const wordCount = reasoningText.split(/\s+/).length;
    const concisenessPenalty = wordCount > 500 ? Math.min(0.3, (wordCount - 500) / 1000) : 0;

    // 4. Traditional metrics (for backward compatibility)
    const stepCount = reasoningFlow.length;
    const highImpactSteps = reasoningFlow.filter(s => s.impact === 'high').length;
    const thoroughness = Math.min(1.0, stepCount / 5);
    const impactScore = stepCount > 0 ? highImpactSteps / stepCount : 0;

    // IMPROVED: Combine structural heuristics (50%) with traditional metrics (50%)
    const structuralScore = (0.5 * referencesFindings) + (0.3 * edgeCaseCoverageScore) + (0.2 * (1 - concisenessPenalty));
    const traditionalScore = (thoroughness * 0.6) + (impactScore * 0.4);
    
    const reward = (structuralScore * 0.5) + (traditionalScore * 0.5);

    return Math.max(0.0, Math.min(1.0, reward));
  }

  /**
   * Compute combined reward signal
   * @param {Object} codeRabbitReview - CodeRabbit review
   * @param {Object} testResults - Test execution results
   * @param {Array} reasoningFlow - Reasoning flow steps
   * @returns {number} Combined reward between 0.0 and 1.0
   */
  computeCombinedReward(codeRabbitReview, testResults, reasoningFlow, reasoningText = '') {
    const codeQualityReward = this.computeCodeQualityReward(codeRabbitReview);
    const testExecutionReward = this.computeTestExecutionReward(testResults);
    const reasoningReward = this.computeReasoningReward(reasoningFlow, codeRabbitReview, reasoningText);

    // Weighted combination
    const combined = (
      codeQualityReward * this.weights.codeQuality +
      testExecutionReward * this.weights.testExecution +
      reasoningReward * this.weights.reasoning
    );

    // IMPROVED: Return diagnostic vector for debugging
    return {
      combined: Math.max(0.0, Math.min(1.0, combined)),
      components: {
        codeQuality: codeQualityReward,
        testExecution: testExecutionReward,
        reasoning: reasoningReward
      },
      raw: {
        codeQuality: codeQualityReward,
        testExecution: testExecutionReward,
        reasoning: reasoningReward,
        weights: this.weights
      }
    };
  }

  /**
   * Format workflow data for training
   * @param {Object} workflow - Workflow document
   * @returns {Object} Formatted training data
   */
  formatForTraining(workflow) {
    return {
      input: {
        code: workflow.github?.diff || '',
        jiraContext: workflow.jiraTicketKey || '',
        codeRabbitFindings: workflow.codeRabbitReview || null,
        repoStructure: workflow.github?.repoStructure || null
      },
      output: {
        testPlan: workflow.aiPlanning?.plan || null,
        generatedCode: workflow.aiGeneration?.generatedCode || '',
        reasoning: workflow.aiPlanning?.reasoning || ''
      },
      reward: workflow.rlTraining?.averageReward || 0,
      metadata: {
        language: workflow.aiGeneration?.language || 'javascript',
        framework: workflow.aiGeneration?.framework || 'jest',
        timestamp: workflow.createdAt || new Date(),
        workflowId: workflow.workflowId
      }
    };
  }
}

export default new RewardCalculatorService();

