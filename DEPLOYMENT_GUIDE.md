# Event Gallery System - Deployment Guide

This document outlines the steps to take this Next.js application from your local machine (using SQLite) to a production environment (using Vercel for hosting and PostgreSQL for the database).

## 1. Database Migration (SQLite to PostgreSQL)

Currently, the application runs on a local SQLite database (`dev.db`). Production workloads, especially those on serverless platforms like Vercel, require a hosted PostgreSQL database (like **Neon**, **Supabase**, or **AWS RDS**).

### Steps to Switch to PostgreSQL
1. Create a free PostgreSQL database (e.g., on [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/)).
2. Obtain your PostgreSQL connection string (it will look like `postgresql://user:password@host:port/dbname`).
3. Open `prisma/schema.prisma` in your project.
4. Change the `provider` in the `datasource` block:
   ```prisma
   datasource db {
     provider = "postgresql" // Changed from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
5. Open your `.env` file and replace the `DATABASE_URL` with your new PostgreSQL connection string:
   ```env
   DATABASE_URL="your-new-postgres-connection-string"
   ```
6. Run the Prisma migration command to generate the tables in your new database:
   ```bash
   npx prisma migrate dev --name init_postgres
   ```

## 2. Deploying to Vercel

Vercel is the creator of Next.js and the easiest place to host this application.

1. **Commit to GitHub**:
   Ensure all your code is committed and pushed to a GitHub repository.
   ```bash
   git add .
   git commit -m "Ready for production"
   git push origin main
   ```
2. **Connect to Vercel**:
   - Go to [Vercel.com](https://vercel.com/) and sign in with GitHub.
   - Click **"Add New..." -> "Project"**.
   - Import your GitHub repository.
3. **Configure Environment Variables in Vercel**:
   Before clicking "Deploy", open the "Environment Variables" section and add:
   - `DATABASE_URL`: (Your PostgreSQL connection string)
   - `NEXTAUTH_SECRET`: (Generate a secure random string, or use the one from your local `.env`)
   - `NEXTAUTH_URL`: `https://your-app-domain.vercel.app` (The URL Vercel assigns you)
4. **Deploy**:
   Click **Deploy**. Vercel will automatically run `npm run build` and `prisma generate`.

## 3. Image Storage Considerations

Currently, the `/api/upload` endpoint saves images to the local `public/uploads` directory. **This will not work in a serverless environment like Vercel** because the file system is read-only and ephemeral.

Before deploying to production, you will need to swap the local file writing logic in `src/app/api/upload/route.ts` to upload to a cloud bucket like:
- **AWS S3**
- **Vercel Blob** (Easiest integration with Vercel)
- **Cloudinary**

Once `Vercel Blob` is set up, update the `upload/route.ts` to push the `ArrayBuffer` directly to the Blob URL and return it to the frontend.

## 4. Default Accounts & Security

An initial Admin user should be created in your production database so you can log in. You can run the following command against your production database using Prisma Studio (`npx prisma studio`) to create the first user, or insert it directly via SQL.

Username: `admin@eventgallery.com`
Password: `password123` (Change this in production and implement `bcrypt` hashing in `src/lib/auth.ts`).
