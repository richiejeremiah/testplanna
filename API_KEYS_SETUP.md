# API Keys Setup - Quick Reference

## ✅ Already Configured

I've updated all service files with real API integrations. You just need to:

1. **Update `.env` file** in `backend/` directory
2. **Get GitHub token** (see instructions below)
3. **Add Jira base URL and email** (you have the token, just need URL/email)

## 📝 Update backend/.env File

Create or edit `backend/.env` with these values:

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

## 🔑 What You Need to Provide

### 1. GitHub Token (Required)
- See `GITHUB_SETUP.md` for detailed instructions
- Quick: https://github.com/settings/tokens → Generate new token (classic) → Select `repo` scope
- Token format: `ghp_xxxxxxxxxxxxx`

### 2. Jira Base URL and Email - ✅ Complete!
- **Jira Base URL**: `https://drlittlekids.atlassian.net`
- **Jira Email**: `drlittlekids@gmail.com`
- **Token**: ✅ Already configured

## 🚀 After Setup

1. **Install new dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Start backend:**
   ```bash
   npm start
   ```

3. **Test the workflow:**
   - Open frontend: http://localhost:5173
   - Enter a real GitHub PR URL
   - Watch real AI services generate tests!

## 📋 Service Status

| Service | Status | Notes |
|---------|--------|-------|
| Gemini | ✅ Integrated | Real API calls ready |
| MiniMax | ✅ Integrated | Real API calls ready |
| Jira | ✅ Integrated | All configured! |
| GitHub | ✅ Integrated | Token provided |
| CodeRabbit | ⏸️ Optional | Can add later |

## 🧪 Testing Without All APIs

The system has **fallback mock data** built in, so:
- ✅ Works even if APIs fail
- ✅ Works if tokens are missing
- ✅ Gracefully degrades to mock data

You can test the full workflow visualization right now, and it will use real APIs when tokens are provided!

