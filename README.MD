# 🎬 Reelcast — Full-Stack Video Streaming Platform

A YouTube-style video platform with adaptive bitrate streaming, real-time synchronized watch parties, and Stripe-powered subscriptions — built end-to-end from video upload through transcoding, delivery, and monetization.

**🔴 Live demo:** https://video-streaming-platform-theta-gilt.vercel.app/
**⚙️ API:** https://video-streaming-platform-production-1a99.up.railway.app/health

---

## What it does

Creators upload a video → a background worker transcodes it with **FFmpeg** into a 3-tier adaptive HLS bitrate ladder (360p / 720p / 1080p) → viewers stream it with a player that automatically switches quality based on network conditions → friends can start a **watch party** and stay in perfectly synced playback with a live chat sidebar → premium content is gated behind **Stripe subscriptions** with self-service billing management.

## Features

- 🎞️ **Video upload & background transcoding** — presigned S3 uploads, queue-based FFmpeg processing (BullMQ + Redis), so uploads never block the API
- 📶 **Adaptive bitrate streaming** — HLS.js-powered player that auto-switches between 360p/720p/1080p based on real-time bandwidth, with manual override
- 🎉 **Watch parties** — Socket.io-synchronized play/pause/seek across viewers with drift correction, plus a live chat sidebar
- 💳 **Subscriptions & billing** — Stripe Checkout for monthly/annual plans, webhook-driven entitlement sync, self-service billing portal, premium content gating
- 🖼️ **Auto-generated thumbnails & duration extraction** via FFprobe
- 🔐 **JWT authentication** with protected routes and role-aware access control
- 📱 **Responsive UI** with a custom design system (dark cinema-marquee theme)

## Architecture

```
                         ┌─────────────────┐
                         │   React Client   │
                         │ (HLS.js player)  │
                         └───────┬──────────┘
                                 │ HTTPS / WSS
                 ┌───────────────┼────────────────┐
                 ▼                                ▼
        ┌────────────────┐               ┌────────────────┐
        │  Express API    │               │ Socket.io Server│
        │ (auth, videos,  │◄─────────────►│ (watch parties, │
        │  billing, etc.) │   shared state │  chat)          │
        └───────┬─────────┘               └────────────────┘
                 │
     ┌───────────┼────────────┬─────────────────┐
     ▼           ▼             ▼                 ▼
┌─────────┐ ┌──────────┐ ┌───────────┐   ┌──────────────┐
│ Postgres │ │  Redis   │ │  Stripe   │   │  AWS S3       │
│  (Prisma)│ │ (BullMQ) │ │  Webhooks │   │  (object      │
└─────────┘ └────┬─────┘ └───────────┘   │   storage)     │
                  │                       └──────┬────────┘
                  ▼                              │
         ┌─────────────────┐                     │
         │ Transcode Worker │─────────────────────┘
         │ (FFmpeg → HLS)   │   uploads .m3u8 + .ts segments
         └─────────────────┘
```

**Upload flow:** client requests a presigned S3 URL → uploads the raw video directly to storage (bypassing the API server for large files) → API enqueues a BullMQ job → a separate worker process downloads the raw file, runs FFmpeg to produce a 3-rendition HLS bundle plus a thumbnail, uploads the results back to S3, and marks the video `READY` → the player streams the resulting `master.m3u8`.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + TypeScript, HLS.js, React Router, Socket.io-client |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| Transcoding | FFmpeg / FFprobe (via `fluent-ffmpeg`) |
| Real-time | Socket.io |
| Storage | AWS S3 |
| Payments | Stripe (Checkout, Subscriptions, Billing Portal, Webhooks) |
| Auth | JWT + bcrypt |
| Deployment | Railway (API + worker + Postgres + Redis), Vercel (frontend) |

## Project structure

```
video-streaming-platform/
├── apps/
│   ├── web/       # React frontend (Vite)
│   ├── api/       # Express API + Socket.io server
│   └── worker/    # Background FFmpeg transcoding worker
├── docker-compose.yml   # Local Postgres + Redis
└── README.md
```

## Running locally

**Prerequisites:** Node.js LTS, Docker Desktop, FFmpeg, an AWS S3 bucket, a Stripe account (test mode).

```bash
# 1. Start Postgres + Redis
docker compose up -d

# 2. Set up the API
cd apps/api
npm install
npx prisma migrate dev
npm run dev

# 3. Set up the worker (new terminal)
cd apps/worker
npm install
npm run dev

# 4. Set up the frontend (new terminal)
cd apps/web
npm install
npm run dev

# 5. Forward Stripe webhooks (new terminal)
stripe listen --forward-to localhost:4000/webhooks/stripe
```

Each app needs its own `.env` — see `.env.example` in `apps/api` and `apps/worker` for required variables (database, Redis, AWS, Stripe, JWT secret).

## Engineering notes / decisions

- **Direct-to-S3 uploads via presigned URLs** instead of routing file bytes through the API — keeps the API server stateless and avoids memory/bandwidth bottlenecks on large video files.
- **Transcoding runs in a separate worker process**, decoupled from the API via a Redis-backed queue — CPU-intensive FFmpeg jobs never block HTTP request handling, and the worker can be scaled independently.
- **CDN:** the architecture is designed for CloudFront in front of S3 (see code comments); this demo serves HLS directly from S3 due to a temporary AWS new-account verification restriction on CloudFront. Swapping in a CDN is a one-line base-URL change.
- **Watch party sync** uses an authoritative periodic "sync-tick" from the host to correct drift, rather than trusting every client's local clock — a simpler and more robust approach than lockstep event-by-event synchronization.

## Roadmap / not yet implemented

- Closed captions via Whisper ASR
- Creator analytics dashboard (watch time, retention)
- Pay-per-view one-time purchases
- Live streaming (RTMP ingest)
- Collaborative-filtering recommendations

## Author

Built by Rishabh Agarwal as a full-stack systems project covering media engineering, real-time systems, and payments infrastructure.