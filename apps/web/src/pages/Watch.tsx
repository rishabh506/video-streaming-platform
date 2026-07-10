import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import VideoPlayer from "../components/VideoPlayer";

interface VideoDetail {
  id: string;
  title: string;
  description: string | null;
  hlsMasterKey: string | null;
  thumbnailUrl: string | null;
  status: string;
  owner: { displayName: string };
}

const S3_BASE_URL = "https://vsp-videos-rishi1234.s3.ap-south-1.amazonaws.com";

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [creatingParty, setCreatingParty] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/videos/${id}`).then((res) => setVideo(res.data));
  }, [id]);

  async function startWatchParty() {
    if (!id) return;
    setCreatingParty(true);
    try {
      const { data } = await api.post("/watch-party", { videoId: id });
      navigate(`/party/${data.roomCode}`);
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Could not start watch party. Are you logged in?");
    } finally {
      setCreatingParty(false);
    }
  }

  if (!video) {
    return <p style={{ color: "var(--text-muted)" }}>Loading…</p>;
  }

  if (video.status !== "READY" || !video.hlsMasterKey) {
    return (
      <div className="empty-state">
        <div className="display" style={{ fontSize: 30, marginBottom: 8 }}>
          STILL DEVELOPING
        </div>
        <p>This reel is processing ({video.status}). Check back soon.</p>
      </div>
    );
  }

  const hlsUrl = `${S3_BASE_URL}/${video.hlsMasterKey}`;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="player-wrap">
        <VideoPlayer src={hlsUrl} poster={video.thumbnailUrl ?? undefined} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 20 }}>
        <div>
          <h1 className="display" style={{ fontSize: 32, marginTop: 0, marginBottom: 4 }}>
            {video.title}
          </h1>
          <div className="video-card-owner" style={{ marginBottom: 10 }}>
            {video.owner.displayName}
          </div>
        </div>
        <button className="btn btn-primary" onClick={startWatchParty} disabled={creatingParty}>
          {creatingParty ? "Starting…" : "🎬 Start Watch Party"}
        </button>
      </div>
      {video.description && <p style={{ color: "var(--text)" }}>{video.description}</p>}
    </div>
  );
}
