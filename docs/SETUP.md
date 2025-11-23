# Setup Instructions

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/testflow
API_PORT=3000
NODE_ENV=development
EOF

# Make sure MongoDB is running
# On macOS with Homebrew:
# brew services start mongodb-community

# Start backend
npm start
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Start frontend
npm run dev
```

### 3. Access the App

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

## Testing the Workflow

1. Open http://localhost:5173
2. Fill in the form (default values work for demo)
3. Click "Start Test Generation Workflow"
4. Watch the ReactFlow visualization update in real-time!

## Troubleshooting

### MongoDB Connection Issues

If you see MongoDB connection errors:

```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB (macOS)
brew services start mongodb-community

# Or start manually
mongod --dbpath /usr/local/var/mongodb
```

### Port Already in Use

If port 3000 or 5173 is already in use:

```bash
# Backend: Change API_PORT in .env
# Frontend: Change port in vite.config.js
```

### WebSocket Connection Issues

- Check browser console for errors
- Verify backend CORS settings in `server.js`
- Make sure backend is running before frontend

## Next Steps

Once MVP is working:

1. Add real API keys to `.env`
2. Update service files with real API integrations
3. Test with real GitHub PRs
4. Deploy to production

