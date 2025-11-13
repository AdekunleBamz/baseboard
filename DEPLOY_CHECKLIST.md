# 🚀 Quick Deployment Checklist

## Before Deploying

- [ ] Test app locally: `npm run dev`
- [ ] Verify wallet analysis works
- [ ] Check all images load (icon.png, image.png, splash.png)
- [ ] Ensure `.env.local` is in `.gitignore`

## Deploy to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy on Vercel
- [ ] Go to https://vercel.com
- [ ] Import GitHub repository
- [ ] Framework: Vite (auto-detected)
- [ ] Add environment variable: `VITE_BASESCAN_API_KEY` = `27X7K75MY4FQW91XK4JS32R1TX1CW3SRRA`
- [ ] Click "Deploy"

### 3. Verify Deployment
- [ ] App loads at Vercel URL
- [ ] Test: `https://your-app.vercel.app/.well-known/farcaster.json`
- [ ] Test: `https://your-app.vercel.app/api/webhook`
- [ ] Open app in Warpcast
- [ ] Test wallet analysis

## Make Public

- [ ] Share your Vercel URL
- [ ] Create a cast with your app URL
- [ ] Test the "Open" button in feed embeds

## ✅ Done!

Your app is now live and public! 🎉

**Share it:** `https://baseboard-gamma.vercel.app`

