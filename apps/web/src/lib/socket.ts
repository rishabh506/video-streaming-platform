import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL);
  }
  return socket;
}