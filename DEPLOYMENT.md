# BaseBoard - Deployment Guide

Complete guide to deploy and publish your Farcaster mini-app.

## 📋 Prerequisites

- ✅ Code is ready and tested locally
- ✅ `.env.local` file with your API keys (if needed)
- ✅ Git repository (GitHub, GitLab, or Bitbucket)
- ✅ Vercel account (free tier works)

## 🚀 Deployment Steps

### Step 1: Push Code to GitHub

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - BaseBoard Farcaster mini-app"
   ```

2. **Create a GitHub repository**:
   - Go to https://github.com/new
   - Name it `base-board` (or your preferred name)
   - Don't initialize with README (you already have files)
   - Click "Create repository"

3. **Push your code**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/base-board.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. **Sign up/Login to Vercel**:
   - Go to https://vercel.com
   - Sign up with GitHub (recommended) or email

2. **Import your project**:
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Select the `base-board` repository

3. **Configure build settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

4. **Add Environment Variables**:
   - Click "Environment Variables" section
   - Add: `VITE_BASESCAN_API_KEY` = `27X7K75MY4FQW91XK4JS32R1TX1CW3SRRA`
   - Select environments: Production, Preview, Development
   - Click "Save"

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete (2-3 minutes)
   - Your app will be live at: `https://base-board-xxx.vercel.app`

### Step 3: Configure Custom Domain (Optional)

1. **In Vercel Dashboard**:
   - Go to your project → Settings → Domains
   - Add your custom domain (e.g., `baseboard.xyz`)
   - Follow DNS configuration instructions

2. **Update Farcaster Manifest**:
   - Edit `public/.well-known/farcaster.json`
   - Update all URLs to use your custom domain
   - Commit and push changes

### Step 4: Verify Farcaster Configuration

1. **Check Manifest is Accessible**:
   ```bash
   curl https://your-domain.vercel.app/.well-known/farcaster.json
   ```
   Should return your manifest JSON

2. **Test Webhook Endpoint**:
   ```bash
   curl https://your-domain.vercel.app/api/webhook
   ```
   Should return `{ "status": "ok" }`

3. **Validate in Farcaster Tools**:
   - Go to https://warpcast.com/~/developers/frames
   - Test your app URL
   - Verify all checks pass ✅

### Step 5: Make it Public on Farcaster

1. **Submit to Farcaster Directory** (if you want):
   - Your app is already discoverable via the manifest
   - Users can share your app URL in casts
   - The `fc:frame` meta tag makes it launchable

2. **Share Your App**:
   - Share the URL: `https://your-domain.vercel.app`
   - Users can open it in Warpcast
   - The "Open" button will appear in feed embeds

## 🔧 Post-Deployment Checklist

- [ ] App loads correctly at your Vercel URL
- [ ] Manifest is accessible at `/.well-known/farcaster.json`
- [ ] Webhook endpoint responds at `/api/webhook`
- [ ] Environment variables are set in Vercel
- [ ] App works when opened in Warpcast
- [ ] Wallet connection works
- [ ] Analyze function works correctly
- [ ] All images load (icon.png, image.png, splash.png)

## 🌐 Making it Public

### Option 1: Share Directly
- Share your app URL: `https://baseboard-gamma.vercel.app`
- Users can open it in Warpcast
- The frame embed will show "Open" button

### Option 2: Submit to Farcaster Directory
1. Ensure your manifest is complete and valid
2. Your app will be discoverable via the manifest
3. Users can find it by searching for your app name

### Option 3: Create a Cast
Share your app in a cast:
```
Check out BaseBoard - analyze Base wallet activity! 

https://baseboard-gamma.vercel.app
```

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel auto-detects)

### Environment Variables Not Working
- Ensure variable name starts with `VITE_`
- Redeploy after adding variables
- Check variable is set for correct environment

### Manifest Not Found
- Verify `public/.well-known/farcaster.json` exists
- Check file is committed to git
- Ensure Vercel is serving static files from `public/`

### App Not Opening in Warpcast
- Verify `fc:frame` meta tag in `index.html`
- Check manifest URLs match your deployment URL
- Ensure `sdk.actions.ready()` is called in `main.tsx`

## 📝 Important Files

- `public/.well-known/farcaster.json` - Farcaster manifest
- `api/webhook.js` - Webhook endpoint for Farcaster
- `index.html` - Contains `fc:frame` meta tag
- `.env.local` - Local environment variables (not deployed)
- `.env.example` - Template for environment variables

## 🔒 Security Notes

- ✅ `.env.local` is in `.gitignore` (won't be committed)
- ✅ API keys are stored in Vercel environment variables
- ✅ Never commit API keys to GitHub
- ✅ Use Vercel's environment variables for production

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Farcaster Frames Docs](https://docs.farcaster.xyz/learn/what-are-frames)
- [Base RPC Endpoints](https://docs.base.org/tools/network-faucets)

---

**Your app is now live!** 🎉

Share it with: `https://baseboard-gamma.vercel.app`

