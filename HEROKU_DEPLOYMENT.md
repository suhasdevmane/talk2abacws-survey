# Heroku Deployment Guide

This guide covers deploying the Talk2ABACWS Survey Platform to Heroku.

## Prerequisites

1. Install Heroku CLI:
   ```bash
   # Windows (PowerShell)
   winget install Heroku.HerokuCLI
   
   # Or download from: https://devcenter.heroku.com/articles/heroku-cli
   ```

2. Login to Heroku:
   ```bash
   heroku login
   ```

3. Set up MongoDB (required - Heroku doesn't provide MongoDB):
   - **Option A: MongoDB Atlas (Recommended - Free tier available)**
     - Sign up at https://www.mongodb.com/cloud/atlas
     - Create a free cluster
     - Get connection string (looks like: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`)
   
   - **Option B: Use add-on (paid)**
     ```bash
     heroku addons:create mongolab:sandbox
     ```

## Deployment Options

### Option 1: Container-Based Deployment (Recommended)

This deploys using Docker containers and heroku.yml:

```bash
# 1. Create Heroku app
heroku create your-app-name

# 2. Set stack to container
heroku stack:set container -a your-app-name

# 3. Set environment variables
heroku config:set \
  NODE_ENV=production \
  JWT_SECRET=$(openssl rand -hex 32) \
  SESSION_SECRET=$(openssl rand -hex 32) \
  API_KEY=$(openssl rand -hex 16) \
  MONGO_URL="your-mongodb-atlas-connection-string" \
  -a your-app-name

# 4. Deploy
git push heroku main

# 5. Open your app
heroku open -a your-app-name
```

### Option 2: Buildpack Deployment (API Only)

Deploy just the API service using Node.js buildpack:

```bash
# 1. Create Heroku app
heroku create your-app-name

# 2. Set buildpack
heroku buildpacks:set heroku/nodejs -a your-app-name

# 3. Set environment variables (same as above)
heroku config:set \
  NODE_ENV=production \
  API_PORT=\$PORT \
  JWT_SECRET=$(openssl rand -hex 32) \
  SESSION_SECRET=$(openssl rand -hex 32) \
  API_KEY=$(openssl rand -hex 16) \
  MONGO_URL="your-mongodb-atlas-connection-string" \
  -a your-app-name

# 4. Deploy
git push heroku main

# 5. Check logs
heroku logs --tail -a your-app-name
```

### Option 3: Deploy Multiple Services (Separate Apps)

For a complete deployment with frontend and visualizer, create separate Heroku apps:

```bash
# API Service
heroku create your-app-api
cd api
git subtree push --prefix api heroku main

# Frontend Service
heroku create your-app-frontend
# Set REACT_APP_API_URL to point to your-app-api.herokuapp.com
heroku config:set REACT_APP_API_URL=https://your-app-api.herokuapp.com/api -a your-app-frontend
cd ../rasa-frontend
git subtree push --prefix rasa-frontend heroku main

# Visualizer Service
heroku create your-app-visualiser
cd ../visualiser
git subtree push --prefix visualiser heroku main
```

## Environment Variables Reference

Set these on Heroku:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `production` |
| `PORT` | Port (auto-set by Heroku) | `8080` |
| `MONGO_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/survey_db` |
| `JWT_SECRET` | JWT signing secret | Generate with `openssl rand -hex 32` |
| `SESSION_SECRET` | Session secret | Generate with `openssl rand -hex 32` |
| `API_KEY` | API authentication key | Generate with `openssl rand -hex 16` |

PowerShell commands to generate secrets:
```powershell
# Generate JWT_SECRET
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Or use this online: https://randomkeygen.com/
```

## Update API to Use Heroku PORT

The API needs to use Heroku's dynamic PORT. Update `api/src/server.js` or `api/src/app.js`:

```javascript
const PORT = process.env.PORT || process.env.API_PORT || 5000;
app.listen(PORT, () => {
  console.log(`API is listening on port ${PORT}...`);
});
```

## Troubleshooting

### Check logs
```bash
heroku logs --tail -a your-app-name
```

### Check app info
```bash
heroku apps:info -a your-app-name
```

### Restart app
```bash
heroku restart -a your-app-name
```

### Scale dynos
```bash
heroku ps:scale web=1 -a your-app-name
```

### Access bash shell
```bash
heroku run bash -a your-app-name
```

### Check config
```bash
heroku config -a your-app-name
```

## Common Issues

1. **"No default language detected"**
   - Fixed: Root `package.json` now exists
   - Heroku will detect Node.js automatically

2. **"Application Error" or H10 error**
   - Check PORT binding: App must use `process.env.PORT`
   - Check logs: `heroku logs --tail`
   - Verify MongoDB connection string

3. **MongoDB connection failed**
   - Verify MONGO_URL is set correctly
   - Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for Heroku)
   - Ensure database user has correct permissions

4. **Build timeout**
   - Container builds can be slow
   - Consider using buildpack deployment (Option 2)
   - Or pre-build images and push to Heroku container registry

## Deploy Pre-built Images from GHCR

If you have images in GitHub Container Registry:

```bash
# Login to Heroku container registry
heroku container:login

# Pull from GHCR and tag for Heroku
docker pull ghcr.io/suhasdevmane/talk2abacws-api:latest
docker tag ghcr.io/suhasdevmane/talk2abacws-api:latest registry.heroku.com/your-app-name/web

# Push to Heroku
docker push registry.heroku.com/your-app-name/web

# Release
heroku container:release web -a your-app-name
```

## Cost Estimates

- **Free Tier**: 
  - 1 dyno (sleeps after 30 min inactivity)
  - 550-1000 dyno hours/month
  - No MongoDB included (use MongoDB Atlas free tier)

- **Basic Tier ($7/month)**:
  - No sleep
  - Custom domains
  - SSL

- **MongoDB Atlas**: Free tier (512MB) available

## Next Steps After Deployment

1. Set up custom domain:
   ```bash
   heroku domains:add www.yourdomain.com -a your-app-name
   ```

2. Enable SSL (auto with paid dyno)

3. Set up monitoring:
   ```bash
   heroku addons:create papertrail:choklad -a your-app-name
   ```

4. Configure CORS in API to allow your Heroku domain

5. Update frontend environment variables to point to deployed API

## Support

- Heroku Dev Center: https://devcenter.heroku.com/
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- GitHub Issues: https://github.com/suhasdevmane/talk2abacws-survey/issues
