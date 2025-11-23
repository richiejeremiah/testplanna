# 🚀 Quick Start - TestFlow AI

## ✅ All API Keys Ready!

You have:
- ✅ GitHub Token
- ✅ Gemini API Key  
- ✅ MiniMax API Key
- ✅ Jira API Token

**Just need:** Jira Base URL and Email

## 📝 Step 1: Create .env File

Create `backend/.env` file with this content:

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/testflow

# Server
API_PORT=3000
NODE_ENV=development

# GitHub API
GITHUB_TOKEN=ghp_your_github_token_here

# AI Services
GEMINI_API_KEY=your_gemini_api_key_here
MINIMAX_API_KEY=your_minimax_api_key_here

# CodeRabbit (optional)
CODERABBIT_API_KEY=
CODERABBIT_WEBHOOK_SECRET=

# Jira API - ✅ All configured!
JIRA_BASE_URL=https://drlittlekids.atlassian.net
JIRA_EMAIL=drlittlekids@gmail.com
JIRA_API_TOKEN=your_jira_api_token_here
```

**✅ All values are already set!** Just copy the template above.

## 📦 Step 2: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in another terminal)
cd frontend
npm install
```

## 🗄️ Step 3: Start MongoDB

```bash
# macOS with Homebrew
brew services start mongodb-community

# Or manually
mongod --dbpath /usr/local/var/mongodb

# Or use MongoDB Atlas (cloud) - update MONGODB_URI in .env
```

## 🚀 Step 4: Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 🎯 Step 5: Test It!

1. Open: http://localhost:5173
2. Fill in the form:
   - **Jira Ticket Key**: Any key (e.g., `DEMO-123`)
   - **PR URL**: A real GitHub PR URL (e.g., `https://github.com/owner/repo/pull/123`)
   - Other fields can use defaults
3. Click: **"Start Test Generation Workflow"**
4. Watch the magic happen! 🎉

## 🧪 What Happens

1. **GitHub** → Fetches real PR diff
2. **Gemini** → Analyzes code and plans tests
3. **MiniMax** → Generates actual test code
4. **CodeRabbit** → Reviews (mock for now)
5. **Jira** → Creates subtask with tests (if Jira URL/email set)

## ⚠️ Troubleshooting

**"MongoDB connection error"**
- Make sure MongoDB is running
- Check `MONGODB_URI` in `.env`

**"GitHub API error"**
- Verify token has `repo` scope
- Check if PR is accessible with your token

**"Jira API error"**
- Verify `JIRA_BASE_URL` and `JIRA_EMAIL` are correct
- Make sure token hasn't expired

**"Port already in use"**
- Change `API_PORT` in `.env` (backend)
- Change port in `vite.config.js` (frontend)

## 🎉 You're Ready!

All APIs are integrated and ready to go. The system will:
- Use **real APIs** when tokens are provided
- Fall back to **mock data** if APIs fail
- Show **real-time progress** in ReactFlow

Enjoy your automated test generation! 🚀

