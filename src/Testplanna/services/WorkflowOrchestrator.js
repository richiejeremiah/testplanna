import { v4 as uuidv4 } from 'uuid';
import Workflow from '../models/Workflow.js';
import AuditLog from '../models/AuditLog.js';
import { WorkflowBroadcaster } from './WorkflowBroadcaster.js';
import { GitHubService } from './GitHubService.js';
import { GeminiService } from './GeminiService.js';
import { MiniMaxService } from './MiniMaxService.js';
import { CodeRabbitService } from './CodeRabbitService.js';
import { JiraService } from './JiraService.js';
import TestExecutionService from './TestExecutionService.js';
import RewardCalculatorService from './RewardCalculatorService.js';
import Logger from '../utils/logger.js';
import crypto from 'crypto';

/**
 * WorkflowOrchestrator - Orchestrates the entire test generation workflow
 */
export class WorkflowOrchestrator {
  constructor(io) {
    this.github = new GitHubService();
    this.gemini = new GeminiService();
    this.minimax = new MiniMaxService();
    this.coderabbit = new CodeRabbitService();
    this.jira = new JiraService();
    this.testExecution = TestExecutionService;
    this.rewardCalculator = RewardCalculatorService;
    this.broadcaster = new WorkflowBroadcaster(io);
  }

  /**
   * Start a new workflow
   * Returns the workflowId
   */
  async startWorkflow(jiraTicket) {
    const workflowId = jiraTicket.workflowId || uuidv4();
    const logger = new Logger(workflowId);
    
    // Extract and store jiraTicketKey early (allow null - will be auto-created)
    const jiraTicketKey = jiraTicket.jiraTicketKey || jiraTicket.key || null;
    
    logger.separator();
    if (jiraTicketKey) {
    logger.workflow(`Starting workflow for Jira ticket: ${jiraTicketKey}`);
    } else {
      logger.workflow('Starting workflow (Jira ticket will be auto-created)');
    }
    
    // 1. Create workflow in database
    logger.data('Creating workflow with Jira Ticket Key', jiraTicketKey || 'Will be auto-created');
    
    const workflow = await Workflow.create({
      workflowId,
      jiraTicketKey: jiraTicketKey || null, // Allow null - will be auto-created if missing
      jiraProjectKey: jiraTicket.projectKey || jiraTicket.selectedProjectKey || null,
      jiraTicketSummary: jiraTicket.summary || null,
      status: 'pending',
      createdBy: jiraTicket.assignee || jiraTicket.fields?.assignee?.emailAddress || 'system',
      createdAt: new Date()
    });

    // Store jiraTicketKey if provided (may be null - will be auto-created later)
    if (jiraTicketKey) {
      workflow.jiraTicketKey = jiraTicketKey;
      await workflow.save();
    }
    // Store in workflow object for later use
    workflow._jiraTicketKey = jiraTicketKey;
    logger.success(`Workflow created in database: ${workflowId}`);

    // 2. Start the pipeline
    try {
      workflow.status = 'running';
      await workflow.save();
      logger.workflow('Pipeline started');

      // STEP 0: Find associated GitHub PR (CRITICAL)
      logger.step('STEP 0: Finding associated GitHub PR');
      const prUrl = await this.findAssociatedPR(jiraTicket, logger);
      if (!prUrl) {
        throw new Error('No GitHub PR found for this Jira ticket. Please link a PR in the ticket description or comments.');
      }
      logger.success(`Found PR: ${prUrl}`);

      // Update jiraTicket with PR URL
      jiraTicket.prUrl = prUrl;

      // STEP 1: Fetch GitHub context
      await this.fetchGitHubContext(workflow, prUrl, logger);

      // STEP 2: CodeRabbit Review (BEFORE test planning - informs test strategy)
      // CodeRabbit identifies security issues, architectural concerns, and code quality problems
      // These insights will be used to create better, more targeted tests
      await this.runCodeRabbitReviewStep(workflow, logger);

      // STEP 3: AI Planning (now informed by CodeRabbit findings)
      await this.runAIPlanningStep(workflow, jiraTicket, logger);

      // STEP 4: AI Generation (uses CodeRabbit insights to focus on problem areas)
      await this.runAIGenerationStep(workflow, logger);

      // STEP 5: Execute Generated Tests
      await this.runTestExecutionStep(workflow, logger);

      // STEP 6: Compute Reward Signals
      await this.runRewardComputationStep(workflow, logger);

      // STEP 7: Push to Jira (includes CodeRabbit findings in subtask)
      await this.createJiraSubtaskStep(workflow, logger);

      // Mark workflow complete
      workflow.status = 'completed';
      workflow.completedAt = new Date();
      await workflow.save();

      logger.workflow('✅ Workflow completed successfully!');
      logger.separator();

      await this.broadcaster.broadcastWorkflowStatus(workflowId, 'completed');
      
      return workflowId;

    } catch (error) {
      const logger = new Logger(workflowId);
      logger.error('Workflow failed', error);
      logger.separator();
      
      workflow.status = 'failed';
      workflow.error = error.message;
      await workflow.save();

      await this.broadcaster.broadcastWorkflowStatus(workflowId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * STEP 0: Find associated GitHub PR
   */
  async findAssociatedPR(jiraTicket, logger) {
    logger.data('Jira Ticket Key', jiraTicket.jiraTicketKey || jiraTicket.key);
    
    // Try multiple methods to find PR
    
    // Method 1: Direct PR URL from jiraTicket
    if (jiraTicket.prUrl) {
      logger.data('Method', 'Direct PR URL from request');
      return jiraTicket.prUrl;
    }

    // Method 2: GitHub service discovery
    logger.data('Method', 'GitHub service discovery');
    const prUrl = await this.github.findAssociatedPR(jiraTicket);
    if (prUrl) {
      logger.data('Found via', 'GitHub service');
      return prUrl;
    }

    // Method 3: Jira service extraction
    if (jiraTicket.fields || jiraTicket.key) {
      logger.data('Method', 'Jira issue extraction');
      // Get full issue details from Jira
      const { issue, error } = await this.jira.getIssue(jiraTicket.key || jiraTicket.jiraTicketKey);
      if (issue) {
        const extractedUrl = this.jira.extractPRUrl(issue);
        if (extractedUrl) {
          logger.data('Found via', 'Jira issue description');
          return extractedUrl;
        }
      } else if (error) {
        logger.warning(`Could not extract PR from Jira issue: ${error.message}`);
      }
    }

    logger.warning('No PR found using any method');
    return null;
  }

  /**
   * STEP 1: Fetch GitHub context
   * Detects if PR or repo, fetches appropriate context
   */
  async fetchGitHubContext(workflow, prUrl, logger) {
    logger.step('STEP 1: Fetching GitHub code context');
    logger.data('PR URL', prUrl);
    
    // Broadcast GitHub node
    await this.broadcaster.broadcastNodeCreated(workflow.workflowId, {
      type: 'github-push',
      label: 'GitHub Push',
      prUrl: prUrl,
      status: 'fetching'
    });

    // Get code context from GitHub
    const codeContext = await this.github.getCodeContext(prUrl, logger);

    logger.data('Branch', codeContext.branch);
    logger.data('Commit SHA', codeContext.commitSha?.substring(0, 8));
    logger.data('Files Changed', codeContext.files.length);
    logger.data('Diff Size', `${(codeContext.diff?.length || 0) / 1024} KB`);

    workflow.github = {
      prUrl: codeContext.prUrl,
      prNumber: codeContext.prNumber,
      branch: codeContext.branch,
      commitSha: codeContext.commitSha,
      diff: codeContext.diff,
      files: codeContext.files
    };
    await workflow.save();

    logger.success('GitHub context fetched and saved');

    // Update GitHub node
    await this.broadcaster.broadcastNodeUpdated(workflow.workflowId, 'github-push', {
      status: 'ready',
      prNumber: codeContext.prNumber,
      branch: codeContext.branch,
      filesChanged: codeContext.files.length,
      isPR: codeContext.isPR !== false, // Store PR flag
      repoStructure: codeContext.repoStructure || null // Store repo structure if fetched
    });

    // If no PR, fetch full repo structure for later use
    if (!codeContext.isPR) {
      const detection = this.github.detectPRorRepo(prUrl);
      if (detection && !detection.isPR) {
        logger.data('Preparing', 'Full repository structure for analysis');
        // Will be fetched in Gemini step to avoid blocking
      }
    }
  }

  /**
   * STEP 3: AI Planning (Gemini)
   * Now informed by CodeRabbit review findings
   */
  async runAIPlanningStep(workflow, jiraTicket, logger) {
    logger.step('STEP 3: AI Planning with Gemini (informed by CodeRabbit)');
    
    // Update UI: Show AI Planning node
    await this.broadcaster.broadcastNodeCreated(workflow.workflowId, {
      type: 'ai-review',
      label: 'AI Review',
      status: 'analyzing',
      provider: 'Gemini + MiniMax'
    });

    // Edge from CodeRabbit to AI Review will be created after CodeRabbit completes
    // (CodeRabbit now runs before AI planning)

    // Update workflow status
    await workflow.updateAIPlanningStatus('analyzing');

    // Code context already fetched in fetchGitHubContext
    // CodeRabbit review already completed - use its insights
    const codeRabbitReview = workflow.codeRabbitReview;
    const isPR = workflow.github.isPR !== false; // Default to true if not set
    const codeRabbitInsights = codeRabbitReview?.status === 'complete' || codeRabbitReview?.status === 'no_pr_available'
      ? this.formatCodeRabbitInsightsForPlanning(codeRabbitReview)
      : null;
    
    if (codeRabbitInsights) {
      if (codeRabbitReview?.status === 'no_pr_available') {
        logger.data('CodeRabbit Status', 'No PR available - proceeding with full repo analysis');
      } else {
        logger.data('Using CodeRabbit insights', `${codeRabbitReview.issues?.critical || 0} critical, ${codeRabbitReview.issues?.warnings || 0} warnings`);
      }
    }
    
    // If no PR, fetch full repo structure
    let repoStructure = null;
    if (!isPR) {
      logger.data('Fetching', 'Full repository structure for analysis');
      const detection = this.github.detectPRorRepo(workflow.github.prUrl);
      if (detection && !detection.isPR) {
        repoStructure = await this.github.getFullRepoStructure(
          detection.owner,
          detection.repo,
          detection.branch || 'main',
          logger
        );
        if (repoStructure) {
          logger.data('Repo Structure', `Frontend: ${repoStructure.categories.frontend.count}, Backend: ${repoStructure.categories.backend.count}, DevOps: ${repoStructure.categories.devops.count}`);
        }
      }
    }
    
    // Call Gemini for test planning (with CodeRabbit insights and repo structure if no PR)
    logger.data('Calling', `Gemini API for ${isPR ? 'PR' : 'full repository'} test planning`);
    const testPlan = await this.gemini.planTestCoverage(
      jiraTicket,
      workflow.github.diff,
      codeRabbitInsights, // Pass CodeRabbit insights
      repoStructure, // Pass repo structure if no PR
      isPR, // Pass PR flag
      logger
    );

    logger.data('Unit Tests Planned', testPlan.testPlan.unitTests);
    logger.data('Integration Tests Planned', testPlan.testPlan.integrationTests);
    logger.data('Edge Cases Planned', testPlan.testPlan.edgeCases);
    logger.data('Reasoning Length', `${testPlan.reasoning.length} chars`);

    // Update workflow with plan (including reasoning flow and organized structure)
    await workflow.updateAIPlanningStatus('complete', {
      plan: testPlan.testPlan,
      reasoning: testPlan.reasoning,
      reasoningFlow: testPlan.reasoningFlow || []
    });

    // Update UI with reasoning flow
    await this.broadcaster.broadcastNodeUpdated(workflow.workflowId, 'ai-review', {
      status: 'complete',
      plan: testPlan.testPlan,
      reasoning: testPlan.reasoning,
      reasoningFlow: testPlan.reasoningFlow || [],
      unitTests: testPlan.testPlan.unitTests,
      integrationTests: testPlan.testPlan.integrationTests,
      edgeCases: testPlan.testPlan.edgeCases
    });

    logger.success('AI planning completed');
  }

  /**
   * STEP 4: AI Generation (MiniMax)
   * Uses CodeRabbit insights to focus test generation on problem areas
   */
  async runAIGenerationStep(workflow, logger) {
    logger.step('STEP 4: AI Code Generation with MiniMax (addressing CodeRabbit findings)');
    
    // Create AI Generation node (already created in planning step, just update)
    await this.broadcaster.broadcastNodeUpdated(workflow.workflowId, 'ai-review', {
      status: 'generating',
      phase: 'code-generation'
    });

    await workflow.updateAIGenerationStatus('generating');

    // Determine language from code context
    const language = this.detectLanguage(workflow.github.files);
    logger.data('Detected Language', language);

    // Get CodeRabbit insights for test generation
    const codeRabbitReview = workflow.codeRabbitReview;
    const isPR = workflow.github.isPR !== false;
    const codeRabbitInsights = codeRabbitReview?.status === 'complete' || codeRabbitReview?.status === 'no_pr_available'
      ? {
          status: codeRabbitReview.status,
          criticalIssues: codeRabbitReview.criticalIssues || [],
          warnings: codeRabbitReview.warnings || [],
          issues: codeRabbitReview.issues || {}
        }
      : null;
    
    if (codeRabbitInsights && codeRabbitInsights.status !== 'no_pr_available') {
      logger.data('Addressing CodeRabbit findings', `${codeRabbitInsights.issues.critical || 0} critical issues, ${codeRabbitInsights.issues.warnings || 0} warnings`);
    }
    
    // Get repo structure if no PR
    let repoStructure = null;
    if (!isPR && workflow.github.repoStructure) {
      repoStructure = workflow.github.repoStructure;
      logger.data('Using organized repo structure', 'Frontend, Backend, DevOps');
    }
    
    // Call MiniMax for test generation (with CodeRabbit insights and repo structure)
    logger.data('Calling', `MiniMax API for ${isPR ? 'PR' : 'organized repository'} test generation`);
    const generatedTests = await this.minimax.generateTestCode(
      workflow.aiPlanning.plan,
      workflow.github.diff,
      language,
      codeRabbitInsights, // Pass CodeRabbit insights
      repoStructure, // Pass repo structure if no PR
      isPR, // Pass PR flag
      logger
    );

    logger.data('Tests Generated', generatedTests.testCount);
    logger.data('Framework', generatedTests.framework);
    logger.data('Lines of Code', generatedTests.linesOfCode);
    logger.data('Code Size', `${(generatedTests.code?.length || 0) / 1024} KB`);

    // Save generated code
    await workflow.updateAIGenerationStatus('complete', {
      generatedCode: generatedTests.code,
      language: generatedTests.language,
      framework: generatedTests.framework,
      testCount: generatedTests.testCount,
      linesOfCode: generatedTests.linesOfCode
    });

    logger.success('Test code generated successfully');

    // Update UI - Send full generated code so frontend can parse individual tests
    await this.broadcaster.broadcastNodeUpdated(workflow.workflowId, 'ai-review', {
      status: 'complete',
      testCount: generatedTests.testCount,
      language: generatedTests.language,
      framework: generatedTests.framework,
      linesOfCode: generatedTests.linesOfCode,
      generatedCode: generatedTests.code // Send FULL code, not preview
    });
  }

  /**
   * STEP 2: CodeRabbit Review
   * Reviews the ORIGINAL PR to identify:
   * - Security vulnerabilities
   * - Architectural concerns
   * - Code quality issues
   * - Race conditions
   * 
   * These insights inform test planning and generation to ensure
   * tests address actual code problems, not just code structure.
   */
  async runCodeRabbitReviewStep(workflow, logger) {
    logger.step('STEP 2: CodeRabbit Review (informing test strategy)');
    
    // Create CodeRabbit Review node
    await this.broadcaster.broadcastNodeCreated(workflow.workflowId, {
      type: 'coderabbit-review',
      label: 'CodeRabbit Review',
      status: 'reviewing',
      note: 'Reviewing original PR code quality'
    });

    // Create edge from GitHub to CodeRabbit (CodeRabbit reviews first)
    await this.broadcaster.broadcastEdgeCreated(
      workflow.workflowId,
      'github-push',
      'coderabbit-review'
    );

    await workflow.updateCodeRabbitStatus('reviewing');

    // Fetch CodeRabbit's existing review of the ORIGINAL PR
    // (CodeRabbit already reviewed the PR before workflow started)
    logger.data('Checking', 'CodeRabbit review status');
    const reviewResult = await this.coderabbit.checkReviewStatus(
      workflow.github.prUrl,
      logger
    );

    if (reviewResult.status === 'no_pr_available') {
      logger.data('CodeRabbit Status', 'No PR available');
      logger.warning('CodeRabbit reviews PRs only - flow continues to Gemini for full repo analysis');
    } else {
      logger.data('Resolved Issues', reviewResult.issues?.resolved || 0);
      logger.data('Warnings', reviewResult.issues?.warnings || 0);
      logger.data('Critical Issues', reviewResult.issues?.critical || 0);
    }

    // Review complete (or no PR available)
    await workflow.updateCodeRabbitStatus(reviewResult.status, {
      issues: reviewResult.issues,
      criticalIssues: reviewResult.criticalIssues,
      warnings: reviewResult.warnings,
      message: reviewResult.message
    });

    logger.success('CodeRabbit review completed');

    // Update UI
    await this.broadcaster.broadcastNodeUpdated(
      workflow.workflowId,
      'coderabbit-review',
      {
        status: reviewResult.status === 'no_pr_available' ? 'no_pr' : 'complete',
        issues: reviewResult.issues,
        criticalIssues: reviewResult.criticalIssues,
        warnings: reviewResult.warnings,
        message: reviewResult.message || null
      }
    );

    // IMPROVED: Create immutable audit log for CodeRabbit review
    await this.createAuditLog(workflow.workflowId, 'codeRabbitReview', {
      issues: reviewResult.issues,
      status: reviewResult.status === 'no_pr_available' ? 'no_pr_available' : 'complete',
      criticalIssues: reviewResult.criticalIssues || [],
      warnings: reviewResult.warnings || []
    });

    // Create edge from CodeRabbit to AI Review (insights inform test planning)
    await this.broadcaster.broadcastEdgeCreated(
      workflow.workflowId,
      'coderabbit-review',
      'ai-review'
    );
  }

  /**
   * Format CodeRabbit insights for Gemini planning prompt
   */
  formatCodeRabbitInsightsForPlanning(codeRabbitReview) {
    if (!codeRabbitReview) {
      return null;
    }

    // Handle "no PR" case - return special marker
    if (codeRabbitReview.status === 'no_pr_available') {
      return 'no_pr_available';
    }

    // Only process if review is complete
    if (codeRabbitReview.status !== 'complete') {
      return null;
    }

    const insights = [];
    
    if (codeRabbitReview.issues?.critical > 0) {
      insights.push(`Critical Issues Found: ${codeRabbitReview.issues.critical}`);
      if (codeRabbitReview.criticalIssues?.length > 0) {
        insights.push(...codeRabbitReview.criticalIssues.slice(0, 5).map(issue => `  - ${issue}`));
      }
    }
    
    if (codeRabbitReview.issues?.warnings > 0) {
      insights.push(`Warnings: ${codeRabbitReview.issues.warnings}`);
      if (codeRabbitReview.warnings?.length > 0) {
        insights.push(...codeRabbitReview.warnings.slice(0, 5).map(warning => `  - ${warning}`));
      }
    }
    
    return insights.length > 0 ? insights.join('\n') : null;
  }

  /**
   * STEP 7: Create Jira Subtask
   */
  async createJiraSubtaskStep(workflow, logger) {
    logger.step('STEP 7: Creating Jira Subtask');
    
    // Create Jira Subtask node FIRST so it appears in UI even if creation fails
    await this.broadcaster.broadcastNodeCreated(workflow.workflowId, {
      type: 'jira-subtask',
      label: 'Jira Push',
      status: 'creating'
    });

    // Create edge from Reward Computation to Jira
    await this.broadcaster.broadcastEdgeCreated(
      workflow.workflowId,
      'reward-computation',
      'jira-subtask'
    );
    
    // Get jiraTicketKey - try multiple sources
    let jiraTicketKey = workflow.jiraTicketKey || workflow._jiraTicketKey;
    
    logger.data('Workflow jiraTicketKey (direct)', workflow.jiraTicketKey);
    logger.data('Workflow _jiraTicketKey (stored)', workflow._jiraTicketKey);
    logger.data('Workflow workflowId', workflow.workflowId);
    
    // If not found, refresh from database using workflowId
    if (!jiraTicketKey) {
      logger.warning('jiraTicketKey not found in workflow object, refreshing from DB');
      const refreshedWorkflow = await Workflow.findOne({ workflowId: workflow.workflowId });
      if (refreshedWorkflow && refreshedWorkflow.jiraTicketKey) {
        jiraTicketKey = refreshedWorkflow.jiraTicketKey;
        logger.data('jiraTicketKey from DB', jiraTicketKey);
        // Update workflow object for consistency
        workflow.jiraTicketKey = jiraTicketKey;
      }
    }
    
    // Auto-create parent ticket if missing
    if (!jiraTicketKey) {
      logger.warning('Jira ticket key is missing. Auto-creating parent ticket...');
      
      // Smart project discovery: Try multiple strategies
      let projectKey = workflow.jiraProjectKey; // User selected project (if connected)
      
      // Strategy 1: Use user's selected project (if they connected to Jira)
      if (!projectKey) {
        logger.data('Strategy', 'Listing user projects to find accessible project');
        
        // Check if credentials are available
        if (!process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
          logger.warning('Jira credentials not found in env', 'JIRA_EMAIL or JIRA_API_TOKEN missing');
        } else {
          logger.data('Using credentials', `Email: ${process.env.JIRA_EMAIL.substring(0, 3)}***`);
        }
        
        const projectsResult = await this.jira.listProjects(
          process.env.JIRA_EMAIL,
          process.env.JIRA_API_TOKEN
        );
        
        // Log the full result for debugging
        logger.data('Projects API result', `Has error: ${!!projectsResult.error}, Projects count: ${projectsResult.projects?.length || 0}`);
        
        if (projectsResult.error) {
          logger.warning('Could not list projects', projectsResult.error.message);
          logger.data('Error details', `Type: ${projectsResult.error.type}, Status: ${projectsResult.error.status || 'N/A'}`);
          if (projectsResult.error.details) {
            logger.data('Error response', JSON.stringify(projectsResult.error.details).substring(0, 200));
    }
    
          // If it's a credentials issue, log it clearly
          if (projectsResult.error.type === 'no_credentials' || projectsResult.error.type === 'unauthorized') {
            logger.error('Jira credentials issue', 'Check JIRA_EMAIL and JIRA_API_TOKEN in .env');
          }
        } else if (projectsResult.projects && projectsResult.projects.length > 0) {
          // Use first accessible project
          projectKey = projectsResult.projects[0].key;
          logger.success(`Found accessible project: ${projectKey} (${projectsResult.projects[0].name})`);
          logger.data('Available projects', `${projectsResult.projects.length} projects found`);
          if (projectsResult.projects.length > 1) {
            const otherProjects = projectsResult.projects.slice(1).map(p => `${p.key} (${p.name})`).join(', ');
            logger.data('Other available projects', otherProjects);
          }
        } else {
          logger.warning('No projects returned from Jira API (empty array)');
        }
      }
      
      // Strategy 2: Fallback to JIRA_PROJECT_KEY from env
      if (!projectKey) {
        projectKey = process.env.JIRA_PROJECT_KEY;
        if (projectKey) {
          logger.data('Strategy', `Using JIRA_PROJECT_KEY from env: ${projectKey}`);
        }
      }
      
      // Strategy 3: Last resort - try 'TEST' (might work if permissions allow)
      if (!projectKey) {
        projectKey = 'TEST';
        logger.warning('No project found, trying default: TEST');
      }
      
      const ticketSummary = workflow.jiraTicketSummary || workflow.github?.prTitle || 'Automated Test Generation Workflow';
      const ticketDescription = `Workflow ID: ${workflow.workflowId}\n\nThis ticket was auto-created for test generation workflow.`;
      
      logger.data('Creating parent ticket', `Project: ${projectKey}, Summary: ${ticketSummary}`);
      
      // Try to create parent ticket (with lenient validation)
      let createResult = await this.jira.createIssue(
        projectKey,
        ticketSummary,
        ticketDescription,
        'Task',
        process.env.JIRA_EMAIL,
        process.env.JIRA_API_TOKEN
      );
      
      // If creation failed due to project validation, try without strict validation
      if (createResult.error && createResult.error.type === 'project_not_found') {
        logger.warning(`Project ${projectKey} validation failed, but trying to create anyway (permissions might allow it)`);

        // Try to create directly without validation
        try {
          const directResult = await this.jira.createIssueDirectly(
            projectKey,
            ticketSummary,
            ticketDescription,
            'Task',
            process.env.JIRA_EMAIL,
            process.env.JIRA_API_TOKEN
          );
          if (directResult.issue) {
            createResult = directResult;
            logger.success('Direct creation succeeded despite validation failure');
          }
        } catch (directError) {
          logger.warning('Direct creation also failed', directError.message);
        }
      }
      
      if (createResult.error) {
        logger.error('Failed to auto-create parent ticket', createResult.error.message);
        
        // Try to get list of available projects for better error message
        const projectsResult = await this.jira.listProjects(
          process.env.JIRA_EMAIL,
          process.env.JIRA_API_TOKEN
        );
        let errorMessage = `Failed to auto-create parent ticket: ${createResult.error.message}`;
        if (projectsResult.projects && projectsResult.projects.length > 0) {
          const projectKeys = projectsResult.projects.map(p => p.key).join(', ');
          errorMessage += `\n\nAvailable projects: ${projectKeys}\nPlease set JIRA_PROJECT_KEY in .env to one of these, or connect to Jira in the UI to select a project.`;
        }
        
        // Update node to show error
        await this.broadcaster.broadcastNodeUpdated(workflow.workflowId, 'jira-subtask', {
          status: 'failed',
          error: errorMessage
        });
        throw new Error(errorMessage);
      }
      
      jiraTicketKey = createResult.issue.key;
      logger.success(`Auto-created parent ticket: ${jiraTicketKey} in project ${projectKey}`);
      
      // Save to workflow
      workflow.jiraTicketKey = jiraTicketKey;
      workflow.jiraProjectKey = projectKey;
      await workflow.save();
    }
    
    logger.data('Final jiraTicketKey to use', jiraTicketKey);

    // Prepare test data for Jira
    const testData = {
      testCode: workflow.aiGeneration.generatedCode,
      coveragePercentage: this.calculateCoverage(workflow),
      aiReasoning: workflow.aiPlanning.reasoning,
      codeRabbitInsights: this.formatCodeRabbitInsights(workflow.codeRabbitReview),
      codeRabbitStatus: this.getCodeRabbitStatusText(workflow.codeRabbitReview),
      language: workflow.aiGeneration.language,
      testCount: workflow.aiGeneration.testCount,
      // Add RL training data
      testExecutionResults: workflow.testExecution || null,
      rewardSignals: workflow.rlTraining?.rewards && workflow.rlTraining.rewards.length > 0
        ? workflow.rlTraining.rewards[workflow.rlTraining.rewards.length - 1]
        : null,
      highQuality: workflow.rlTraining?.highQuality || false
    };

    logger.data('Parent Ticket', jiraTicketKey);
    logger.data('Coverage', `${testData.coveragePercentage}%`);
    logger.data('Test Count', testData.testCount);

    // Push to Jira
    logger.data('Calling', 'Jira API to create subtask');
    const jiraResult = await this.jira.createTestSubtask(
      jiraTicketKey,
      testData,
      logger
    );

    logger.data('Created Issue Key', jiraResult.issueKey);
    logger.data('Issue URL', jiraResult.issueUrl);

    // Update workflow
    workflow.jiraSubtask = {
      created: true,
      issueKey: jiraResult.issueKey,
      issueUrl: jiraResult.issueUrl,
      parentKey: jiraTicketKey,
      createdAt: new Date()
    };
    await workflow.save();

    logger.success('Jira subtask created successfully');

    // Update UI with completed subtask
    await this.broadcaster.broadcastNodeUpdated(
      workflow.workflowId,
      'jira-subtask',
      {
        status: 'complete',
        issueKey: jiraResult.issueKey,
        jiraUrl: jiraResult.issueUrl,
        parentKey: workflow.jiraTicketKey,
        coverage: testData.coveragePercentage,
        testCount: testData.testCount
      }
    );
  }

  /**
   * STEP 5: Execute Generated Tests
   */
  async runTestExecutionStep(workflow, logger) {
    logger.step('STEP 5: Execute Generated Tests');

    // Broadcast node creation
    await this.broadcaster.broadcastNodeCreated(workflow.workflowId, {
      type: 'test-execution',
      status: 'executing',
      label: 'Test Execution'
    });

    // Execute tests (simulated)
    const testResults = await this.testExecution.executeTests(
      workflow.aiGeneration.generatedCode,
      workflow.aiGeneration.language,
      workflow.aiGeneration.framework
    );

    // IMPROVED: Compute flakiness from previous runs (if same test code)
    const testCodeHash = this.hashTestCode(workflow.aiGeneration.generatedCode);
    const previousRuns = await this.findPreviousTestRuns(testCodeHash, workflow.workflowId);
    
    // Calculate flakiness from run history
    const flakinessMetrics = this.computeFlakinessMetrics(testResults, previousRuns);

    // Store results with run history
    const passRate = testResults.total > 0 ? testResults.passed / testResults.total : 0;
    
    if (!workflow.testExecution) {
      workflow.testExecution = { runHistory: [] };
    }
    
    // Add current run to history
    workflow.testExecution.runHistory.push({
      timestamp: new Date(),
      passed: testResults.passed,
      failed: testResults.failed,
      total: testResults.total,
      coverage: testResults.coverage,
      passRate: passRate,
      workflowId: workflow.workflowId
    });

    // Keep only last 10 runs for flakiness calculation
    if (workflow.testExecution.runHistory.length > 10) {
      workflow.testExecution.runHistory = workflow.testExecution.runHistory.slice(-10);
    }

    // Update test execution results
    workflow.testExecution = {
      ...workflow.testExecution,
      status: testResults.passed === testResults.total ? 'passed' : 
              testResults.passed > 0 ? 'partial' : 'failed',
      passed: testResults.passed,
      failed: testResults.failed,
      total: testResults.total,
      coverage: testResults.coverage,
      executionTime: testResults.executionTime,
      simulated: testResults.simulated,
      breakdown: testResults.breakdown,
      executedAt: new Date(),
      flakiness: flakinessMetrics.flakiness,
      stability: flakinessMetrics.stability,
      runCount: workflow.testExecution.runHistory.length,
      testCodeHash: testCodeHash // Store hash for finding previous runs
    };
    await workflow.save();

    // IMPROVED: Create immutable audit log for test execution
    await this.createAuditLog(workflow.workflowId, 'testExecution', {
      passed: testResults.passed,
      failed: testResults.failed,
      total: testResults.total,
      coverage: testResults.coverage,
      passRate: passRate,
      flakiness: workflow.testExecution.flakiness,
      stability: workflow.testExecution.stability,
      runCount: workflow.testExecution.runCount,
      breakdown: testResults.breakdown
    });

    logger.success(`Tests executed: ${testResults.passed}/${testResults.total} passed`);
    logger.data('Coverage', `${testResults.coverage.toFixed(1)}%`);
    
    // Log flakiness metrics if available
    if (workflow.testExecution.flakiness !== undefined) {
      logger.data('Flakiness', `${(workflow.testExecution.flakiness * 100).toFixed(1)}%`);
      logger.data('Stability', `${(workflow.testExecution.stability * 100).toFixed(1)}%`);
      logger.data('Run Count', `${workflow.testExecution.runCount}`);
    }

    // Broadcast completion with flakiness metrics
    await this.broadcaster.broadcastNodeUpdated(workflow.workflowId, 'test-execution', {
      status: 'complete',
      passed: testResults.passed,
      failed: testResults.failed,
      total: testResults.total,
      coverage: testResults.coverage,
      flakiness: workflow.testExecution.flakiness || 0,
      stability: workflow.testExecution.stability || 1.0,
      runCount: workflow.testExecution.runCount || 1
    });

    // Create edge from AI Generation to Test Execution
    await this.broadcaster.broadcastEdgeCreated(
      workflow.workflowId,
      'ai-review',
      'test-execution'
    );
  }

  /**
   * STEP 6: Compute Reward Signals
   */
  async runRewardComputationStep(workflow, logger) {
    logger.step('STEP 6: Compute Reward Signals');

    // Broadcast node creation
    await this.broadcaster.broadcastNodeCreated(workflow.workflowId, {
      type: 'reward-computation',
      status: 'computing',
      label: 'Reward Signals'
    });

    // Compute individual rewards
    const codeQualityReward = this.rewardCalculator.computeCodeQualityReward(
      workflow.codeRabbitReview
    );

    const testExecutionReward = this.rewardCalculator.computeTestExecutionReward(
      workflow.testExecution
    );

    const reasoningReward = this.rewardCalculator.computeReasoningReward(
      workflow.aiPlanning.reasoningFlow,
      workflow.codeRabbitReview,
      workflow.aiPlanning.reasoning || ''
    );

    // Compute combined reward (now returns diagnostic object)
    const rewardResult = this.rewardCalculator.computeCombinedReward(
      workflow.codeRabbitReview,
      workflow.testExecution,
      workflow.aiPlanning.reasoningFlow,
      workflow.aiPlanning.reasoning || ''
    );

    const combinedReward = rewardResult.combined;

    // Initialize rlTraining if needed
    if (!workflow.rlTraining) {
      workflow.rlTraining = { 
        enabled: true, 
        rewards: [],
        improvementTrend: 'unknown'
      };
    }

    // Store reward with diagnostic vector (for debugging and anti-gaming)
    workflow.rlTraining.rewards.push({
      timestamp: new Date(),
      codeQualityReward: codeQualityReward,
      testExecutionReward: testExecutionReward,
      reasoningReward: reasoningReward,
      combinedReward: combinedReward,
      modelVersion: 'gemini-1.5-flash-v1.0',
      // IMPROVED: Diagnostic vector for auditing (helps detect gaming)
      diagnostic: {
        components: rewardResult.components || {
          codeQuality: codeQualityReward,
          testExecution: testExecutionReward,
          reasoning: reasoningReward
        },
        raw: rewardResult.raw || {
          codeQuality: codeQualityReward,
          testExecution: testExecutionReward,
          reasoning: reasoningReward,
          weights: this.rewardCalculator.weights
        },
        metadata: {
          testPassRate: workflow.testExecution?.total > 0 
            ? (workflow.testExecution.passed / workflow.testExecution.total) 
            : 0,
          testCoverage: workflow.testExecution?.coverage || 0,
          reasoningLength: (workflow.aiPlanning?.reasoning || '').length,
          codeRabbitStatus: workflow.codeRabbitReview?.status || 'unknown',
          testTotal: workflow.testExecution?.total || 0,
          testPassed: workflow.testExecution?.passed || 0
        }
      }
    });

    // IMPROVED: Create immutable audit log for reward computation
    await this.createAuditLog(workflow.workflowId, 'rewardComputation', {
      codeQualityReward: codeQualityReward,
      testExecutionReward: testExecutionReward,
      reasoningReward: reasoningReward,
      combinedReward: combinedReward,
      highQuality: combinedReward > 0.75,
      diagnostic: rewardResult.diagnostic || rewardResult,
      modelVersion: 'gemini-1.5-flash-v1.0'
    });

    // Update average
    const rewards = workflow.rlTraining.rewards;
    workflow.rlTraining.averageReward = 
      rewards.reduce((sum, r) => sum + r.combinedReward, 0) / rewards.length;

    // Mark high quality if reward > 0.75
    workflow.rlTraining.highQuality = combinedReward > 0.75;

    // Store training data
    workflow.rlTraining.trainingData = this.rewardCalculator.formatForTraining(workflow);

    await workflow.save();

    logger.success(`Reward computed: ${combinedReward.toFixed(3)}`);
    logger.data('Code Quality', codeQualityReward.toFixed(3));
    logger.data('Test Execution', testExecutionReward.toFixed(3));
    logger.data('Reasoning', reasoningReward.toFixed(3));

    if (combinedReward > 0.75) {
      logger.success('🌟 High-quality example - suitable for training');
    }

    // Broadcast completion with diagnostic vector
    await this.broadcaster.broadcastNodeUpdated(workflow.workflowId, 'reward-computation', {
      status: 'complete',
      combinedReward: combinedReward,
      breakdown: {
        codeQuality: codeQualityReward,
        testExecution: testExecutionReward,
        reasoning: reasoningReward
      },
      highQuality: combinedReward > 0.75,
      diagnostic: rewardResult.diagnostic || rewardResult // Include diagnostic for debugging
    });

    // Create edge from Test Execution to Reward Computation
    await this.broadcaster.broadcastEdgeCreated(
      workflow.workflowId,
      'test-execution',
      'reward-computation'
    );
  }

  /**
   * Hash test code for identifying same tests across runs
   * @param {string} testCode - Generated test code
   * @returns {string} Hash of test code
   */
  hashTestCode(testCode) {
    // Simple hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < testCode.length; i++) {
      const char = testCode.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Find previous test runs with same test code
   * @param {string} testCodeHash - Hash of test code
   * @param {string} currentWorkflowId - Current workflow ID (exclude from results)
   * @returns {Array} Previous test run results
   */
  async findPreviousTestRuns(testCodeHash, currentWorkflowId) {
    try {
      const previousWorkflows = await Workflow.find({
        'testExecution.testCodeHash': testCodeHash,
        workflowId: { $ne: currentWorkflowId },
        'testExecution.runHistory': { $exists: true, $ne: [] }
      })
      .sort({ 'testExecution.executedAt': -1 })
      .limit(5); // Get last 5 runs

      // Extract run history from previous workflows
      const runs = [];
      for (const wf of previousWorkflows) {
        if (wf.testExecution?.runHistory) {
          runs.push(...wf.testExecution.runHistory);
        }
      }
      
      return runs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Most recent first
    } catch (error) {
      console.warn('Error finding previous test runs:', error.message);
      return [];
    }
  }

  /**
   * Compute flakiness metrics from test run history
   * @param {Object} currentRun - Current test results
   * @param {Array} previousRuns - Previous test run history
   * @returns {Object} { flakiness, stability }
   */
  computeFlakinessMetrics(currentRun, previousRuns) {
    if (!previousRuns || previousRuns.length === 0) {
      // First run - assume stable
      return { flakiness: 0, stability: 1.0 };
    }

    // Combine current run with previous runs
    const allRuns = [
      {
        passRate: currentRun.total > 0 ? currentRun.passed / currentRun.total : 0,
        timestamp: new Date()
      },
      ...previousRuns.map(run => ({
        passRate: run.passRate || (run.total > 0 ? run.passed / run.total : 0),
        timestamp: new Date(run.timestamp)
      }))
    ].slice(0, 5); // Use last 5 runs

    // Calculate pass rate variance (higher variance = more flaky)
    const passRates = allRuns.map(r => r.passRate);
    const avgPassRate = passRates.reduce((sum, r) => sum + r, 0) / passRates.length;
    
    // Variance calculation
    const variance = passRates.reduce((sum, r) => sum + Math.pow(r - avgPassRate, 2), 0) / passRates.length;
    const stdDev = Math.sqrt(variance);

    // Flakiness: 0 = stable (all runs same), 1 = very flaky (high variance)
    // Normalize stdDev to [0, 1] range (assuming max stdDev of 0.5 for pass rates)
    const flakiness = Math.min(1.0, stdDev / 0.5);

    // Stability: inverse of flakiness
    const stability = 1.0 - flakiness;

    return {
      flakiness: Math.max(0, Math.min(1, flakiness)),
      stability: Math.max(0, Math.min(1, stability)),
      avgPassRate: avgPassRate,
      runCount: allRuns.length,
      variance: variance
    };
  }

  // Helper methods
  detectLanguage(files) {
    if (!files || files.length === 0) return 'javascript';
    
    const extensions = files.map(f => f.filename.split('.').pop()?.toLowerCase());
    
    if (extensions.some(ext => ['js', 'jsx', 'ts', 'tsx'].includes(ext))) {
      return 'javascript';
    }
    if (extensions.some(ext => ext === 'py')) {
      return 'python';
    }
    if (extensions.some(ext => ext === 'java')) {
      return 'java';
    }
    
    return 'javascript'; // default
  }

  calculateCoverage(workflow) {
    if (!workflow.aiPlanning?.plan) return 0;
    
    const planned = workflow.aiPlanning.plan.unitTests + 
                   workflow.aiPlanning.plan.integrationTests + 
                   workflow.aiPlanning.plan.edgeCases;
    const generated = workflow.aiGeneration?.testCount || 0;
    
    if (planned === 0) return 0;
    return Math.min(100, Math.round((generated / planned) * 100));
  }

  formatCodeRabbitInsights(review) {
    if (!review?.issues) return 'Review pending...';
    
    return `
CodeRabbit Analysis:
✅ ${review.issues.resolved} items approved
⚠️  ${review.issues.warnings} warnings
🚨 ${review.issues.critical} critical issues
${review.issues.critical > 0 ? 
  `Critical Issues:\n${review.criticalIssues.map((issue, i) => `${i+1}. ${issue}`).join('\n')}` 
  : 'No critical issues found.'}
    `.trim();
  }

  getCodeRabbitStatusText(review) {
    if (!review?.issues) return 'Pending';
    if (review.issues.critical > 0) return 'Critical Issues Found';
    if (review.issues.warnings > 0) return 'Warnings Found';
    return 'Approved';
  }

  /**
   * Create immutable audit log entry
   * @param {string} workflowId - Workflow ID
   * @param {string} eventType - Type of event
   * @param {Object} snapshot - Snapshot of critical data
   * @param {Object} changes - Optional: what changed
   * @param {string} actor - Who/what triggered this (default: 'system')
   * @returns {Promise<Object>} Created audit log
   */
  async createAuditLog(workflowId, eventType, snapshot, changes = null, actor = 'system') {
    try {
      const timestamp = new Date();
      
      // Compute integrity hash
      const dataToHash = JSON.stringify({
        workflowId,
        timestamp: timestamp.toISOString(),
        eventType,
        snapshot
      });
      const integrityHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

      const auditLog = new AuditLog({
        workflowId,
        timestamp,
        eventType,
        actor,
        snapshot,
        changes,
        integrityHash,
        metadata: {
          version: '1.0',
          source: 'WorkflowOrchestrator'
        }
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      // Log error but don't fail workflow if audit logging fails
      console.error('Failed to create audit log:', error.message);
      // In production, you might want to send this to a monitoring service
      return null;
    }
  }

  /**
   * Verify integrity of audit logs for a workflow
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Verification results
   */
  async verifyAuditLogIntegrity(workflowId) {
    try {
      const logs = await AuditLog.find({ workflowId }).sort({ timestamp: 1 });
      
      const results = {
        total: logs.length,
        verified: 0,
        failed: 0,
        failedLogs: []
      };

      for (const log of logs) {
        const isValid = AuditLog.verifyIntegrity(log);
        if (isValid) {
          results.verified++;
        } else {
          results.failed++;
          results.failedLogs.push({
            id: log._id,
            timestamp: log.timestamp,
            eventType: log.eventType
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to verify audit log integrity:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Get audit trail for a workflow
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Array>} Audit log entries
   */
  async getAuditTrail(workflowId) {
    try {
      const logs = await AuditLog.find({ workflowId })
        .sort({ timestamp: 1 })
        .select('-__v')
        .lean();
      
      return logs;
    } catch (error) {
      console.error('Failed to get audit trail:', error.message);
      return [];
    }
  }
}

