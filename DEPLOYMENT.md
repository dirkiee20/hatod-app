# HATOD Deployment Guide

This guide covers deploying your HATOD food delivery application to production.

## Architecture Overview

```
🌐 Frontend (Static HTML/JS) → 🚀 Backend API (Node.js) → 🗄️ Supabase Database
```

## Quick Deploy Options

### Option 1: Vercel (Recommended for Beginners)

#### Backend Deployment
1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy API:**
   ```bash
   cd api
   vercel --prod
   ```

3. **Set Environment Variables in Vercel Dashboard:**
   - `DATABASE_URL`: Your Supabase connection string
   - `JWT_SECRET`: Generate a secure random string
   - `CORS_ORIGIN`: Your frontend domain

#### Frontend Deployment
1. **Deploy Frontend:**
   ```bash
   vercel --prod
   ```

2. **Update API_BASE_URL in login.html:**
   ```javascript
   const API_BASE_URL = 'https://your-api-domain.vercel.app/api';
   ```

### Option 2: Railway (Full-Stack)

#### Deploy Both Services
1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Deploy API:**
   ```bash
   cd api
   railway init
   railway up
   ```

3. **Deploy Frontend:**
   ```bash
   cd ..
   railway init
   railway up
   ```

4. **Set Environment Variables:**
   ```bash
   railway variables set DATABASE_URL=your_supabase_url
   railway variables set JWT_SECRET=your_jwt_secret
   ```

### Option 3: Render (Free Tier Available)

#### Deploy API
1. **Connect GitHub Repository**
2. **Create Web Service:**
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm run server`

3. **Environment Variables:**
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret
   NODE_ENV=production
   ```

#### Deploy Frontend
1. **Create Static Site**
2. **Build Settings:**
   - Build Command: `npm run build:css`
   - Publish Directory: `.`

### Option 4: Docker Deployment

#### Local Testing
```bash
# Build and run with Docker Compose
docker-compose up --build

# Access:
# Frontend: http://localhost:8080
# API: http://localhost:4000
```

#### Production Docker
```bash
# Build API image
cd api
docker build -t hatod-api .
docker run -p 4000:4000 -e DATABASE_URL=... hatod-api

# Build frontend image
docker build -f Dockerfile.frontend -t hatod-frontend .
docker run -p 8080:80 hatod-frontend
```

## Environment Configuration

### Required Environment Variables

Create `.env` file in production:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require

# JWT
JWT_SECRET=your-super-secure-random-string-here

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Environment
NODE_ENV=production
```

### Supabase Setup

1. **Create Supabase Project**
2. **Get Connection Details:**
   - Project URL
   - Anon Key
   - Database Password
3. **Run Database Setup:**
   ```bash
   psql "your-connection-string" -f database/schema.sql
   psql "your-connection-string" -f database/seed.sql
   ```

## Domain Configuration

### Custom Domain Setup

1. **API Domain:** Point your API subdomain to the hosting service
2. **Frontend Domain:** Point your main domain to frontend hosting
3. **Update CORS:** Add your domains to `CORS_ORIGIN`

### SSL Certificates

Most hosting services provide automatic SSL:
- Vercel: Automatic
- Railway: Automatic
- Render: Automatic
- Netlify: Automatic

## Testing Deployment

### Health Checks
```bash
# API Health
curl https://your-api-domain.com/health

# API Endpoints
curl https://your-api-domain.com/api/restaurants
```

### Frontend Testing
1. Visit your frontend domain
2. Try login functionality
3. Check browser console for API calls

## Monitoring & Maintenance

### Logs
- **Vercel:** Dashboard → Functions → Logs
- **Railway:** Dashboard → Service → Logs
- **Render:** Dashboard → Service → Logs

### Database
- Monitor Supabase dashboard
- Set up alerts for usage limits
- Regular backups

### Performance
- Enable CDN for static assets
- Monitor API response times
- Set up error tracking (Sentry, etc.)

## Cost Estimation

### Monthly Costs (Approximate)

| Service | Free Tier | Paid Plan |
|---------|-----------|-----------|
| Vercel | 100GB bandwidth | $20+ |
| Railway | 512MB RAM | $10+ |
| Render | 750 hours | $7+ |
| Supabase | 500MB database | $25+ |

**Total Estimated Cost:** $50-100/month for small production app

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Check `CORS_ORIGIN` environment variable
   - Ensure API and frontend domains match

2. **Database Connection:**
   - Verify `DATABASE_URL` format
   - Check Supabase project status
   - Ensure SSL mode is correct

3. **JWT Token Issues:**
   - Verify `JWT_SECRET` is set
   - Check token expiration (24 hours)

4. **Build Failures:**
   - Check Node.js version compatibility
   - Verify all dependencies are listed
   - Check build logs for errors

### Debug Commands

```bash
# Test API locally
npm run server

# Test database connection
psql "your-database-url" -c "SELECT NOW();"

# Check environment variables
echo $DATABASE_URL
echo $JWT_SECRET
```

## Security Checklist

- ✅ Environment variables not committed
- ✅ HTTPS enabled
- ✅ CORS properly configured
- ✅ JWT tokens secure
- ✅ Passwords hashed
- ✅ Input validation active
- ✅ SQL injection prevention
- ✅ XSS protection headers

## Next Steps

1. **Domain Purchase:** Buy your domain
2. **DNS Configuration:** Point to hosting services
3. **SSL Setup:** Automatic with most providers
4. **Monitoring:** Set up error tracking
5. **Backup Strategy:** Database backups
6. **Scaling:** Monitor usage and scale as needed

## Support

If you encounter issues:
1. Check deployment logs
2. Verify environment variables
3. Test API endpoints individually
4. Check Supabase dashboard
5. Review CORS configuration

Your HATOD application is now ready for production deployment! 🚀