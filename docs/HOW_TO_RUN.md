# 🚀 How to Run TestFlow AI

## Prerequisites

1. **Node.js** (v18+) - Check: `node --version`
2. **MongoDB** - Running locally or cloud instance
3. **API Keys** - Already configured in `.env`

## Quick Start

### Step 1: Start MongoDB

**macOS (Homebrew):**
```bash
brew services start mongodb-community
```

**Or manually:**
```bash
mongod --dbpath /usr/local/var/mongodb
```

**Or use MongoDB Atlas (cloud):**
- Update `MONGODB_URI` in `backend/.env` with your Atlas connection string

### Step 2: Start Backend

```bash
cd backend
npm start
```

**Expected output:**
```
✅ MongoDB connected
🚀 Server running on http://localhost:3000
📡 WebSocket server ready
```

**For development (auto-reload):**
```bash
cd backend
npm run dev
```

### Step 3: Start Frontend (New Terminal)

```bash
cd frontend
npm install  # First time only
npm run dev
```

**Expected output:**
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 4: Open Browser

Open: **http://localhost:5173**

---

## 🎯 Testing the Workflow

### Option 1: Manual Trigger (Dashboard)

1. Open http://localhost:5173
2. Fill in the form:
   - **Jira Ticket Key**: `DEMO-123`
   - **PR URL**: `https://github.com/owner/repo/pull/123` (use a real PR)
   - Other fields can use defaults
3. Click **"Start Test Generation Workflow"**
4. Watch ReactFlow visualization update in real-time!

### Option 2: Demo Mode (Instant)

**Backend:**
```bash
curl http://localhost:3000/api/workflows/demo
```

**Frontend:** (You can add a "Load Demo" button)

### Option 3: Jira Webhook (Production)

1. Set up Jira webhook pointing to: `https://your-domain.com/api/workflows/webhooks/jira`
2. Mark a Jira ticket as "Ready for Testing"
3. Workflow auto-triggers!

---

## 🔍 Verify Everything Works

### Check Backend Health

```bash
curl http://localhost:3000/health
```

**Expected:**
```json
{"status":"ok","timestamp":"2024-11-22T..."}
```

### Check MongoDB Connection

Backend logs should show:
```
✅ MongoDB connected
```

If not, check:
- MongoDB is running
- `MONGODB_URI` in `.env` is correct

### Check WebSocket

Open browser console (F12) and look for:
```
🔌 Client connected: [socket-id]
```

---

## 🐛 Troubleshooting

### "Port 3000 already in use"

**Solution:**
```bash
# Change port in backend/.env
API_PORT=3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill
```

### "MongoDB connection error"

**Solutions:**
1. Make sure MongoDB is running:
   ```bash
   brew services list | grep mongodb
   ```

2. Check connection string in `backend/.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/testflow
   ```

3. Test MongoDB connection:
   ```bash
   mongosh testflow
   ```

### "npm: command not found"

**Solution:**
```bash
# Use nvm to load Node.js
source ~/.nvm/nvm.sh
nvm use node

# Or install Node.js
brew install node
```

### "Frontend not connecting to backend"

**Check:**
1. Backend is running on port 3000
2. Frontend proxy in `vite.config.js` points to `http://localhost:3000`
3. No CORS errors in browser console

### "WebSocket connection failed"

**Check:**
1. Backend Socket.io server is running
2. CORS settings in `server.js` allow `http://localhost:5173`
3. Firewall isn't blocking WebSocket connections

---

## 📊 What to Expect

### Successful Workflow Run

1. **GitHub Node** appears (blue) - Shows PR info
2. **AI Review Node** appears (purple) - Shows "analyzing" → "complete"
3. **CodeRabbit Node** appears (orange) - Shows review results
4. **Jira Node** appears (green) - Shows subtask created

### Timeline

- **GitHub fetch**: ~1-2 seconds
- **AI Planning (Gemini)**: ~2-3 seconds
- **AI Generation (MiniMax)**: ~3-5 seconds
- **CodeRabbit Review**: ~2 seconds (mock)
- **Jira Push**: ~1-2 seconds

**Total**: ~10-15 seconds for full workflow

---

## 🎬 Demo Mode

For instant demo (no API calls):

```bash
# Get demo data
curl http://localhost:3000/api/workflows/demo

# Create demo workflow in DB
curl -X POST http://localhost:3000/api/workflows/demo/create
```

Then in frontend, load the demo workflow ID.

---

## 🔄 Development Workflow

1. **Backend changes**: Auto-reload with `npm run dev`
2. **Frontend changes**: Vite hot-reloads automatically
3. **Database changes**: Restart backend to reconnect

---

## 📝 Environment Variables

Make sure `backend/.env` has:

```bash
MONGODB_URI=mongodb://localhost:27017/testflow
API_PORT=3000
GITHUB_TOKEN=ghp_...
GEMINI_API_KEY=...
MINIMAX_API_KEY=...
JIRA_BASE_URL=https://drlittlekids.atlassian.net
JIRA_EMAIL=drlittlekids@gmail.com
JIRA_API_TOKEN=...
```

---

## ✅ Quick Checklist

- [ ] MongoDB running
- [ ] Backend started (`npm start` in `backend/`)
- [ ] Frontend started (`npm run dev` in `frontend/`)
- [ ] Browser open to http://localhost:5173
- [ ] No errors in terminal or browser console
- [ ] Can see Dashboard UI
- [ ] Can trigger workflow

---

## 🎉 You're Ready!

Once both servers are running:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173

Open the frontend URL and start testing!

