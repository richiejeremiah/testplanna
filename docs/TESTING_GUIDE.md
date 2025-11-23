# 🧪 Testing Guide - TestFlow AI

## ✅ Server Status
- ✅ Backend: Running on http://localhost:3000
- ✅ Frontend: Running on http://localhost:5173

## 🚀 Quick Test Steps

### 1. Open the Frontend
Open your browser and go to:
```
http://localhost:5173
```

### 2. Test the Dashboard
You should see:
- ✅ "TestFlow AI - Automated Test Generation" header
- ✅ Form with fields:
  - Jira Ticket Key (default: DEMO-123)
  - PR URL or Repository URL (required)
  - Summary (optional)

### 3. Test with Real Repository
Enter these values:
- **Jira Ticket Key:** `TEST-001` (or any key)
- **PR URL:** `https://github.com/richiejeremiah/doclittle-platform`
- **Summary:** `Test workflow with real repository`

Click **"🚀 Start Test Generation Workflow"**

### 4. What to Watch For

#### **Progress Timeline (Top of Screen)**
- ✅ Should show 5 steps: GitHub PR → AI Planning → Test Generation → CodeRabbit → Jira Push
- ✅ Steps should highlight as workflow progresses
- ✅ Completed steps show green checkmarks

#### **ReactFlow Canvas**
- ✅ **Step Numbers:** Each node should have a numbered badge (1-4) in top-left corner
- ✅ **Status Badges:** Each node should show prominent status badges:
  - ⏱️ Pending
  - 📥 Fetching
  - 🔍 Analyzing
  - ⚡ Generating
  - 🔬 Reviewing
  - ✅ Complete
- ✅ **Animated Edges:** Lines between nodes should be animated with labels:
  - "Code diff →" (blue)
  - "Generated tests →" (purple)
  - "Review complete →" (green)

#### **Node Details**
- ✅ **GitHub Node (Step 1):**
  - Shows PR number and branch
  - Status badge updates from "Fetching" to "Ready"
  - Click to see PR details in side panel

- ✅ **AI Review Node (Step 2):**
  - Shows "Analyzing..." then "Generating..."
  - **Expandable Reasoning:** Click "🧠 AI Reasoning" to see AI's thought process
  - Progress bar during analysis
  - Summary stats when complete (Unit/Integration/Edge Cases)
  - Click node to see detailed reasoning in side panel

- ✅ **CodeRabbit Node (Step 3):**
  - Shows "Reviewing..." then "Complete"
  - Displays review results (approved, warnings, critical issues)
  - Click to see detailed review in side panel

- ✅ **Jira Node (Step 4):**
  - Shows "Creating..." then "Complete"
  - Displays created issue key and coverage stats
  - Click to see Jira details and link

#### **Side Panel (Right Side)**
- ✅ Click any node to open detailed side panel
- ✅ **Enhanced Design:**
  - Gradient header matching node type
  - Step-by-step reasoning (for AI Review)
  - Better visual hierarchy
  - Copy-to-clipboard for generated code

### 5. Terminal Logging
Watch your backend terminal for detailed logs:
```
────────────────────────────────────────────────────────────
🔄 WORKFLOW: Starting workflow for Jira ticket: TEST-001
  ✅ SUCCESS: Workflow created in database: abc12345
🔄 WORKFLOW: Pipeline started
  ⚡ STEP: STEP 0: Finding associated GitHub PR
  📊 DATA [Jira Ticket Key]: TEST-001
  ✅ SUCCESS: Found PR: https://github.com/...
  ⚡ STEP: STEP 1: Fetching GitHub code context
  📡 API [GitHub]: GET Repo: richiejeremiah/doclittle-platform
  📥 API [GitHub]: 200
  ...
```

## 🐛 Troubleshooting

### Issue: Nodes not appearing
- **Check:** Browser console for errors
- **Check:** WebSocket connection (should see "node-created" events)
- **Fix:** Refresh page and try again

### Issue: Status badges not showing
- **Check:** StatusBadge component is imported correctly
- **Check:** Node data includes `status` field
- **Fix:** Check browser console for import errors

### Issue: Edges not animated
- **Check:** ReactFlow version (should be ^11.10.1)
- **Check:** Edge data includes `animated: true`
- **Fix:** Verify WorkflowBroadcaster is sending correct edge data

### Issue: Progress timeline not updating
- **Check:** Nodes array is being passed correctly
- **Check:** Node status values match expected values
- **Fix:** Check ProgressTimeline component receives nodes prop

### Issue: Expandable reasoning not working
- **Check:** AIReviewNode has `data.reasoning` field
- **Check:** State management for `showReasoning`
- **Fix:** Verify reasoning is included in node updates

## ✅ Expected Test Results

### Successful Workflow Should Show:
1. ✅ Progress timeline updates through all 5 steps
2. ✅ All 4 nodes appear with step numbers
3. ✅ Status badges update in real-time
4. ✅ Animated edges flow between nodes
5. ✅ AI reasoning is expandable in AI Review node
6. ✅ Side panel shows detailed information
7. ✅ Terminal shows detailed logging
8. ✅ Final Jira subtask is created

### Test Duration:
- **Mock Mode:** ~5-10 seconds
- **Real API Mode:** ~30-60 seconds (depends on API response times)

## 🎯 Demo Checklist

Before your hackathon demo, verify:
- [ ] All UI improvements are visible
- [ ] Progress timeline works
- [ ] Status badges update correctly
- [ ] Animated edges are visible
- [ ] AI reasoning is expandable
- [ ] Side panel shows detailed info
- [ ] Terminal logging is working
- [ ] No console errors
- [ ] No crashes with missing data
- [ ] Workflow completes successfully

## 📝 Test Data

### Test Repository:
```
https://github.com/richiejeremiah/doclittle-platform
```

### Test Jira Ticket:
```
TEST-001
```

### Expected Output:
- Workflow ID generated
- 4 nodes created
- 3 edges created
- Progress through all steps
- Jira subtask created (or mocked)

---

**Ready to test!** Open http://localhost:5173 and start a workflow! 🚀

