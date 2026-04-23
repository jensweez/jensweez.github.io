# Spell Check App — Deployment Guide

## Project Structure
```
spelling-app/
├── api/
│   └── analyze.js        ← Vercel serverless function (calls Claude API)
├── public/
│   └── index.html        ← The full frontend app
├── vercel.json           ← Vercel routing config
└── README.md
```

## One-time Setup

### 1. Get an Anthropic API Key
- Go to https://console.anthropic.com
- Sign up / log in → API Keys → Create Key
- Copy the key (starts with `sk-ant-...`)
- Add some credits (~$5 lasts a very long time for this app)

### 2. Push to GitHub
```bash
cd spelling-app
git init
git add .
git commit -m "Initial commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/spelling-app.git
git push -u origin main
```

### 3. Deploy to Vercel
1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New Project** → import your `spelling-app` repo
3. Under **Build & Output Settings**:
   - Framework Preset: **Other**
   - Output Directory: `public`
4. Under **Environment Variables**, add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your `sk-ant-...` key
5. Click **Deploy**

Vercel gives you a URL like `https://spelling-app-xyz.vercel.app` — that's your app, live.

## Updating the App
Any `git push` to `main` automatically redeploys on Vercel.

## Costs
- Vercel free tier: plenty for personal use
- Anthropic API: each photo scan costs roughly $0.01–0.03 depending on image size
  - $5 in credits = ~200–500 homework scans
