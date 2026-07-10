import { Router } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { getUploadUrl } from "../lib/s3";
import { transcodeQueue } from "../lib/queue";
import { requireAuth, optionalAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

// POST /videos/upload-url
// Body: { title: string, contentType: string, isPremium?: boolean }
// Returns a presigned S3 PUT URL + creates a Video row in UPLOADING state.
router.post("/upload-url", requireAuth, async (req: AuthedRequest, res) => {
  const { title, contentType, isPremium } = req.body;

  if (!title || !contentType) {
    return res.status(400).json({ error: "title and contentType are required" });
  }

  if (!contentType.startsWith("video/")) {
    return res.status(400).json({ error: "contentType must be a video mime type" });
  }

  const videoId = randomUUID();
  const extension = contentType.split("/")[1] || "mp4";
  const rawKey = `raw/${videoId}.${extension}`;

  const uploadUrl = await getUploadUrl(rawKey, contentType);

  const video = await prisma.video.create({
    data: {
      id: videoId,
      ownerId: req.user!.userId,
      title,
      rawKey,
      isPremium: Boolean(isPremium),
      status: "UPLOADING",
    },
  });

  res.status(201).json({
    videoId: video.id,
    uploadUrl, // client PUTs the raw file directly to this URL
  });
});

// POST /videos/:id/complete
// Called by the client once the direct-to-S3 upload finishes.
// Marks the video QUEUED. (Transcode job enqueueing gets wired in Phase 3.)
router.post("/:id/complete", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) {
    return res.status(404).json({ error: "Video not found" });
  }
  if (video.ownerId !== req.user!.userId) {
    return res.status(403).json({ error: "You do not own this video" });
  }

  const updated = await prisma.video.update({
    where: { id },
    data: { status: "QUEUED" },
  });

  await transcodeQueue.add("transcode", {
    videoId: updated.id,
    rawKey: updated.rawKey,
  });

  res.json({ video: updated });
});

// GET /videos
// List public, ready videos (basic feed).
router.get("/", async (_req, res) => {
  const videos = await prisma.video.findMany({
    where: { status: "READY", visibility: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      durationSec: true,
      isPremium: true,
      createdAt: true,
      owner: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  res.json(videos);
});

// GET /videos/:id
router.get("/:id", optionalAuth, async (req: AuthedRequest, res) => {
  const video = await prisma.video.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, displayName: true, avatarUrl: true } },
      chapters: { orderBy: { startSec: "asc" } },
    },
  });

  if (!video) {
    return res.status(404).json({ error: "Video not found" });
  }

  // Premium videos: only expose the playable HLS URL to the owner or an active subscriber.
  if (video.isPremium && video.ownerId !== req.user?.userId) {
    let hasAccess = false;
    if (req.user) {
      const sub = await prisma.subscription.findFirst({
        where: { subscriberId: req.user.userId, status: { in: ["active", "trialing"] } },
      });
      hasAccess = Boolean(sub);
    }
    if (!hasAccess) {
      return res.json({ ...video, hlsMasterKey: null, locked: true });
    }
  }

  res.json(video);
});

export default router;
