import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  owner: { displayName: string };
}

function formatDuration(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/videos")
      .then((res) => setVideos(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>NOW SHOWING</div>
      <h1 className="display" style={{ fontSize: 44, marginTop: 0, marginBottom: 24 }}>
        The Feed
      </h1>

      {loading && <p style={{ color: "var(--text-muted)" }}>Loading videos…</p>}

      {!loading && videos.length === 0 && (
        <div className="empty-state">
          <div className="display" style={{ fontSize: 30, marginBottom: 8 }}>
            NO REELS YET
          </div>
          <p>Upload your first video to light up the marquee.</p>
        </div>
      )}

      <div className="video-grid">
        {videos.map((v) => (
          <Link key={v.id} to={`/watch/${v.id}`} className="video-card">
            <div style={{ position: "relative" }}>
              <img
                src={v.thumbnailUrl ?? "https://placehold.co/320x180/141826/8a8fa3?text=Processing"}
                alt={v.title}
                className="video-card-thumb"
              />
              {v.durationSec != null && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    background: "rgba(11,14,26,0.85)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {formatDuration(v.durationSec)}
                </span>
              )}
            </div>
            <div className="video-card-body">
              <div className="video-card-title">{v.title}</div>
              <div className="video-card-owner">{v.owner.displayName}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}