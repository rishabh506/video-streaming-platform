import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Hls from "hls.js";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";

interface PartyData {
  roomCode: string;
  hostId: string;
  video: {
    id: string;
    title: string;
    hlsMasterKey: string;
  };
}

interface ChatEntry {
  displayName: string;
  text: string;
  at: string;
  system?: boolean;
}

const S3_BASE_URL = "https://vsp-videos-rishi1234.s3.ap-south-1.amazonaws.com";

export default function WatchParty() {
  const { roomCode } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [party, setParty] = useState<PartyData | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [displayName, setDisplayName] = useState("Guest");

  const suppressEmit = useRef(false); // true while applying a remote event, to avoid echo loops

  // Load party + video info, determine host status
  useEffect(() => {
    if (!roomCode) return;
    api.get(`/watch-party/${roomCode}`).then((res) => setParty(res.data));

    api
      .get("/users/me")
      .then((res) => {
        setDisplayName(res.data.displayName);
      })
      .catch(() => {
        // not logged in — fine, they can still watch and chat as Guest
      });
  }, [roomCode]);

  useEffect(() => {
    if (party) {
      api
        .get("/users/me")
        .then((res) => setIsHost(res.data.id === party.hostId))
        .catch(() => setIsHost(false));
    }
  }, [party]);

  // Set up HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !party?.video?.hlsMasterKey) return;

    const src = `${S3_BASE_URL}/${party.video.hlsMasterKey}`;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else {
      video.src = src;
    }
  }, [party]);

  // Set up socket connection + listeners
  useEffect(() => {
    if (!roomCode) return;
    const socket = getSocket();
    socket.emit("join-room", roomCode);

    const video = videoRef.current;

    socket.on("play", ({ currentTime }: { currentTime: number }) => {
      if (!video) return;
      suppressEmit.current = true;
      video.currentTime = currentTime;
      video.play();
    });

    socket.on("pause", ({ currentTime }: { currentTime: number }) => {
      if (!video) return;
      suppressEmit.current = true;
      video.currentTime = currentTime;
      video.pause();
    });

    socket.on("seek", ({ currentTime }: { currentTime: number }) => {
      if (!video) return;
      suppressEmit.current = true;
      video.currentTime = currentTime;
    });

    socket.on("sync-tick", ({ currentTime }: { currentTime: number }) => {
      if (!video) return;
      const drift = Math.abs(video.currentTime - currentTime);
      if (drift > 1.5) {
        suppressEmit.current = true;
        video.currentTime = currentTime;
      }
    });

    socket.on("chat-message", (msg: ChatEntry) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("system-message", (text: string) => {
      setMessages((prev) => [...prev, { displayName: "", text, at: new Date().toISOString(), system: true }]);
    });

    return () => {
      socket.off("play");
      socket.off("pause");
      socket.off("seek");
      socket.off("sync-tick");
      socket.off("chat-message");
      socket.off("system-message");
    };
  }, [roomCode]);

  // Emit local playback events (skip if the change came from a remote event)
  function handleLocalPlay() {
    if (suppressEmit.current) {
      suppressEmit.current = false;
      return;
    }
    const socket = getSocket();
    socket.emit("play", { roomCode, currentTime: videoRef.current?.currentTime ?? 0 });
  }

  function handleLocalPause() {
    if (suppressEmit.current) {
      suppressEmit.current = false;
      return;
    }
    const socket = getSocket();
    socket.emit("pause", { roomCode, currentTime: videoRef.current?.currentTime ?? 0 });
  }

  function handleLocalSeeked() {
    if (suppressEmit.current) {
      suppressEmit.current = false;
      return;
    }
    const socket = getSocket();
    socket.emit("seek", { roomCode, currentTime: videoRef.current?.currentTime ?? 0 });
  }

  // Host periodically broadcasts currentTime for drift correction
  useEffect(() => {
    if (!isHost) return;
    const interval = setInterval(() => {
      const socket = getSocket();
      socket.emit("sync-tick", { roomCode, currentTime: videoRef.current?.currentTime ?? 0 });
    }, 10000);
    return () => clearInterval(interval);
  }, [isHost, roomCode]);

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const socket = getSocket();
    socket.emit("chat-message", { roomCode, displayName, text: chatInput });
    setChatInput("");
  }

  if (!party) return <p style={{ color: "var(--text-muted)" }}>Loading party…</p>;

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: "2 1 500px", minWidth: 320 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          WATCH PARTY · ROOM {roomCode} {isHost && "· YOU ARE HOST"}
        </div>
        <video
          ref={videoRef}
          controls
          onPlay={handleLocalPlay}
          onPause={handleLocalPause}
          onSeeked={handleLocalSeeked}
          style={{ width: "100%", borderRadius: 10, background: "#000", aspectRatio: "16/9" }}
        />
        <h2 className="display" style={{ fontSize: 28, marginTop: 14 }}>
          {party.video.title}
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Share this room code with friends: <strong style={{ color: "var(--amber)" }}>{roomCode}</strong>
        </p>
      </div>

      <div
        style={{
          flex: "1 1 280px",
          minWidth: 260,
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          height: 460,
        }}
      >
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>
          Party Chat
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.map((m, i) =>
            m.system ? (
              <div key={i} style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                {m.text}
              </div>
            ) : (
              <div key={i} style={{ fontSize: 13 }}>
                <span style={{ color: "var(--amber)", fontWeight: 600 }}>{m.displayName}: </span>
                <span>{m.text}</span>
              </div>
            )
          )}
        </div>
        <form onSubmit={sendChat} style={{ display: "flex", borderTop: "1px solid var(--border)" }}>
          <input
            className="field"
            style={{ border: "none", borderRadius: 0, flex: 1 }}
            placeholder="Say something…"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button type="submit" className="btn-text" style={{ padding: "0 16px" }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
