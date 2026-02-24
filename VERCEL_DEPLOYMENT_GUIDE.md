# Deployment Guide: Vercel & Database Migration

Your project has been successfully pushed to your GitHub repository:
**[https://github.com/hammamsawalma/theEventGallerySystem](https://github.com/hammamsawalma/theEventGallerySystem)**

Because Vercel uses a "Serverless" architecture, its file system is read-only in production. This means you **cannot use a local SQLite `dev.db` file directly on Vercel** (any inventory/sales changes you make would be immediately deleted when the server goes to sleep).

To host on Vercel and **import your database exactly as it is without losing a single item**, you have two main options. **Option 1 (Turso)** is vastly easier if you want everything to stay SQLite and directly upload your `dev.db` file.

---

## Option 1: Use Turso (Easiest - Keeps SQLite "As It Is")
[Turso](https://turso.tech/) is a free cloud database designed specifically for SQLite. You can upload your local `dev.db` file directly to them and point Vercel to it.

### Step 1: Upload your Database
1. Go to [Turso.tech](https://turso.tech/) and create a free account.
2. Install their CLI tool on your computer (Mac):
   ```bash
   brew install tursodatabase/tap/turso
   turso auth login
   ```
3. Create a new database by **directly uploading your existing `dev.db` file**:
   ```bash
   turso db create event-gallery-db --from-file ./dev.db
   ```
4. Get your database connection URL:
   ```bash
   turso db show event-gallery-db --url
   ```
5. Get your authorization token:
   ```bash
   turso db tokens create event-gallery-db
   ```

### Step 2: Update Your Code
Because you are using Prisma, you just install the Turso serverless driver:
```bash
npm install @libsql/client @prisma/adapter-libsql
```
Update your `.env` file with the values from Turso:
```env
TURSO_DATABASE_URL="libsql://your-url-from-turso.turso.io"
TURSO_AUTH_TOKEN="your-secret-token"
```

*Note: For Prisma to use Turso, you will follow their 2-line setup guide in `src/lib/prisma.ts` to attach the adapter.*

### Step 3: Deploy to Vercel
1. Go to [Vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your `theEventGallerySystem` GitHub repository.
3. In the "Environment Variables" section before clicking Deploy, add:
   - `TURSO_DATABASE_URL` 
   - `TURSO_AUTH_TOKEN`
4. Click **Deploy**. Your site will be live, perfectly connected to your existing data!

---

## Option 2: Use Vercel Postgres
If you strictly prefer everything inside Vercel's physical ecosystem, you must migrate from SQLite to Vercel Postgres.

1. **Deploy your site**: Go to Vercel, import your GitHub repo, and deploy it (the first deploy will connect but won't have your data yet).
2. **Add Postgres**: In your Vercel Project Dashboard, click the **"Storage"** tab. Create a new "Vercel Postgres" database and attach it to your project.
3. This step automatically adds `POSTGRES_URL` to your Vercel Environment Variables.
4. **Update Prisma**: In your local code, open `prisma/schema.prisma` and change `provider = "sqlite"` to `provider = "postgresql"`.
5. **Migrate the Data**: Because jumping from SQLite to Postgres is a complex structural change, the easiest way to insert your old data is using a migration tool like [pgloader](https://pgloader.io/):
   ```bash
   brew install pgloader
   pgloader ./dev.db "your-vercel-postgres-url-string"
   ```
   *Alternatively, you can write a short Node.js script using your old SQLite tables to INSERT into the new Postgres tables.*

---

## Summary Recommendation
**I highly recommend Option 1 (Turso)**. It perfectly satisfies your request of dropping the database entirely "as it is" into the cloud with zero structural translation errors, and works flawlessly with Vercel's serverless edge.
