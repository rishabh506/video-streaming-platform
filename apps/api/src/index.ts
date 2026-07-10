import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import videoRoutes from "./routes/videos";
import watchPartyRoutes from "./routes/watchParty";
import billingRoutes from "./routes/billing";
import webhookRoutes from "./routes/webhooks";
import { initSocket } from "./lib/socket";

const app = express();

app.use(cors());

// Stripe webhooks need the RAW request body to verify signatures,
// so this must be registered before express.json() below.
app.use("/webhooks", webhookRoutes);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/videos", videoRoutes);
app.use("/watch-party", watchPartyRoutes);
app.use("/billing", billingRoutes);

const httpServer = http.createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`API + WebSocket server running on http://localhost:${PORT}`);
});
