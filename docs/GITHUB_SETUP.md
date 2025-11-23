 add# GitHub API Token Setup

## How to Get Your GitHub Personal Access Token

### Step 1: Go to GitHub Settings
1. Go to https://github.com/settings/tokens
2. Or: GitHub → Your Profile → Settings → Developer settings → Personal access tokens → Tokens (classic)

### Step 2: Generate New Token
1. Click **"Generate new token"** → **"Generate new token (classic)"**
2. Give it a name: `TestFlow AI`
3. Set expiration (recommend: 90 days or No expiration for development)

### Step 3: Select Scopes
**Required scopes:**
- ✅ **`repo`** - Full control of private repositories
  - This gives access to:
    - Read PRs
    - Read code diffs
    - Read file contents

**Optional but recommended:**
- ✅ **`read:org`** - Read org and team membership (if using org repos)

### Step 4: Generate and Copy
1. Click **"Generate token"**
2. **⚠️ IMPORTANT:** Copy the token immediately - you won't be able to see it again!
3. It will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 5: Add to .env
```bash
# In backend/.env
GITHUB_TOKEN=ghp_your_token_here
```

## Testing Your Token

You can test if your token works:

```bash
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

If it works, you'll see your GitHub user info.

## Security Notes

- ⚠️ **Never commit tokens to git** - they're already in `.gitignore`
- ⚠️ **Don't share tokens** - treat them like passwords
- ⚠️ **Rotate tokens regularly** - especially if exposed
- ✅ **Use fine-grained tokens** (newer option) if you want more granular control

## Alternative: Fine-Grained Personal Access Token

GitHub also offers "Fine-grained personal access tokens" with more granular permissions:

1. Go to: https://github.com/settings/tokens?type=beta
2. Generate new token
3. Select specific repositories
4. Select permissions:
   - Contents: Read
   - Pull requests: Read
   - Metadata: Read (automatic)

This is more secure but requires more setup.

## Troubleshooting

**Error: "Bad credentials"**
- Check that token is correct
- Make sure token hasn't expired
- Verify token has `repo` scope

**Error: "Not found"**
- Token might not have access to the repository
- Check if repo is private and token has access
- Verify repository owner/name is correct

**Error: "API rate limit exceeded"**
- GitHub has rate limits (5000 requests/hour for authenticated users)
- Wait a bit and try again
- Consider using a GitHub App for higher limits

