# Deploying Hospital EMR to Vercel

This guide will help you deploy your Hospital EMR application to Vercel.

## Prerequisites

- ✅ GitHub account
- ✅ Vercel account (free tier is fine)
- ✅ Supabase project already set up
- ✅ All database migrations applied

---

## Step 1: Prepare Your Repository

### 1.1 Create a GitHub Repository

```bash
# Initialize git if you haven't already
cd /Users/yusif/Dev/EMR
git init

# Create .gitignore if needed (should already exist)
# Add all files
git add .

# Commit your code
git commit -m "Initial commit - Hospital EMR"
```

### 1.2 Push to GitHub

```bash
# Create a new repository on GitHub (github.com/new)
# Then link and push:

git remote add origin https://github.com/YOUR_USERNAME/hospital-emr.git
git branch -M main
git push -u origin main
```

---

## Step 2: Configure Environment Variables

### 2.1 Get Supabase Credentials

Go to your Supabase project:
1. **Settings** → **API**
2. Copy these values:
   - `Project URL` (e.g., https://xxxxx.supabase.co)
   - `anon/public` key

### 2.2 Create `.env.local` (Already exists, verify it has):

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

⚠️ **Important:** Never commit `.env.local` to git (it's in `.gitignore`)

---

## Step 3: Deploy to Vercel

### Method 1: Vercel Dashboard (Easiest)

1. **Go to** [vercel.com](https://vercel.com)
2. **Sign in** with GitHub
3. **Click** "Add New Project"
4. **Select** your `hospital-emr` repository
5. **Configure** project:

   **Framework Preset:** Next.js (auto-detected)
   
   **Root Directory:** `./` (leave as is)
   
   **Build Command:** `npm run build` (default)
   
   **Output Directory:** `.next` (default)

6. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add `NEXT_PUBLIC_SUPABASE_URL` → your Supabase URL
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key

7. **Click "Deploy"**

### Method 2: Vercel CLI (Advanced)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? hospital-emr
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

---

## Step 4: Configure Supabase for Production

### 4.1 Update Supabase URL Settings

1. Go to **Supabase Dashboard**
2. **Settings** → **API**
3. **Scroll to "Site URL"**
4. Add your Vercel URL: `https://your-app.vercel.app`

### 4.2 Update Authentication Settings

1. **Authentication** → **URL Configuration**
2. **Site URL:** `https://your-app.vercel.app`
3. **Redirect URLs:** Add `https://your-app.vercel.app/login`

### 4.3 Enable Row Level Security

Make sure RLS is enabled on all tables:
```sql
-- Already done in your schema.sql, but verify:
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

---

## Step 5: Apply Database Migrations

Make sure all migrations are applied to your production database:

```sql
-- In Supabase SQL Editor, run these in order:

-- 1. User tracking migration
-- Copy content from: /supabase/migrations/add_user_tracking.sql

-- 2. Discharge note migration
-- Copy content from: /supabase/migrations/add_discharge_note.sql

-- 3. Missing encounter columns
-- Copy content from: /supabase/migrations/add_missing_encounter_columns.sql
```

---

## Step 6: Test Your Deployment

### 6.1 Visit Your Site

Go to: `https://your-app.vercel.app`

### 6.2 Test Features

- ✅ Login/Signup works
- ✅ Can create patients
- ✅ Can create encounters
- ✅ Timeline works
- ✅ File uploads work (Supabase Storage)
- ✅ Export functions work
- ✅ Profile page works

### 6.3 Check for Errors

Open browser console (F12) and check for:
- ❌ No CORS errors
- ❌ No authentication errors
- ❌ No API connection errors

---

## Step 7: Custom Domain (Optional)

### 7.1 Add Domain in Vercel

1. **Vercel Dashboard** → Your Project
2. **Settings** → **Domains**
3. **Add Domain** → Enter your domain
4. **Follow DNS instructions**

### 7.2 Update Supabase

Add your custom domain to:
- Supabase Site URL
- Supabase Redirect URLs

---

## Common Issues & Solutions

### Issue 1: "Hydration Error"
**Solution:** Clear Vercel cache and redeploy
```bash
vercel --force
```

### Issue 2: "Environment Variables Not Found"
**Solution:** 
- Check they're added in Vercel dashboard
- Make sure they start with `NEXT_PUBLIC_`
- Redeploy after adding

### Issue 3: "Supabase Connection Failed"
**Solution:**
- Verify Supabase URL is correct
- Check anon key is correct
- Ensure Supabase project is active

### Issue 4: "Images Not Loading"
**Solution:**
- Check Supabase Storage policies
- Verify bucket is public or has correct RLS
- Check CORS settings in Supabase

### Issue 5: "Database Columns Missing"
**Solution:**
- Run all migration files in Supabase SQL Editor
- Check schema matches your code

---

## Automatic Deployments

Once set up, Vercel will automatically deploy when you:

1. **Push to main branch** → Production deployment
2. **Push to other branches** → Preview deployment
3. **Open Pull Request** → Preview deployment

### Disable Auto-Deploy (Optional)

In Vercel:
- **Settings** → **Git**
- Configure which branches trigger deployments

---

## Environment Variables Checklist

Make sure these are set in Vercel:

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Performance Optimization

Vercel automatically handles:
- ✅ **CDN**: Global edge network
- ✅ **Caching**: Static assets cached
- ✅ **Compression**: Gzip/Brotli enabled
- ✅ **Image Optimization**: Next.js Image component
- ✅ **Code Splitting**: Automatic

---

## Monitoring

### Vercel Analytics (Optional)

Enable in Vercel Dashboard:
- **Analytics** tab
- View page views, performance
- Free tier available

### Supabase Logs

Check Supabase Dashboard:
- **Logs** → **API Logs**
- Monitor database queries
- Check authentication events

---

## Security Checklist

Before going live:

- ✅ All RLS policies enabled
- ✅ Environment variables not in code
- ✅ Supabase API keys correct (anon, not service key)
- ✅ Authentication required for all routes
- ✅ File upload size limits in place
- ✅ Input validation on all forms

---

## Costs

### Vercel
- **Hobby (Free):**
  - Unlimited deployments
  - 100GB bandwidth/month
  - Good for small teams

### Supabase
- **Free Tier:**
  - 500MB database
  - 1GB file storage
  - 2GB bandwidth
  - Good for development

---

## Quick Deploy Commands

```bash
# Initial setup
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_REPO_URL
git push -u origin main

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Set up custom domain (if desired)
3. ✅ Monitor logs for errors
4. ✅ Set up backups (Supabase daily backups)
5. ✅ Configure alerts for downtime
6. ✅ Train users on the system

---

## Support Resources

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Next.js Deployment:** [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)

---

**Your app will be live at:** `https://hospital-emr.vercel.app` 🚀

