# Jira Webhook Setup Guide

## Overview

Jira webhooks allow TestFlow AI to automatically trigger workflows when a ticket status changes to "Ready for Testing".

## Setup Steps

### 1. Get Your Webhook URL

Your webhook endpoint is:
```
https://your-domain.com/api/workflows/webhooks/jira
```

For local development/testing:
```
http://localhost:3000/api/workflows/webhooks/jira
```

**Note:** For local testing, use a tool like [ngrok](https://ngrok.com/) to expose your local server:
```bash
ngrok http 3000
# Use the ngrok URL: https://abc123.ngrok.io/api/workflows/webhooks/jira
```

### 2. Create Webhook in Jira

1. Go to **Jira Settings** → **System** → **Webhooks**
2. Click **Create a webhook**
3. Fill in:
   - **Name:** `TestFlow AI`
   - **URL:** Your webhook URL (from step 1)
   - **Status:** Enabled
   - **Events:** Select **Issue updated**
   - **JQL filter (optional):** `project = YOUR_PROJECT_KEY`
4. **Copy the webhook secret** (if provided) - this is your `JIRA_WEBHOOK_SECRET`

### 3. Configure Webhook Secret (Optional but Recommended)

Add to `backend/.env`:
```bash
JIRA_WEBHOOK_SECRET=your_webhook_secret_from_jira
```

**Security Note:**
- If `JIRA_WEBHOOK_SECRET` is set, webhook signature verification is enabled
- If not set, webhooks are accepted without verification (development only)

### 4. Test the Webhook

**Option A: Manual Test**
1. Create a test Jira ticket
2. Add a GitHub PR URL to the description:
   ```
   PR: https://github.com/owner/repo/pull/123
   ```
3. Change ticket status to **"Ready for Testing"**
4. Check backend logs - you should see:
   ```
   Workflow triggered
   Issue Key: YOUR-TICKET-123
   ```

**Option B: Use curl**
```bash
curl -X POST http://localhost:3000/api/workflows/webhooks/jira \
  -H "Content-Type: application/json" \
  -d '{
    "webhookEvent": "jira:issue_updated",
    "issue": {
      "key": "DEMO-123",
      "fields": {
        "summary": "Test Ticket",
        "description": "PR: https://github.com/owner/repo/pull/123",
        "assignee": {
          "emailAddress": "user@example.com"
        }
      }
    },
    "changelog": {
      "items": [{
        "field": "status",
        "toString": "Ready for Testing"
      }]
    }
  }'
```

## Webhook Payload Structure

Jira sends webhooks in this format:

```json
{
  "webhookEvent": "jira:issue_updated",
  "issue": {
    "key": "PROJ-123",
    "fields": {
      "summary": "Ticket title",
      "description": "Ticket description with PR link",
      "assignee": {
        "emailAddress": "user@example.com"
      }
    }
  },
  "changelog": {
    "items": [{
      "field": "status",
      "fromString": "In Progress",
      "toString": "Ready for Testing"
    }]
  }
}
```

## Security: Webhook Signature Verification

Jira can send webhooks with HMAC SHA-256 signatures for security.

**How it works:**
1. Jira creates a signature using your webhook secret
2. Sends signature in `X-Jira-Signature` header
3. Backend verifies signature matches payload

**Enable verification:**
1. Get webhook secret from Jira webhook settings
2. Add to `.env`: `JIRA_WEBHOOK_SECRET=your_secret`
3. Backend automatically verifies all webhooks

**Disable for development:**
- Simply don't set `JIRA_WEBHOOK_SECRET` in `.env`
- Webhooks will be accepted without verification

## Troubleshooting

### Webhook not triggering

**Check:**
1. Webhook URL is correct and accessible
2. Webhook is enabled in Jira
3. Status change is to exactly "Ready for Testing" (case-sensitive)
4. Backend logs show webhook received

**Debug:**
```bash
# Check backend logs
tail -f backend/logs/app.log

# Or check console output when running npm start
```

### "Invalid webhook signature" error

**Solution:**
1. Verify `JIRA_WEBHOOK_SECRET` matches Jira webhook settings
2. Or remove `JIRA_WEBHOOK_SECRET` from `.env` for development

### Webhook received but workflow not starting

**Check:**
1. PR URL is in Jira ticket description
2. Backend logs show workflow error
3. MongoDB is running and connected

**Common issues:**
- No PR URL found → Add PR link to ticket description
- GitHub API error → Check `GITHUB_TOKEN` in `.env`
- MongoDB error → Check `MONGODB_URI` in `.env`

## Production Deployment

For production:

1. **Use HTTPS:** Webhooks must use HTTPS (not HTTP)
2. **Set webhook secret:** Always enable signature verification
3. **Monitor logs:** Set up logging/monitoring for webhook events
4. **Rate limiting:** Consider adding rate limiting to webhook endpoint
5. **Error handling:** Webhook should return 200 even if workflow fails (to prevent Jira retries)

## Example: Complete Setup

```bash
# 1. Start backend
cd backend
npm start

# 2. Expose with ngrok (for local testing)
ngrok http 3000

# 3. Create webhook in Jira pointing to:
# https://abc123.ngrok.io/api/workflows/webhooks/jira

# 4. Add webhook secret to .env
echo "JIRA_WEBHOOK_SECRET=your_secret" >> backend/.env

# 5. Restart backend
npm start

# 6. Test by changing Jira ticket status
```

---

**Need help?** Check backend logs for detailed error messages.

