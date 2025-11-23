# TestFlow AI - Automated Test Generation Workflow

End-to-end automated test generation system that integrates GitHub, AI services (Gemini + MiniMax), CodeRabbit, and Jira with real-time ReactFlow visualization.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              REACTFLOW VISUALIZATION (Frontend)          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│  │ GitHub   │───▶│ AI Review │───▶│ CodeRabbit│         │
│  │  Push    │    │ (Gemini+  │    │  Review  │         │
│  │  Node    │    │ MiniMax)  │    │   Node   │         │
│  └──────────┘    └──────────┘    └──────────┘         │
│       │                │                 │              │
│       └────────────────┴─────────────────┘              │
│                        │                                │
│                  ┌──────────┐                          │
│                  │   Jira   │                          │
│                  │  Push    │                          │
│                  │   Node   │                          │
│                  └──────────┘                          │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- npm or yarn

### Backend Setup

```bash
cd backend
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your MongoDB URI
# MONGODB_URI=mongodb://localhost:27017/testflow

# Start MongoDB (if local)
# mongod

# Start backend server
npm start
# or for development with auto-reload
npm run dev
```

Backend runs on `http://localhost:3000`

### Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

## 📋 Usage

1. **Open Dashboard**: Navigate to `http://localhost:5173`
2. **Fill Form**: Enter Jira ticket details and PR information
3. **Start Workflow**: Click "Start Test Generation Workflow"
4. **Watch Visualization**: See real-time workflow progress in ReactFlow
5. **View Details**: Click on any node to see detailed information

## 🎯 Features

### MVP (Current)
- ✅ Manual workflow trigger via UI
- ✅ Real-time ReactFlow visualization
- ✅ 4 workflow nodes (GitHub → AI Review → CodeRabbit → Jira)
- ✅ WebSocket updates
- ✅ Node details panel
- ✅ Auto-layout (top-to-bottom)
- ✅ Mock AI services (ready for real integration)

### Next Steps (To Build)
- [ ] Real GitHub API integration
- [ ] Real Gemini API integration
- [ ] Real MiniMax API integration
- [ ] Real CodeRabbit API integration
- [ ] Real Jira API integration
- [ ] GitHub webhook support
- [ ] Workflow history/analytics

## 📁 Project Structure

```
backend/
├── models/
│   └── Workflow.js              # MongoDB schema
├── services/
│   ├── WorkflowOrchestrator.js  # Main workflow logic
│   ├── WorkflowBroadcaster.js   # WebSocket broadcasting
│   ├── GitHubService.js         # GitHub API (stubbed)
│   ├── GeminiService.js         # Gemini AI (stubbed)
│   ├── MiniMaxService.js        # MiniMax AI (stubbed)
│   ├── CodeRabbitService.js     # CodeRabbit (stubbed)
│   └── JiraService.js           # Jira API (stubbed)
├── routes/
│   └── workflows.js             # API endpoints
└── server.js                    # Express + Socket.io server

frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx        # Trigger UI
│   │   ├── WorkflowCanvas.jsx   # ReactFlow canvas
│   │   ├── nodes/               # Custom node components
│   │   └── NodeDetailsPanel.jsx # Side panel
│   └── App.jsx
└── package.json
```

## 🔌 API Endpoints

- `GET /api/workflows` - List all workflows
- `GET /api/workflows/:workflowId` - Get workflow details
- `POST /api/workflows/trigger` - Start new workflow
- `GET /health` - Health check

## 🔌 WebSocket Events

**Client → Server:**
- `join-workflow` - Join workflow room
- `leave-workflow` - Leave workflow room

**Server → Client:**
- `node-created` - New node added
- `node-updated` - Node data updated
- `edge-created` - New edge added
- `workflow-status` - Workflow status changed

## 🛠️ Development

### Adding Real API Integrations

1. **GitHub Service**: Update `backend/services/GitHubService.js`
   - Add GitHub token to `.env`
   - Implement real API calls

2. **Gemini Service**: Update `backend/services/GeminiService.js`
   - Add Gemini API key to `.env`
   - Implement real API calls

3. **MiniMax Service**: Update `backend/services/MiniMaxService.js`
   - Add MiniMax API key to `.env`
   - Implement real API calls

4. **CodeRabbit Service**: Update `backend/services/CodeRabbitService.js`
   - Add CodeRabbit API key to `.env`
   - Implement real API calls

5. **Jira Service**: Update `backend/services/JiraService.js`
   - Add Jira credentials to `.env`
   - Implement real API calls

## 📝 Environment Variables

See `backend/.env.example` for all required variables.

## 🐛 Troubleshooting

- **MongoDB connection error**: Make sure MongoDB is running
- **WebSocket not connecting**: Check CORS settings in `server.js`
- **Nodes not appearing**: Check browser console for WebSocket errors
- **Layout issues**: Ensure `dagre` is installed in frontend

## 📄 License

MIT

