import mongoose from 'mongoose';

const workflowSchema = new mongoose.Schema({
  workflowId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  jiraTicketKey: {
    type: String,
    required: false, // Allow null - will be auto-created if missing
    index: true
  },
  jiraProjectKey: {
    type: String,
    required: false
  },
  jiraTicketSummary: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  
  // GitHub Info
  github: {
    prUrl: String,
    prNumber: Number,
    branch: String,
    commitSha: String,
    diff: String,
    files: [{
      filename: String,
      additions: Number,
      deletions: Number
    }],
    isPR: Boolean,
    repoStructure: mongoose.Schema.Types.Mixed // Store organized repo structure
  },
  
  // AI Planning (Gemini)
  aiPlanning: {
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'complete', 'failed'],
      default: 'pending'
    },
    plan: {
      unitTests: Number,
      integrationTests: Number,
      edgeCases: Number,
      frontend: mongoose.Schema.Types.Mixed, // Organized plan by category
      backend: mongoose.Schema.Types.Mixed,
      devops: mongoose.Schema.Types.Mixed
    },
    reasoning: String,
    reasoningFlow: [mongoose.Schema.Types.Mixed], // Store reasoning flow steps
    completedAt: Date
  },
  
  // AI Generation (MiniMax)
  aiGeneration: {
    status: {
      type: String,
      enum: ['pending', 'generating', 'complete', 'failed'],
      default: 'pending'
    },
    generatedCode: String,
    language: String,
    framework: String,
    testCount: Number,
    linesOfCode: Number,
    completedAt: Date
  },
  
  // Test Execution Results
  testExecution: {
    status: {
      type: String,
      enum: ['pending', 'executing', 'passed', 'partial', 'failed'],
      default: 'pending'
    },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    coverage: { type: Number, default: 0 },
    executionTime: { type: Number, default: 0 },
    simulated: { type: Boolean, default: true },
    breakdown: {
      unitTests: {
        passed: { type: Number, default: 0 },
        failed: { type: Number, default: 0 }
      },
      integrationTests: {
        passed: { type: Number, default: 0 },
        failed: { type: Number, default: 0 }
      },
      edgeCases: {
        passed: { type: Number, default: 0 },
        failed: { type: Number, default: 0 }
      }
    },
    executedAt: Date,
    // IMPROVED: Test run history for flakiness detection
    runHistory: [{
      timestamp: { type: Date, default: Date.now },
      passed: Number,
      failed: Number,
      total: Number,
      coverage: Number,
      passRate: Number,
      workflowId: String // Link to workflow that ran this test
    }],
    // Flakiness metrics (computed from run history)
    flakiness: { type: Number, default: 0 }, // 0.0 to 1.0 (0 = stable, 1 = very flaky)
    stability: { type: Number, default: 1.0 }, // 0.0 to 1.0 (1 = stable, 0 = unstable)
    runCount: { type: Number, default: 1 } // Number of times this test has been run
  },
  
  // RL Training Data
  rlTraining: {
    enabled: { type: Boolean, default: true },
    rewards: [{
      timestamp: { type: Date, default: Date.now },
      codeQualityReward: { type: Number, default: 0 },
      testExecutionReward: { type: Number, default: 0 },
      reasoningReward: { type: Number, default: 0 },
      combinedReward: { type: Number, default: 0 },
      modelVersion: { type: String, default: 'gemini-1.5-flash-v1.0' }
    }],
    averageReward: { type: Number, default: 0 },
    improvementTrend: {
      type: String,
      enum: ['improving', 'stable', 'declining', 'unknown'],
      default: 'unknown'
    },
    trainingData: {
      input: mongoose.Schema.Types.Mixed,
      output: mongoose.Schema.Types.Mixed,
      reward: Number,
      metadata: mongoose.Schema.Types.Mixed
    },
    highQuality: { type: Boolean, default: false } // reward > 0.75
  },
  
  // CodeRabbit Review
  codeRabbitReview: {
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'complete', 'no_pr_available', 'failed'],
      default: 'pending'
    },
    issues: {
      resolved: Number,
      warnings: Number,
      critical: Number
    },
    criticalIssues: [String],
    warnings: [String],
    message: String, // Status message (e.g., "No PR available")
    completedAt: Date
  },
  
  // Jira Subtask
  jiraSubtask: {
    created: {
      type: Boolean,
      default: false
    },
    issueKey: String,
    issueUrl: String,
    parentKey: String,
    createdAt: Date
  },
  
  // Metadata
  createdBy: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  error: String
}, {
  timestamps: true
});

// Helper methods
workflowSchema.methods.updateAIPlanningStatus = function(status, data = {}) {
  this.aiPlanning.status = status;
  if (data.plan) this.aiPlanning.plan = data.plan;
  if (data.reasoning) this.aiPlanning.reasoning = data.reasoning;
  if (data.reasoningFlow) this.aiPlanning.reasoningFlow = data.reasoningFlow;
  if (status === 'complete') this.aiPlanning.completedAt = new Date();
  return this.save();
};

workflowSchema.methods.updateAIGenerationStatus = function(status, data = {}) {
  this.aiGeneration.status = status;
  if (data.generatedCode) this.aiGeneration.generatedCode = data.generatedCode;
  if (data.language) this.aiGeneration.language = data.language;
  if (data.framework) this.aiGeneration.framework = data.framework;
  if (data.testCount) this.aiGeneration.testCount = data.testCount;
  if (data.linesOfCode) this.aiGeneration.linesOfCode = data.linesOfCode;
  if (status === 'complete') this.aiGeneration.completedAt = new Date();
  return this.save();
};

workflowSchema.methods.updateCodeRabbitStatus = function(status, data = {}) {
  // Validate status is in enum before setting
  const validStatuses = ['pending', 'reviewing', 'complete', 'no_pr_available', 'failed'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid CodeRabbit status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
  }
  
  this.codeRabbitReview.status = status;
  if (data.issues) this.codeRabbitReview.issues = data.issues;
  if (data.criticalIssues) this.codeRabbitReview.criticalIssues = data.criticalIssues;
  if (data.warnings) this.codeRabbitReview.warnings = data.warnings;
  if (data.message) this.codeRabbitReview.message = data.message;
  if (status === 'complete' || status === 'no_pr_available') this.codeRabbitReview.completedAt = new Date();
  
  // Use set() to bypass validation if needed (shouldn't be necessary, but defensive)
  return this.save({ validateBeforeSave: true });
};

// Delete existing model if it exists to force recompilation with new schema
if (mongoose.models.Workflow) {
  delete mongoose.models.Workflow;
  delete mongoose.modelSchemas.Workflow;
}

export default mongoose.model('Workflow', workflowSchema);

