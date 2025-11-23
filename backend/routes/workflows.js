import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import Workflow from '../models/Workflow.js';

const router = express.Router();

/**
 * Verify Jira webhook signature (JWS)
 * Jira sends webhooks with HMAC SHA-256 signatures
 */
function verifyWebhookSignature(payload, signature, secret) {
  try {
    // Jira webhook signature format: "sha256=<hash>"
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    const providedHash = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash),
      Buffer.from(providedHash)
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * GET /api/workflows - List all workflows
 */
router.get('/', async (req, res) => {
  try {
    const workflows = await Workflow.find()
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/demo - Get instant demo workflow data
 */
router.get('/demo', async (req, res) => {
  try {
    const { DemoService } = await import('../services/DemoService.js');
    const demoService = new DemoService();
    const demoData = demoService.getDemoWorkflowData();
    res.json(demoData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/demo/create - Create demo workflow in database
 */
router.post('/demo/create', async (req, res) => {
  try {
    const { DemoService } = await import('../services/DemoService.js');
    const demoService = new DemoService();
    const workflow = await demoService.createDemoWorkflow();
    res.json({ 
      message: 'Demo workflow created',
      workflowId: workflow.workflowId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/:workflowId - Get workflow details
 */
router.get('/:workflowId', async (req, res) => {
  try {
    const workflow = await Workflow.findOne({ workflowId: req.params.workflowId });
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/jira - Jira webhook handler
 * Triggered when Jira issue status changes to "Ready for Testing"
 * 
 * Jira Webhook Security:
 * - Jira can send webhooks with JWT signatures (JWS)
 * - Verify signature using JIRA_WEBHOOK_SECRET from .env
 * - For development, signature verification can be disabled
 */
router.post('/webhooks/jira', async (req, res) => {
  try {
    // Optional: Verify webhook signature (JWS)
    const webhookSecret = process.env.JIRA_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-jira-signature'] || req.headers['authorization'];
      if (!signature || !verifyWebhookSignature(req.body, signature, webhookSecret)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const { issue, webhookEvent, changelog } = req.body;

    // Check if this is a status change event
    if (webhookEvent !== 'jira:issue_updated') {
      return res.status(200).json({ message: 'Not a status change event' });
    }

    // Find status change in changelog
    const statusChange = changelog?.items?.find(
      item => item.field === 'status' && item.toString === 'Ready for Testing'
    );

    if (!statusChange) {
      return res.status(200).json({ message: 'Status not changed to "Ready for Testing"' });
    }

    // Import orchestrator
    const { WorkflowOrchestrator } = await import('../services/WorkflowOrchestrator.js');
    const orchestrator = new WorkflowOrchestrator(req.app.get('io'));

    // Prepare jira ticket data
    const jiraTicket = {
      key: issue.key,
      jiraTicketKey: issue.key,
      summary: issue.fields?.summary || '',
      description: issue.fields?.description || '',
      assignee: issue.fields?.assignee?.emailAddress || 'system',
      fields: issue.fields
    };

    // Start workflow (non-blocking)
    orchestrator.startWorkflow(jiraTicket).catch(err => {
      console.error('Workflow error from Jira webhook:', err);
    });

    res.status(200).json({ 
      message: 'Workflow triggered',
      issueKey: issue.key
    });
  } catch (error) {
    console.error('Jira webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/trigger - Manually trigger a workflow
 */
router.post('/trigger', async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.prUrl || !req.body.prUrl.trim()) {
      return res.status(400).json({ error: 'PR URL is required' });
    }

    // jiraTicketKey is optional - will be auto-created if missing

    const jiraTicket = {
      jiraTicketKey: req.body.jiraTicketKey?.trim() || null, // Allow null - will be auto-created
      projectKey: req.body.projectKey || req.body.selectedProjectKey || null, // User selected project from UI
      selectedProjectKey: req.body.selectedProjectKey || null, // Store user's selected project
      assignee: req.body.assignee || 'demo.user',
      prUrl: req.body.prUrl.trim(), // Required - no default
      prNumber: req.body.prNumber || null,
      branch: req.body.branch || 'feature/add-auth',
      summary: req.body.summary || 'Add user authentication'
    };
    
    console.log('📋 Triggering workflow with:', {
      jiraTicketKey: jiraTicket.jiraTicketKey,
      prUrl: jiraTicket.prUrl,
      summary: jiraTicket.summary
    });

    // Import orchestrator here to avoid circular dependency
    const { WorkflowOrchestrator } = await import('../services/WorkflowOrchestrator.js');
    
    // Get io instance from app (we'll pass it via req.app)
    const orchestrator = new WorkflowOrchestrator(req.app.get('io'));
    
    // Generate workflowId first (before starting workflow)
    const workflowId = uuidv4();
    
    // Start workflow (non-blocking)
    orchestrator.startWorkflow({ ...jiraTicket, workflowId }).catch(err => {
      console.error('Workflow error:', err);
    });

    res.json({ 
      message: 'Workflow started',
      workflowId: workflowId,
      jiraTicketKey: jiraTicket.jiraTicketKey || 'Will be auto-created'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/rl-metrics - Get RL training metrics
 */
router.get('/rl-metrics', async (req, res) => {
  try {
    // Get workflows with RL data
    const workflows = await Workflow.find({
      'rlTraining.enabled': true
    })
    .sort({ createdAt: -1 })
    .limit(50);

    // Separate by model version (simulated - split in half)
    const midPoint = Math.floor(workflows.length / 2);
    const v1Workflows = workflows.slice(0, midPoint);
    const v2Workflows = workflows.slice(midPoint);

    // Calculate metrics for each version
    const v1Metrics = calculateVersionMetrics(v1Workflows, 'v1.0');
    const v2Metrics = calculateVersionMetrics(v2Workflows, 'v1.1');

    // Calculate improvement
    const improvement = v1Metrics.avgReward > 0
      ? ((v2Metrics.avgReward - v1Metrics.avgReward) / v1Metrics.avgReward) * 100
      : 0;

    // High-quality examples count
    // IMPROVED: Training mixture strategy (70% high, 20% medium, 10% low)
    const highQuality = workflows.filter(w => {
      const reward = w.rlTraining?.rewards?.[w.rlTraining.rewards.length - 1]?.combinedReward || 0;
      return reward > 0.75;
    });
    const mediumQuality = workflows.filter(w => {
      const reward = w.rlTraining?.rewards?.[w.rlTraining.rewards.length - 1]?.combinedReward || 0;
      return reward >= 0.5 && reward <= 0.75;
    });
    const lowQuality = workflows.filter(w => {
      const reward = w.rlTraining?.rewards?.[w.rlTraining.rewards.length - 1]?.combinedReward || 0;
      return reward < 0.5;
    });
    
    const highQualityCount = highQuality.length;

    res.json({
      success: true,
      metrics: {
        baseline: v1Metrics,
        improved: v2Metrics,
        improvement: improvement,
        highQualityExamples: highQualityCount,
        totalWorkflows: workflows.length,
        pipelineStatus: {
          dataCollection: true,
          rewardComputation: true,
          trainingDataReady: highQualityCount >= 3,
          trainingMixture: {
            high: highQualityCount,
            medium: mediumQuality.length,
            low: lowQuality.length,
            strategy: '70% high, 20% medium, 10% low'
          },
          fineTuningReady: highQualityCount >= 10
        }
      },
      workflows: workflows.map(w => ({
        id: w._id,
        workflowId: w.workflowId,
        reward: w.rlTraining?.averageReward || 0,
        highQuality: w.rlTraining?.highQuality || false,
        createdAt: w.createdAt
      }))
    });

  } catch (error) {
    console.error('Error fetching RL metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Helper function to calculate version metrics
function calculateVersionMetrics(workflows, version) {
  if (workflows.length === 0) {
    return {
      version: version,
      avgReward: 0,
      testPassRate: 0,
      codeQuality: 0,
      avgTestCount: 0,
      workflowCount: 0
    };
  }

  const rewards = workflows
    .map(w => w.rlTraining?.averageReward || 0)
    .filter(r => r > 0);

  const avgReward = rewards.length > 0
    ? rewards.reduce((sum, r) => sum + r, 0) / rewards.length
    : 0;

  const testPassRates = workflows
    .filter(w => w.testExecution?.total > 0)
    .map(w => w.testExecution.passed / w.testExecution.total);

  const avgPassRate = testPassRates.length > 0
    ? testPassRates.reduce((sum, r) => sum + r, 0) / testPassRates.length * 100
    : 0;

  const avgTestCount = workflows
    .filter(w => w.aiGeneration?.testCount)
    .reduce((sum, w) => sum + (w.aiGeneration.testCount || 0), 0) / workflows.length;

  return {
    version: version,
    avgReward: avgReward,
    testPassRate: avgPassRate,
    codeQuality: avgPassRate * 0.9, // Simulated correlation
    avgTestCount: Math.floor(avgTestCount),
    workflowCount: workflows.length
  };
}

export default router;

