# Complete Deployment Guide — PollPulse Live Polling Tool

This guide explains step-by-step how to deploy **PollPulse** online to obtain your public live application URL required for your **GUVI Developer Internship** submission.

---

## 🌐 Target Production Architecture

```
User / Audience Web Browsers
             │
             ▼
     Vercel or Render
   (React SPA Frontend)
             │
             ▼ HTTPS / WSS
      Render or Railway
    (Go + Gin API Server)
        │            │
        ▼            ▼
  MongoDB Atlas  Upstash Redis
  (Persistent)   (Pub/Sub & Counts)
```

---

## Step 1: Cloud Databases Setup (100% Free Tiers)

### A. MongoDB Atlas (Persistent Store)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up / log in.
2. Click **Create a Database** -> Choose the **M0 Free Cluster**.
3. Under **Security Quickstart**:
   - Create a database user (e.g. `pollpulse_admin`) and secure password.
   - Under **Network Access**, click **Add IP Address** -> Select **Allow Access from Anywhere (`0.0.0.0/0`)**.
4. Click **Connect** -> **Drivers** (Go) -> Copy the connection string:
   ```
   mongodb+srv://pollpulse_admin:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   ```
5. Save this as your `MONGO_URI`.

### B. Upstash Redis (Real-Time Counts & Pub/Sub)
1. Go to [upstash.com](https://upstash.com) and create a free account.
2. Click **Create Database**:
   - Name: `pollpulse-redis`
   - Type: **Regional**
   - Eviction: No eviction
3. Once created, copy the **Redis Connection String** (format: `rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT:6379`).
4. Save this as your `REDIS_URL`.

---

## Step 2: Deploy Go Backend to Render or Railway

### Option A: Render (Recommended & Free)
1. Push your repository to **GitHub** (see Git steps below).
2. Go to [render.com](https://render.com) and sign in with GitHub.
3. Click **New +** -> **Web Service** -> Connect your `live-polling` repository.
4. Configure service settings:
   - **Name**: `pollpulse-api`
   - **Root Directory**: `backend`
   - **Environment**: `Go`
   - **Build Command**: `go build -o server ./cmd/server`
   - **Start Command**: `./server`
5. In the **Environment Variables** section, add:
   - `PORT` = `8080`
   - `MONGO_URI` = `your_mongodb_atlas_connection_string`
   - `DB_NAME` = `livepolling`
   - `REDIS_URL` = `your_upstash_redis_url`
   - `JWT_SECRET` = `a_strong_random_secret_string_32_chars`
   - `FRONTEND_URL` = `*` (or your frontend domain once created)
6. Click **Create Web Service**.
7. Once deployed, note your backend URL:
   `https://pollpulse-api.onrender.com`

---

## Step 3: Deploy React Frontend to Vercel or Render

### Option A: Vercel (Fastest & Free)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** -> **Project** -> Import your GitHub repository.
3. In Project Configuration:
   - **Root Directory**: Click edit and select `frontend`.
   - **Framework Preset**: Vite (detected automatically).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_BASE_URL` = `https://pollpulse-api.onrender.com/api`
   - `VITE_WS_BASE_URL` = `wss://pollpulse-api.onrender.com/api/polls`
5. Click **Deploy**.
6. Vercel will produce your public live frontend URL:
   `https://pollpulse.vercel.app`

---

## Step 4: Verify Your Live Deployed App

1. Open `https://pollpulse.vercel.app` in your browser.
2. Sign up or log in.
3. Create a test poll with 4 options.
4. Copy the public link (`https://pollpulse.vercel.app/poll/ABC123`).
5. Open an Incognito window or open the link on your mobile phone.
6. Cast a vote from your phone and observe the computer screen update **live in real-time** over the public internet without any page refresh!

---

## Step 5: Final Submission Checklist

Send an email to **`devhiring@hclguvi.com`** with:

- [ ] **1. Public GitHub Repository Link**:
  `https://github.com/YOUR_USERNAME/live-polling`
- [ ] **2. Live Application Link**:
  `https://YOUR_APP.vercel.app`
- [ ] **3. 3–5 Minute Video Link**:
  Unlisted YouTube link or public Google Drive link (following the script in [VIDEO_SCRIPT.md](file:///c:/Users/MANGAIYARKARASI%20S/OneDrive/Desktop/HCL%20project/VIDEO_SCRIPT.md)).
- [ ] **4. Confirmation of Tech Stack**:
  - React (Frontend)
  - Go + Gin (Backend)
  - MongoDB (Persistent DB)
  - Redis (Real-time counts & Pub/Sub)
