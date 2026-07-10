import { Router } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

function generateRoomCode() {
  // Short, shareable code like "X7K2Q9"
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// POST /watch-party  { videoId }
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: "videoId is required" });
  }

  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) {
    return res.status(404).json({ error: "Video not found" });
  }

  const party = await prisma.watchParty.create({
    data: {
      id: randomUUID(),
      videoId,
      hostId: req.user!.userId,
      roomCode: generateRoomCode(),
    },
  });

  res.status(201).json(party);
});

// GET /watch-party/:roomCode
router.get("/:roomCode", async (req, res) => {
  const party = await prisma.watchParty.findUnique({
    where: { roomCode: req.params.roomCode },
  });

  if (!party) {
    return res.status(404).json({ error: "Watch party not found" });
  }

  const video = await prisma.video.findUnique({ where: { id: party.videoId } });

  res.json({ ...party, video });
});

export default router;