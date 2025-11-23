# 🚀 Fastest MongoDB Setup - MongoDB Atlas (Cloud)

## Step 1: Create Free MongoDB Atlas Account (2 minutes)

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up (free)
3. Create a **FREE** cluster (M0 - Free tier)
4. Choose any cloud provider/region
5. Click "Create Cluster"

## Step 2: Get Connection String (1 minute)

1. Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Copy the connection string (looks like):
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 3: Update .env File

Replace the connection string in `backend/.env`:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/testflow?retryWrites=true&w=majority
```

**Important:** Replace:
- `username` with your MongoDB username
- `password` with your MongoDB password
- Add `/testflow` before the `?` (database name)

## Step 4: Start Backend

```bash
cd backend
npm start
```

**That's it!** MongoDB Atlas is instant - no installation needed.

---

## Alternative: Local MongoDB (if you prefer)

If you want local MongoDB instead:

```bash
# Add MongoDB tap
brew tap mongodb/brew

# Install MongoDB
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

But **Atlas is faster** - just update the connection string and you're done!

