# Deployment Instructions

## 1. Code Pushed to GitHub
Your code has been successfully pushed to:
[https://github.com/Ahmedtarekmekled/shopydash](https://github.com/Ahmedtarekmekled/shopydash)

## 2. Deploy to Vercel
To host your application on Vercel:

1.  **Log in to Vercel**: Go to [vercel.com](https://vercel.com/) and log in (or sign up) using your **GitHub account**.
2.  **Import Project**:
    - Click on **"Add New..."** -> **"Project"**.
    - In the "Import Git Repository" section, find **shopydash** and click **Import**.
3.  **Configure Project**:
    - **Framework Preset**: Vercel should automatically detect **Vite**. If not, select **Vite** manually.
    - **Root Directory**: Leave as `./`.
    - **Build Command**: `npm run build` (Default).
    - **Output Directory**: `dist` (Default).
    - **Install Command**: `npm install` (Default).
4.  **Environment Variables**:
    - You MUST add your Supabase environment variables here for the app to work.
    - Copy them from your local `.env` file (or `src/lib/supabase.ts` if hardcoded, but better use env vars).
        - `VITE_SUPABASE_URL`: Your Supabase Project URL
        - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
5.  **Deploy**: Click **Deploy**.

## 3. Verify Deployment
Once the deployment is complete, Vercel will give you a live URL (which you've pointing to `https://www.shopydash.store/`).
Visit the link to see your live application!
