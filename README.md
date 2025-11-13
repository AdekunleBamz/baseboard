# BaseBoard - Base Chain Wallet Analytics

A Farcaster mini-app for analyzing wallet activity on the Base chain. Built with Vite, React, and Wagmi.

## 🚀 Quick Start

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your API keys (optional - works without APIs)
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   - Local: http://localhost:5173
   - Or open in Warpcast to test as mini-app

### Deploy to Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

**Quick Deploy to Vercel**:
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variable: `VITE_BASESCAN_API_KEY` (optional)
4. Deploy!

## 📋 Features

- ✅ Real-time wallet balance
- ✅ Transaction count (sent transactions)
- ✅ Last transaction timestamp
- ✅ Basename lookup
- ✅ Beautiful UI with Base branding
- ✅ Works without API keys (uses Base RPC)

## 🔧 Configuration

### Farcaster Manifest

The `/.well-known/farcaster.json` is served from the [public directory](https://vite.dev/guide/assets) and can be updated by editing `./public/.well-known/farcaster.json`.

### Frame Embed

The `fc:frame` meta tag in `index.html` makes your app URL shareable in feeds with an "Open" button.

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Complete deployment instructions
- [Deployment Checklist](./DEPLOY_CHECKLIST.md) - Quick checklist

## 🛠️ Tech Stack

- **Framework**: Vite + React
- **Blockchain**: Base (via Base RPC)
- **Wallet**: Wagmi + Farcaster Mini App Connector
- **Deployment**: Vercel

## 📝 License

MIT
