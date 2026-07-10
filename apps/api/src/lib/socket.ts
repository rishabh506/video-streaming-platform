import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

interface PlaybackEvent {
  roomCode: string;
  currentTime: number;
}

interface ChatMessage {
  roomCode: string;
  displayName: string;
  text: string;
}

export function initSocket(httpServer: HttpServer) {
  const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  const io = new SocketIOServer(httpServer, {
    cors: { origin: allowedOrigins },
  });

  io.on("connection", (socket: Socket) => {
    let joinedRoom: string | null = null;

    socket.on("join-room", (roomCode: string) => {
      socket.join(roomCode);
      joinedRoom = roomCode;
      socket.to(roomCode).emit("system-message", "A viewer joined the party.");
    });

    // Host or any viewer triggers play — broadcast to everyone else in the room
    socket.on("play", ({ roomCode, currentTime }: PlaybackEvent) => {
      socket.to(roomCode).emit("play", { currentTime });
    });

    socket.on("pause", ({ roomCode, currentTime }: PlaybackEvent) => {
      socket.to(roomCode).emit("pause", { currentTime });
    });

    socket.on("seek", ({ roomCode, currentTime }: PlaybackEvent) => {
      socket.to(roomCode).emit("seek", { currentTime });
    });

    // Periodic drift correction — host broadcasts its currentTime every ~10s
    socket.on("sync-tick", ({ roomCode, currentTime }: PlaybackEvent) => {
      socket.to(roomCode).emit("sync-tick", { currentTime });
    });

    socket.on("chat-message", ({ roomCode, displayName, text }: ChatMessage) => {
      io.to(roomCode).emit("chat-message", {
        displayName,
        text,
        at: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      if (joinedRoom) {
        socket.to(joinedRoom).emit("system-message", "A viewer left the party.");
      }
    });
  });

  return io;
}