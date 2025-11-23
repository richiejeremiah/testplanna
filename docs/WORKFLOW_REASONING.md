# 🔄 TestFlow AI - Complete Workflow Reasoning & Architecture

## 📋 Table of Contents
1. [Workflow Overview](#workflow-overview)
2. [Step-by-Step Flow Logic](#step-by-step-flow-logic)
3. [Data Flow Between Steps](#data-flow-between-steps)
4. [Why Each Step Exists](#why-each-step-exists)
5. [Current Implementation Issues](#current-implementation-issues)
6. [Intended Visual Flow](#intended-visual-flow)
7. [Architecture Decisions](#architecture-decisions)

---

## 🎯 Workflow Overview

### **The Problem We're Solving:**
When a developer marks code as "Ready for Testing" in Jira, we need to:
1. Find the associated GitHub PR
2. Analyze the code changes
3. Generate comprehensive test scripts
4. Review test quality
5. Push tests back to Jira as a trackable subtask

### **The Solution:**
A sequential, AI-driven pipeline that automates the entire test generation process.

---

## 🔄 Step-by-Step Flow Logic

### **STEP 0: Find Associated GitHub PR** (Pre-requisite)
**Location:** `WorkflowOrchestrator.findAssociatedPR()`

**What Happens:**
```
Input: Jira Ticket (with key, description, etc.)
  ↓
Try Method 1: Direct PR URL from jiraTicket.prUrl
  ↓ (if not found)
Try Method 2: GitHub Service Discovery
  - Search GitHub for PRs mentioning Jira key
  - Parse PR URL from Jira description
  ↓ (if not found)
Try Method 3: Jira Service Extraction
  - Get full issue from Jira API
  - Extract PR URL from issue description/comments
  ↓
Output: PR URL (e.g., "https://github.com/owner/repo/pull/123")
```

**Why This Step:**
- Jira tickets don't always have PRs directly linked
- PRs might be mentioned in descriptions or comments
- We need the PR URL to fetch code changes

**Data Produced:**
- `prUrl`: The GitHub PR URL

---

### **STEP 1: Fetch GitHub Context** 
**Location:** `WorkflowOrchestrator.fetchGitHubContext()`

**What Happens:**
```
Input: PR URL
  ↓
GitHubService.getCodeContext(prUrl)
  ↓
Parse PR URL → Extract owner/repo/prNumber
  ↓
API Call 1: GET /repos/{owner}/{repo}/pulls/{prNumber}
  - Get PR metadata (branch, commit SHA, etc.)
  ↓
API Call 2: GET /repos/{owner}/{repo}/pulls/{prNumber}/files
  - Get list of changed files
  ↓
For each file:
  - Get file content
  - Calculate additions/deletions
  - Generate patch/diff
  ↓
Combine all patches into single diff string
  ↓
Output: Code Context Object
```

**Code Context Object Structure:**
```javascript
{
  prUrl: "https://github.com/owner/repo/pull/123",
  prNumber: 123,
  branch: "feature/add-auth",
  commitSha: "abc123def456...",
  diff: "diff --git a/src/auth.js...", // Combined diff of all files
  files: [
    {
      filename: "src/auth.js",
      additions: 25,
      deletions: 0,
      patch: "..."
    },
    // ... more files
  ]
}
```

**Why This Step:**
- AI needs actual code changes to analyze
- We need file-level details for language detection
- Diff shows what changed, not just what exists

**Data Produced:**
- `workflow.github`: Complete GitHub context
- **Broadcasts:** `github-push` node with status "fetching" → "ready"

---

### **STEP 2: AI Planning (Gemini)**
**Location:** `WorkflowOrchestrator.runAIPlanningStep()`

**What Happens:**
```
Input: 
  - Jira Ticket (summary, description)
  - Code Diff (from Step 1)
  ↓
GeminiService.planTestCoverage(jiraTicket, codeDiff)
  ↓
Build Prompt:
  "You are a senior QA engineer. Analyze this code and create a test plan.
   Jira Ticket: {key}
   Summary: {summary}
   Code Changes: {diff}"
  ↓
API Call: POST to Gemini Pro
  - Model: gemini-pro
  - Prompt: Analysis request
  ↓
Parse Response (JSON):
  {
    "unitTests": 8,
    "integrationTests": 3,
    "edgeCases": 5,
    "reasoning": "Based on authentication flow changes..."
  }
  ↓
Output: Test Plan
```

**Test Plan Structure:**
```javascript
{
  testPlan: {
    unitTests: 8,        // Number of unit tests needed
    integrationTests: 3, // Number of integration tests needed
    edgeCases: 5         // Number of edge case tests needed
  },
  reasoning: "Based on the authentication flow changes, we need comprehensive unit tests for login/logout, integration tests for session management, and edge case coverage for password validation and token expiry."
}
```

**Why This Step:**
- AI analyzes code changes and determines what tests are needed
- Provides reasoning for test coverage decisions
- Creates a structured plan before generating code

**Data Produced:**
- `workflow.aiPlanning`: Test plan and reasoning
- **Broadcasts:** `ai-review` node with status "analyzing" → "complete"

---

### **STEP 3: AI Generation (MiniMax)**
**Location:** `WorkflowOrchestrator.runAIGenerationStep()`

**What Happens:**
```
Input:
  - Test Plan (from Step 2)
  - Code Diff (from Step 1)
  - Detected Language (from Step 1 files)
  ↓
MiniMaxService.generateTestCode(testPlan, codeDiff, language)
  ↓
Detect Language from files:
  - Check file extensions (.js, .py, .java)
  - Default to JavaScript
  ↓
Build Prompt:
  "You are an expert test engineer. Generate test code based on this plan.
   Test Plan:
   - Unit Tests: {unitTests}
   - Integration Tests: {integrationTests}
   - Edge Cases: {edgeCases}
   Language: {language}
   Framework: {framework} (Jest/pytest/JUnit)
   Code to Test: {codeDiff}"
  ↓
API Call: POST to MiniMax
  - Model: abab6.5s-chat
  - Prompt: Test generation request
  ↓
Extract Generated Code from Response
  ↓
Parse Code:
  - Count test functions
  - Count lines of code
  - Detect framework
  ↓
Output: Generated Test Code
```

**Generated Test Code Structure:**
```javascript
{
  code: "describe('Authentication', () => { ... })", // Full test code
  language: "javascript",
  framework: "Jest",
  testCount: 16,        // Number of test cases generated
  linesOfCode: 342      // Total lines in generated code
}
```

**Why This Step:**
- Converts test plan into actual executable test code
- Uses different AI (MiniMax) specialized for code generation
- Generates production-ready test scripts

**Data Produced:**
- `workflow.aiGeneration`: Generated test code and metadata
- **Broadcasts:** `ai-review` node updated with status "generating" → "complete"

---

### **STEP 4: CodeRabbit Review**
**Location:** `WorkflowOrchestrator.runCodeRabbitReviewStep()`

**What Happens:**
```
Input: Original PR URL (from Step 1)
  ↓
CodeRabbitService.checkReviewStatus(prUrl)
  ↓
NOTE: CodeRabbit reviews the ORIGINAL PR, not generated tests
  - This is intentional - we want to know if the original code has issues
  - Generated tests should cover those issues
  ↓
Check CodeRabbit API for existing review
  - Look for review comments
  - Count resolved issues
  - Count warnings
  - Count critical issues
  ↓
Parse Review Results
  ↓
Output: Review Status
```

**Review Status Structure:**
```javascript
{
  issues: {
    resolved: 14,   // Issues that were approved/fixed
    warnings: 2,    // Non-critical warnings
    critical: 0      // Critical issues found
  },
  criticalIssues: [], // Array of critical issue descriptions
  warnings: [         // Array of warning descriptions
    "Consider adding error handling for edge cases",
    "Test coverage could be improved for boundary conditions"
  ],
  status: "complete"
}
```

**Why This Step:**
- Validates that original code quality is acceptable
- Informs test generation about potential issues
- Provides context for why certain tests are needed
- **Important:** We review the ORIGINAL PR, not the generated tests (simpler MVP)

**Data Produced:**
- `workflow.codeRabbitReview`: Review results
- **Broadcasts:** `coderabbit-review` node with status "reviewing" → "complete"

---

### **STEP 5: Create Jira Subtask**
**Location:** `WorkflowOrchestrator.createJiraSubtaskStep()`

**What Happens:**
```
Input:
  - Parent Jira Ticket Key
  - Test Data (code, coverage, reasoning, review results)
  ↓
JiraService.createTestSubtask(parentKey, testData)
  ↓
Step 5.1: Get Parent Issue
  - API Call: GET /rest/api/3/issue/{parentKey}
  - Extract project key from parent issue
  ↓
Step 5.2: Calculate Coverage
  - Coverage = (Generated Tests / Planned Tests) * 100
  - Planned = unitTests + integrationTests + edgeCases
  - Generated = testCount from Step 3
  ↓
Step 5.3: Format Jira Description
  - Include test code (truncated to 10k chars)
  - Include AI reasoning
  - Include CodeRabbit insights
  - Include coverage stats
  ↓
Step 5.4: Create Subtask
  - API Call: POST /rest/api/3/issue
  - Type: Sub-task
  - Parent: Original ticket
  - Summary: "Automated Test Scripts - {testCount} tests ({coverage}% coverage)"
  - Description: Formatted test data
  ↓
Output: Created Jira Issue
```

**Jira Subtask Structure:**
```javascript
{
  issueKey: "TEST-880",
  issueUrl: "https://drlittlekids.atlassian.net/browse/TEST-880",
  parentKey: "TEST-001",
  summary: "Automated Test Scripts - 16 tests (87% coverage)",
  description: {
    // Jira formatted description with:
    // - Test code
    // - AI reasoning
    // - CodeRabbit insights
    // - Coverage stats
  }
}
```

**Why This Step:**
- Makes generated tests trackable in Jira
- Links tests back to original ticket
- Provides full context (reasoning, review, code) in one place
- Enables team collaboration on test scripts

**Data Produced:**
- `workflow.jiraSubtask`: Created subtask details
- **Broadcasts:** `jira-subtask` node with status "creating" → "complete"

---

## 🔀 Data Flow Between Steps

### **Visual Data Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW START                            │
│              (Jira Ticket: "Ready for Testing")             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 0: Find PR                                             │
│  Input:  Jira Ticket                                          │
│  Output: prUrl                                                │
└──────────────────────┬──────────────────────────────────────┘
                       │ prUrl
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Fetch GitHub Context                                │
│  Input:  prUrl                                                │
│  Output: { prUrl, branch, commitSha, diff, files[] }         │
│  ─────────────────────────────────────────────────────────── │
│  Data Stored: workflow.github                                │
└──────────────────────┬──────────────────────────────────────┘
                       │ codeDiff, files
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: AI Planning (Gemini)                                │
│  Input:  Jira Ticket + codeDiff                               │
│  Output: { testPlan: {unitTests, integrationTests,          │
│                       edgeCases}, reasoning }                 │
│  ─────────────────────────────────────────────────────────── │
│  Data Stored: workflow.aiPlanning                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ testPlan, codeDiff, language
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: AI Generation (MiniMax)                            │
│  Input:  testPlan + codeDiff + language                      │
│  Output: { code, language, framework, testCount,            │
│            linesOfCode }                                      │
│  ─────────────────────────────────────────────────────────── │
│  Data Stored: workflow.aiGeneration                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ prUrl (original)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: CodeRabbit Review                                   │
│  Input:  prUrl (from Step 1)                                  │
│  Output: { issues: {resolved, warnings, critical},          │
│            criticalIssues[], warnings[] }                    │
│  ─────────────────────────────────────────────────────────── │
│  Data Stored: workflow.codeRabbitReview                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ All previous data
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Create Jira Subtask                                 │
│  Input:  parentKey + all test data                           │
│  Output: { issueKey, issueUrl, parentKey }                   │
│  ─────────────────────────────────────────────────────────── │
│  Data Stored: workflow.jiraSubtask                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW COMPLETE                         │
│              (Status: "completed")                            │
└─────────────────────────────────────────────────────────────┘
```

### **Data Dependencies:**
```
Step 0 → Step 1: prUrl
Step 1 → Step 2: codeDiff, files
Step 1 → Step 3: codeDiff, files (for language detection)
Step 2 → Step 3: testPlan
Step 1 → Step 4: prUrl
Step 2 → Step 5: testPlan, reasoning
Step 3 → Step 5: generatedCode, testCount, language
Step 4 → Step 5: reviewResults
```

---

## 🤔 Why Each Step Exists

### **STEP 0: Find PR**
**Reason:** Jira tickets don't always have PRs directly linked. We need multiple discovery methods.

### **STEP 1: Fetch GitHub Context**
**Reason:** AI can't analyze code without seeing what changed. We need the actual diff.

### **STEP 2: AI Planning (Gemini)**
**Reason:** 
- Gemini is good at analysis and reasoning
- We need a structured plan before generating code
- Reasoning helps developers understand test decisions

### **STEP 3: AI Generation (MiniMax)**
**Reason:**
- MiniMax is specialized for code generation
- Converts plan into executable test code
- Different AI for different purpose (separation of concerns)

### **STEP 4: CodeRabbit Review**
**Reason:**
- Validates original code quality
- Informs test generation about potential issues
- Provides quality metrics for the workflow

### **STEP 5: Create Jira Subtask**
**Reason:**
- Makes tests trackable and actionable
- Links back to original ticket
- Enables team collaboration

---

## 🐛 Current Implementation Issues

### **Problem: Nodes Appear as Disconnected Boxes**

**Root Cause Analysis:**

1. **Initial Positioning Issue:**
   ```javascript
   // In WorkflowBroadcaster.calculateNodePosition()
   'github-push': { x: 250, y: 50 },
   'ai-review': { x: 250, y: 200 },
   'coderabbit-review': { x: 250, y: 350 },
   'jira-subtask': { x: 250, y: 500 }
   ```
   - All nodes have same X coordinate (250)
   - Only Y coordinates differ
   - This creates a vertical stack, not a flow

2. **Dagre Layout Not Working Properly:**
   ```javascript
   // In WorkflowCanvas.getLayoutedElements()
   dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 150 });
   ```
   - Layout is set to 'TB' (top-to-bottom)
   - But nodes are positioned manually first
   - Dagre might be fighting with manual positions

3. **Edge Creation Timing:**
   - Edges are created AFTER nodes
   - Layout runs after each node/edge addition
   - Multiple layout passes might conflict

4. **Node Width Inconsistency:**
   ```javascript
   dagreGraph.setNode(node.id, { width: 300, height: 150 });
   ```
   - All nodes set to 300x150
   - But actual nodes are different sizes (w-80, w-96)
   - Layout calculations are wrong

### **Why It Looks Like Boxes:**
- Nodes are positioned vertically (same X, different Y)
- Edges exist but might not be visible or properly connected
- Layout algorithm isn't accounting for actual node sizes
- No clear visual hierarchy showing flow direction

---

## 🎨 Intended Visual Flow

### **What It Should Look Like:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Progress Timeline                         │
│  [1] GitHub → [2] AI Planning → [3] Generation → [4] Review → [5] Jira │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │  ① GitHub    │
                    │   Push       │
                    │  [Ready]     │
                    └──────┬───────┘
                           │
                    "Code diff →"
                           │
                    ┌──────▼───────┐
                    │  ② AI Review │
                    │  [Complete]  │
                    │  8 Unit      │
                    │  3 Integration│
                    │  5 Edge Cases│
                    └──────┬───────┘
                           │
              "Generated tests →"
                           │
                    ┌──────▼──────────┐
                    │  ③ CodeRabbit   │
                    │  [Complete]     │
                    │  14 approved    │
                    │  2 warnings     │
                    └──────┬──────────┘
                           │
            "Review complete →"
                           │
                    ┌──────▼──────────┐
                    │  ④ Jira Subtask │
                    │  [Complete]    │
                    │  TEST-880       │
                    │  87% coverage   │
                    └─────────────────┘
```

### **Key Visual Elements:**
1. **Top-to-Bottom Flow:** Nodes should be arranged vertically
2. **Clear Connections:** Animated edges with labels showing data flow
3. **Step Numbers:** Visible numbered badges (1-4)
4. **Status Indicators:** Color-coded badges showing current state
5. **Progress Timeline:** Shows overall workflow progress

---

## 🏗️ Architecture Decisions

### **Why Sequential Steps?**
- Each step depends on previous step's output
- Can't generate tests without a plan
- Can't create Jira task without generated code
- Sequential = predictable, debuggable

### **Why Two AI Services?**
- **Gemini:** Better at analysis and reasoning
- **MiniMax:** Better at code generation
- Separation of concerns
- Can optimize each independently

### **Why CodeRabbit Reviews Original PR?**
- **Simpler MVP:** Don't need to push generated tests to PR first
- **Faster:** No waiting for CodeRabbit to review new code
- **Informative:** Original code quality informs test needs
- **Future:** Can upgrade to review generated tests later

### **Why WebSocket for Real-time Updates?**
- Workflow takes 30-60 seconds
- Users need to see progress
- Multiple users can watch same workflow
- Better UX than polling

### **Why Dagre for Layout?**
- Automatic graph layout
- Handles node positioning
- Calculates edge routing
- Industry standard for flow diagrams

---

## 🔧 What Needs to Be Fixed

### **1. Node Positioning:**
- Remove manual positions from `calculateNodePosition()`
- Let Dagre handle all positioning
- Set proper node dimensions based on actual sizes

### **2. Layout Direction:**
- Ensure 'TB' (top-to-bottom) is working
- Verify nodes are arranged vertically
- Check edge routing

### **3. Node Sizes:**
- Update Dagre node dimensions to match actual sizes
- GitHubNode: w-80 (320px)
- AIReviewNode: w-96 (384px)
- CodeRabbitNode: w-80 (320px)
- JiraNode: w-80 (320px)

### **4. Edge Visibility:**
- Ensure edges are properly connected
- Verify animated edges are visible
- Check edge labels are showing

### **5. Layout Timing:**
- Run layout only when all nodes/edges are ready
- Avoid multiple layout passes
- Use proper React state batching

---

## 📊 Expected vs Actual

### **Expected:**
- Vertical flow diagram
- Clear top-to-bottom progression
- Visible animated edges
- Proper spacing between nodes

### **Actual (Current Issue):**
- Nodes appear as disconnected boxes
- No clear flow direction
- Edges might not be visible
- Layout not working as intended

---

## 🎯 Conclusion

The **logical flow is correct** - the workflow executes properly and data flows correctly between steps. The issue is **purely visual** - the ReactFlow layout isn't creating a proper flow diagram.

**Next Steps:**
1. Fix Dagre layout configuration
2. Remove manual positioning
3. Set correct node dimensions
4. Ensure edges are properly connected
5. Test visual flow

The workflow logic and reasoning are sound - we just need to fix the visualization! 🎨

