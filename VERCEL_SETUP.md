# Vercel Deployment Setup

## 1. Vercel Configuration

The `vercel.json` file has been created to handle SPA routing. This ensures all routes (like `/signup`, `/login`, etc.) are handled by your React app instead of returning 404 errors.

## 2. Supabase Redirect URLs

You need to add your Vercel domain to Supabase's allowed redirect URLs:

1. Go to your Supabase project dashboard: https://zetnludhohdsxqlfnjsd.supabase.co
2. Navigate to **Authentication** → **URL Configuration**
3. Add these URLs to **Redirect URLs**:
   - `https://bowl-up.vercel.app`
   - `https://bowl-up.vercel.app/**` (wildcard for all routes)
   - `https://bowl-up.vercel.app/auth/callback` (if using auth callbacks)

4. Add your Vercel domain to **Site URL**:
   - `https://bowl-up.vercel.app`

## 3. Environment Variables on Vercel

Make sure to add your environment variables in Vercel:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   - `VITE_SUPABASE_URL` = `https://zetnludhohdsxqlfnjsd.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key-here`

## 4. Deploy

After making these changes:
1. Commit and push the `vercel.json` file
2. Vercel will automatically redeploy
3. Your routes should now work correctly!
