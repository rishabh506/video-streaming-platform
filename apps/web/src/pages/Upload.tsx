import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";

export default function Upload() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return;

    setStatus("uploading");
    setErrorMsg("");

    try {
      const { data } = await api.post("/videos/upload-url", {
        title,
        contentType: file.type,
      });

      await axios.put(data.uploadUrl, file, {
        headers: { "Content-Type": file.type },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });

      setStatus("processing");
      await api.post(`/videos/${data.videoId}/complete`);

      setStatus("done");
      setTimeout(() => navigate(`/watch/${data.videoId}`), 1500);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.response?.data?.error ?? "Upload failed");
    }
  }

  return (
    <div className="upload-card">
      <div className="eyebrow">NEW RELEASE</div>
      <h2 className="display" style={{ fontSize: 30, margin: "4px 0 20px" }}>
        Upload a video
      </h2>
      <form onSubmit={handleUpload} className="field-group">
        <input
          className="field"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="field"
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={status === "uploading" || status === "processing"}
        >
          {status === "idle" && "Upload"}
          {status === "uploading" && `Uploading… ${progress}%`}
          {status === "processing" && "Queuing for processing…"}
          {status === "done" && "Done! Redirecting…"}
          {status === "error" && "Retry"}
        </button>
        {status === "uploading" && (
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
        {status === "processing" && (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Your video is uploaded and now transcoding in the background. This can take a minute or two.
          </p>
        )}
        {errorMsg && <div className="error-text">{errorMsg}</div>}
      </form>
    </div>
  );
}