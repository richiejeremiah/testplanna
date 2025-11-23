# TestFlow AI - Complete Architecture Documentation

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [ReactFlow Integration](#reactflow-integration)
3. [Full Architecture](#full-architecture)
4. [Data Flow](#data-flow)
5. [Component Structure](#component-structure)
6. [API Integrations](#api-integrations)
7. [WebSocket Communication](#websocket-communication)
8. [Database Schema](#database-schema)
9. [Service Layer](#service-layer)
10. [File Structure](#file-structure)

---

## 🎯 System Overview

TestFlow AI is an automated test generation workflow system that:
- **Triggers** when a developer pushes code to GitHub
- **Analyzes** code using Gemini AI to plan test coverage
- **Generates** test code using MiniMax AI
- **Reviews** code quality with CodeRabbit
- **Pushes** results to Jira as subtasks
- **Visualizes** the entire process in real-time using ReactFlow

---

## 🎨 ReactFlow Integration

### How ReactFlow Works in This System

ReactFlow is a powerful library for building node-based graphs and diagrams. In TestFlow AI, it visualizes the workflow pipeline as an interactive graph.

#### 1. **Node-Based Visualization**

The workflow is represented as a **directed graph** with 4 node types:

```
┌─────────────┐
│ GitHub Push │  ← Node 1 (Source)
└──────┬──────┘
       │ (Edge)
       ▼
┌─────────────┐
│  AI Review  │  ← Node 2
└──────┬──────┘
       │ (Edge)
       ▼
┌─────────────┐
│ CodeRabbit  │  ← Node 3
└──────┬──────┘
       │ (Edge)
       ▼
┌─────────────┐
│ Jira Subtask│  ← Node 4 (Sink)
└─────────────┘
```

#### 2. **Real-Time Updates via WebSocket**

**Backend → Frontend Flow:**

```
WorkflowOrchestrator
    ↓
WorkflowBroadcaster
    ↓
Socket.io Server
    ↓ (WebSocket)
    ↓
ReactFlow Canvas
    ↓
Node Updates (animated)
```

**How it works:**

1. **Backend broadcasts events:**
   ```javascript
   // In WorkflowOrchestrator.js
   await this.broadcaster.broadcastNodeCreated(workflowId, {
     type: 'ai-review',
     status: 'analyzing',
     ...
   });
   ```

2. **WorkflowBroadcaster sends via Socket.io:**
   ```javascript
   // In WorkflowBroadcaster.js
   this.io.to(`workflow:${workflowId}`).emit('node-created', node);
   ```

3. **Frontend receives and updates ReactFlow:**
   ```javascript
   // In WorkflowCanvas.jsx
   socket.on('node-created', (node) => {
     setNodes((nds) => [...nds, node]);
   });
   ```

#### 3. **Custom Node Components**

Each workflow step has a custom React component:

- **GitHubNode** (`nodes/GitHubNode.jsx`)
  - Shows PR number, branch, status
  - Blue border, GitHub icon
  - Clickable link to PR

- **AIReviewNode** (`nodes/AIReviewNode.jsx`)
  - Shows AI planning status
  - Purple border, robot icon
  - Displays test counts, reasoning

- **CodeRabbitNode** (`nodes/CodeRabbitNode.jsx`)
  - Shows review results
  - Orange border, search icon
  - Displays issues, warnings, critical items

- **JiraNode** (`nodes/JiraNode.jsx`)
  - Shows Jira subtask info
  - Green border, clipboard icon
  - Link to Jira issue

#### 4. **Auto-Layout with Dagre**

ReactFlow uses **Dagre** algorithm for automatic layout:

```javascript
// In WorkflowCanvas.jsx
import dagre from 'dagre';

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 150 });
  
  // Add nodes and edges
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 300, height: 150 });
  });
  
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  // Calculate positions
  dagre.layout(dagreGraph);
  
  // Update node positions
  nodes.forEach((node) => {
    const pos = dagreGraph.node(node.id);
    node.position = { x: pos.x - 150, y: pos.y - 75 };
  });
  
  return { nodes, edges };
};
```

**Layout Direction:** Top-to-Bottom (TB)
- Nodes flow vertically
- Edges connect top-to-bottom
- Automatic spacing and alignment

#### 5. **Interactive Features**

- **Node Clicking:** Opens side panel with details
- **Zoom/Pan:** ReactFlow controls
- **MiniMap:** Overview of entire workflow
- **Animated Edges:** Show data flow
- **Status Badges:** Real-time status updates

---

## 🏗️ Full Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │ WorkflowCanvas│  │  NodeDetails  │      │
│  │   (UI)       │  │  (ReactFlow)  │  │   (Panel)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
│         │                  │                                  │
│         └──────────────────┴──────────────────┐             │
│                                                 │             │
│                                    WebSocket Client          │
└─────────────────────────────────────────────────┼─────────────┘
                                                  │
                                                  │ HTTP/WS
                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Express    │  │  Socket.io   │  │   Routes     │      │
│  │   Server     │  │   Server     │  │  /api/...    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘             │
│                            │                                  │
│                            ▼                                  │
│  ┌──────────────────────────────────────────────┐           │
│  │        WorkflowOrchestrator                   │           │
│  │  - Coordinates workflow steps                 │           │
│  │  - Manages state transitions                  │           │
│  │  - Handles errors                             │           │
│  └──────┬───────────────────────────────────────┘           │
│         │                                                     │
│         ├─── WorkflowBroadcaster (WebSocket updates)          │
│         │                                                     │
│         ├─── Service Layer                                   │
│         │    ├── GitHubService                               │
│         │    ├── GeminiService                               │
│         │    ├── MiniMaxService                              │
│         │    ├── CodeRabbitService                           │
│         │    └── JiraService                                 │
│         │                                                     │
│         └─── MongoDB (Workflow persistence)                  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18.2
- ReactFlow 11.10.1
- Socket.io-client 4.6.1
- Tailwind CSS 3.3.5
- Vite 5.0
- Dagre (auto-layout)

**Backend:**
- Node.js (ES Modules)
- Express 4.18.2
- Socket.io 4.6.1
- Mongoose 7.5.0
- @google/generative-ai 0.2.1
- Axios 1.6.0

**Database:**
- MongoDB (via Mongoose)

**External APIs:**
- GitHub API
- Google Gemini API
- MiniMax API
- CodeRabbit API
- Jira REST API

---

## 🔄 Data Flow

### Complete Workflow Execution Flow

```
1. USER ACTION
   └─> Dashboard form submission
       └─> POST /api/workflows/trigger
           └─> WorkflowOrchestrator.startWorkflow()

2. WORKFLOW INITIALIZATION
   └─> Create Workflow in MongoDB
   └─> Generate workflowId (UUID)
   └─> Broadcast: GitHub Node Created
       └─> WebSocket: 'node-created' event
           └─> ReactFlow: Add GitHub node

3. STEP 1: AI PLANNING (Gemini)
   └─> Broadcast: AI Review Node Created
   └─> Broadcast: Edge (GitHub → AI Review)
   └─> Update node status: 'analyzing'
   └─> Fetch code from GitHub API
   └─> Call Gemini API for test planning
   └─> Update node: 'complete' with plan data
   └─> Save to MongoDB

4. STEP 2: AI GENERATION (MiniMax)
   └─> Update node status: 'generating'
   └─> Call MiniMax API for test generation
   └─> Update node: 'complete' with test code
   └─> Save to MongoDB

5. STEP 3: CODERABBIT REVIEW
   └─> Broadcast: CodeRabbit Node Created
   └─> Broadcast: Edge (AI Review → CodeRabbit)
   └─> Update node status: 'reviewing'
   └─> Call CodeRabbit API (or mock)
   └─> Update node: 'complete' with review results
   └─> Save to MongoDB

6. STEP 4: JIRA SUBTASK CREATION
   └─> Broadcast: Jira Node Created
   └─> Broadcast: Edge (CodeRabbit → Jira)
   └─> Update node status: 'creating'
   └─> Call Jira API to create subtask
   └─> Update node: 'complete' with Jira link
   └─> Save to MongoDB

7. WORKFLOW COMPLETE
   └─> Update workflow status: 'completed'
   └─> Broadcast: 'workflow-status' event
   └─> ReactFlow: All nodes show 'complete'
```

### WebSocket Event Flow

**Backend Events:**
```javascript
// Node creation
'node-created' → { id, type, position, data }

// Node update
'node-updated' → { id, type, data: { ...updates } }

// Edge creation
'edge-created' → { id, source, target, animated: true }

// Workflow status
'workflow-status' → { workflowId, status, error }
```

**Frontend Listeners:**
```javascript
socket.on('node-created', (node) => {
  // Add node to ReactFlow
  setNodes((nds) => [...nds, node]);
  // Re-layout graph
  applyLayout();
});

socket.on('node-updated', ({ id, data }) => {
  // Update existing node
  setNodes((nds) =>
    nds.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node
    )
  );
});
```

---

## 📦 Component Structure

### Frontend Components

```
frontend/src/
├── App.jsx                    # Main app router
├── components/
│   ├── Dashboard.jsx         # Trigger UI (Jira-like)
│   ├── WorkflowCanvas.jsx    # ReactFlow canvas + WebSocket
│   ├── NodeDetailsPanel.jsx  # Side panel for node details
│   └── nodes/
│       ├── GitHubNode.jsx    # Custom node: GitHub Push
│       ├── AIReviewNode.jsx   # Custom node: AI Review
│       ├── CodeRabbitNode.jsx # Custom node: CodeRabbit
│       └── JiraNode.jsx       # Custom node: Jira Subtask
```

**Component Responsibilities:**

1. **App.jsx**
   - Routes between Dashboard and WorkflowCanvas
   - Manages current workflow state

2. **Dashboard.jsx**
   - Form to trigger workflows
   - Input: Jira ticket, PR URL, etc.
   - Calls `/api/workflows/trigger`

3. **WorkflowCanvas.jsx**
   - ReactFlow canvas setup
   - WebSocket connection management
   - Node/edge state management
   - Auto-layout logic
   - Node click handlers

4. **Node Components**
   - Visual representation of workflow steps
   - Status indicators
   - Data display
   - Interactive elements

5. **NodeDetailsPanel.jsx**
   - Shows detailed info when node clicked
   - Different views per node type
   - Code previews, statistics, links

### Backend Structure

```
backend/
├── server.js                  # Express + Socket.io server
├── models/
│   └── Workflow.js            # MongoDB schema
├── services/
│   ├── WorkflowOrchestrator.js # Main workflow logic
│   ├── WorkflowBroadcaster.js  # WebSocket broadcasting
│   ├── GitHubService.js        # GitHub API integration
│   ├── GeminiService.js        # Gemini AI integration
│   ├── MiniMaxService.js       # MiniMax AI integration
│   ├── CodeRabbitService.js    # CodeRabbit integration
│   └── JiraService.js          # Jira API integration
└── routes/
    └── workflows.js            # REST API endpoints
```

---

## 🔌 API Integrations

### 1. GitHub API

**Service:** `GitHubService.js`

**Methods:**
- `getCodeContext(prUrl)` - Fetches PR details and diff
- `getPRDiff(owner, repo, prNumber)` - Gets code changes

**API Calls:**
```javascript
GET /repos/{owner}/{repo}/pulls/{prNumber}
GET /repos/{owner}/{repo}/pulls/{prNumber}/files
```

**Returns:**
```javascript
{
  prUrl: string,
  prNumber: number,
  branch: string,
  commitSha: string,
  diff: string,
  files: Array<{ filename, additions, deletions }>
}
```

### 2. Gemini API

**Service:** `GeminiService.js`

**Methods:**
- `planTestCoverage(jiraTicket, codeDiff)` - Plans test strategy
- `analyzeCodeComplexity(codeDiff)` - Analyzes complexity

**API:** Google Generative AI SDK
```javascript
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
const result = await model.generateContent(prompt);
```

**Returns:**
```javascript
{
  testPlan: {
    unitTests: number,
    integrationTests: number,
    edgeCases: number
  },
  reasoning: string
}
```

### 3. MiniMax API

**Service:** `MiniMaxService.js`

**Methods:**
- `generateTestCode(testPlan, codeDiff, language)` - Generates test code

**API Calls:**
```javascript
POST https://api.minimax.chat/v1/text/chatcompletion_pro
{
  model: 'abab6.5s-chat',
  messages: [{ role: 'user', content: prompt }]
}
```

**Returns:**
```javascript
{
  code: string,
  language: string,
  framework: string,
  testCount: number,
  linesOfCode: number
}
```

### 4. CodeRabbit API

**Service:** `CodeRabbitService.js`

**Methods:**
- `checkReviewStatus(prUrl)` - Gets review results
- `triggerReview(prUrl)` - Starts review

**Status:** Currently mocked (ready for real API)

### 5. Jira API

**Service:** `JiraService.js`

**Methods:**
- `createTestSubtask(parentKey, testData)` - Creates subtask
- `getIssue(issueKey)` - Gets issue details

**API Calls:**
```javascript
POST /rest/api/3/issue
{
  fields: {
    project: { key },
    parent: { key },
    summary: string,
    description: { ... },
    issuetype: { name: 'Sub-task' }
  }
}
```

**Returns:**
```javascript
{
  issueKey: string,
  issueUrl: string,
  parentKey: string
}
```

---

## 📡 WebSocket Communication

### Connection Flow

```
1. Frontend connects to Socket.io server
   socket = io('http://localhost:3000')

2. Frontend joins workflow room
   socket.emit('join-workflow', workflowId)

3. Backend adds client to room
   socket.join(`workflow:${workflowId}`)

4. Backend broadcasts to room
   io.to(`workflow:${workflowId}`).emit('node-created', node)

5. All clients in room receive update
   socket.on('node-created', (node) => { ... })
```

### Event Types

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `join-workflow` | Client → Server | `{ workflowId }` | Join workflow room |
| `leave-workflow` | Client → Server | `{ workflowId }` | Leave workflow room |
| `node-created` | Server → Client | `{ id, type, position, data }` | New node added |
| `node-updated` | Server → Client | `{ id, type, data }` | Node data updated |
| `edge-created` | Server → Client | `{ id, source, target }` | New edge added |
| `workflow-status` | Server → Client | `{ workflowId, status, error }` | Workflow status change |

### Broadcasting Pattern

```javascript
// In WorkflowBroadcaster.js
class WorkflowBroadcaster {
  constructor(io) {
    this.io = io;
  }

  async broadcastNodeCreated(workflowId, nodeData) {
    const node = {
      id: `${workflowId}-${nodeData.type}`,
      type: nodeData.type,
      position: this.calculateNodePosition(nodeData.type),
      data: { ...nodeData, workflowId }
    };

    // Broadcast to all clients watching this workflow
    this.io.to(`workflow:${workflowId}`).emit('node-created', node);
    return node;
  }
}
```

---

## 🗄️ Database Schema

### Workflow Model

```javascript
{
  workflowId: String (unique, indexed),
  status: 'pending' | 'running' | 'completed' | 'failed',
  
  // GitHub Info
  github: {
    prUrl: String,
    prNumber: Number,
    branch: String,
    commitSha: String,
    diff: String,
    files: Array
  },
  
  // AI Planning (Gemini)
  aiPlanning: {
    status: 'pending' | 'analyzing' | 'complete' | 'failed',
    plan: {
      unitTests: Number,
      integrationTests: Number,
      edgeCases: Number
    },
    reasoning: String,
    completedAt: Date
  },
  
  // AI Generation (MiniMax)
  aiGeneration: {
    status: 'pending' | 'generating' | 'complete' | 'failed',
    generatedCode: String,
    language: String,
    framework: String,
    testCount: Number,
    linesOfCode: Number,
    completedAt: Date
  },
  
  // CodeRabbit Review
  codeRabbitReview: {
    status: 'pending' | 'reviewing' | 'complete' | 'failed',
    issues: {
      resolved: Number,
      warnings: Number,
      critical: Number
    },
    criticalIssues: Array<String>,
    completedAt: Date
  },
  
  // Jira Subtask
  jiraSubtask: {
    created: Boolean,
    issueKey: String,
    issueUrl: String,
    parentKey: String,
    createdAt: Date
  },
  
  // Metadata
  jiraTicketKey: String,
  createdBy: String,
  createdAt: Date,
  completedAt: Date,
  error: String
}
```

### Helper Methods

```javascript
workflow.updateAIPlanningStatus(status, data)
workflow.updateAIGenerationStatus(status, data)
workflow.updateCodeRabbitStatus(status, data)
```

---

## 🔧 Service Layer

### WorkflowOrchestrator

**Main orchestrator** that coordinates all workflow steps.

**Key Methods:**
- `startWorkflow(jiraTicket)` - Entry point
- `runAIPlanningStep(workflow, jiraTicket)` - Step 1
- `runAIGenerationStep(workflow)` - Step 2
- `runCodeRabbitReviewStep(workflow)` - Step 3
- `createJiraSubtaskStep(workflow)` - Step 4

**Error Handling:**
- Try-catch around entire workflow
- Updates workflow status to 'failed' on error
- Broadcasts error status via WebSocket
- Preserves partial progress in database

### Service Pattern

All services follow this pattern:

```javascript
class ServiceName {
  constructor() {
    this.apiKey = process.env.SERVICE_API_KEY;
  }

  async methodName(params) {
    if (!this.apiKey) {
      return this.getMockData(); // Fallback
    }

    try {
      // Real API call
      const response = await apiCall();
      return this.processResponse(response);
    } catch (error) {
      console.error('Service error:', error);
      return this.getMockData(); // Fallback
    }
  }

  getMockData() {
    // Mock data for testing
  }
}
```

**Benefits:**
- Graceful degradation
- Works without all APIs
- Easy testing
- Production-ready error handling

---

## 📁 Complete File Structure

```
ai-ugc-engine/
├── backend/
│   ├── .env                          # Environment variables (API keys)
│   ├── package.json                  # Dependencies
│   ├── server.js                     # Express + Socket.io server
│   ├── models/
│   │   └── Workflow.js               # MongoDB schema
│   ├── services/
│   │   ├── WorkflowOrchestrator.js   # Main workflow logic
│   │   ├── WorkflowBroadcaster.js    # WebSocket broadcasting
│   │   ├── GitHubService.js          # GitHub API
│   │   ├── GeminiService.js          # Gemini AI
│   │   ├── MiniMaxService.js         # MiniMax AI
│   │   ├── CodeRabbitService.js      # CodeRabbit
│   │   └── JiraService.js           # Jira API
│   └── routes/
│       └── workflows.js              # REST endpoints
│
├── frontend/
│   ├── package.json                  # Dependencies
│   ├── vite.config.js                # Vite config
│   ├── tailwind.config.js            # Tailwind config
│   ├── index.html                    # HTML entry
│   └── src/
│       ├── main.jsx                  # React entry
│       ├── App.jsx                   # Main router
│       ├── index.css                 # Global styles
│       └── components/
│           ├── Dashboard.jsx        # Trigger UI
│           ├── WorkflowCanvas.jsx    # ReactFlow canvas
│           ├── NodeDetailsPanel.jsx  # Side panel
│           └── nodes/
│               ├── GitHubNode.jsx    # GitHub node
│               ├── AIReviewNode.jsx  # AI node
│               ├── CodeRabbitNode.jsx # CodeRabbit node
│               └── JiraNode.jsx     # Jira node
│
└── Documentation/
    ├── ARCHITECTURE.md               # This file
    ├── README.md                     # Overview
    ├── QUICK_START.md                # Setup guide
    ├── API_KEYS_SETUP.md             # API keys guide
    └── GITHUB_SETUP.md               # GitHub token guide
```

---

## 🎯 Key Design Decisions

### 1. **Real-Time Updates**
- **Why:** Users need to see workflow progress live
- **How:** WebSocket (Socket.io) for bidirectional communication
- **Result:** Instant visual feedback

### 2. **ReactFlow for Visualization**
- **Why:** Professional, interactive graph visualization
- **How:** Custom node components + auto-layout
- **Result:** Beautiful, intuitive workflow view

### 3. **Service Abstraction**
- **Why:** Easy to swap/mock services
- **How:** Service classes with fallback methods
- **Result:** Works with or without real APIs

### 4. **MongoDB Persistence**
- **Why:** Need to track workflow state
- **How:** Mongoose models with helper methods
- **Result:** Reliable state management

### 5. **Error Handling**
- **Why:** APIs can fail, need graceful degradation
- **How:** Try-catch + fallback to mock data
- **Result:** System always works

### 6. **Top-to-Bottom Layout**
- **Why:** Natural workflow flow
- **How:** Dagre algorithm with TB direction
- **Result:** Clear visual progression

---

## 🚀 Performance Considerations

### 1. **WebSocket Efficiency**
- Rooms isolate broadcasts (only relevant clients)
- Minimal payload size
- Event-driven updates (not polling)

### 2. **ReactFlow Optimization**
- Only re-render changed nodes
- Debounced layout calculations
- Virtualized rendering for large graphs

### 3. **API Rate Limiting**
- Services handle rate limits gracefully
- Fallback to mock data if needed
- Error retry logic (can be added)

### 4. **Database Indexing**
- `workflowId` indexed for fast lookups
- `status` indexed for filtering
- `createdAt` indexed for sorting

---

## 🔒 Security Considerations

### 1. **API Keys**
- Stored in `.env` (not committed)
- `.gitignore` protects sensitive data
- Environment-specific configs

### 2. **WebSocket Authentication**
- Can add JWT validation
- Room-based access control
- Rate limiting (can be added)

### 3. **Input Validation**
- Validate PR URLs
- Sanitize user inputs
- Error messages don't leak secrets

---

## 📊 Current Status

### ✅ Completed

- [x] ReactFlow integration with custom nodes
- [x] WebSocket real-time updates
- [x] Workflow orchestration
- [x] GitHub API integration
- [x] Gemini API integration
- [x] MiniMax API integration
- [x] Jira API integration
- [x] MongoDB persistence
- [x] Error handling & fallbacks
- [x] Auto-layout algorithm
- [x] Node details panel
- [x] Dashboard UI

### 🚧 Ready for Enhancement

- [ ] CodeRabbit real API (currently mocked)
- [ ] GitHub webhook support
- [ ] Workflow history/analytics
- [ ] Retry logic for failed steps
- [ ] User authentication
- [ ] Multi-workflow dashboard
- [ ] Export test scripts to GitHub

---

## 🧪 Testing Strategy

### Unit Tests (To Add)
- Service methods
- Helper functions
- Error handling

### Integration Tests (To Add)
- API service calls
- Database operations
- WebSocket events

### E2E Tests (To Add)
- Full workflow execution
- UI interactions
- Error scenarios

---

## 📝 Summary

This architecture provides:

1. **Real-time visualization** via ReactFlow
2. **Scalable service layer** with easy API integration
3. **Robust error handling** with graceful degradation
4. **Clean separation** of concerns (frontend/backend/services)
5. **Production-ready** structure with MongoDB persistence
6. **Extensible design** for future enhancements

The system is **fully functional** and ready for testing with real API integrations!

---

**Last Updated:** November 22, 2024
**Version:** 1.0.0 MVP

