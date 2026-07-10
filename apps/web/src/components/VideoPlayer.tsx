import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  src: string;
  poster?: string;
}

export default function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [currentQuality, setCurrentQuality] = useState<string>("Auto");
  const [levels, setLevels] = useState<{ index: number; height: number }[]>([]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const parsedLevels = data.levels.map((lvl, index) => ({
          index,
          height: lvl.height,
        }));
        setLevels(parsedLevels);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const level = hls.levels[data.level];
        setCurrentQuality(level ? `${level.height}p` : "Auto");
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    }
  }, [src]);

  function handleQualityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = value === "auto" ? -1 : parseInt(value, 10);
  }

  return (
    <div>
      <video ref={videoRef} controls poster={poster} />
      <div className="player-meta">
        <span>Quality: {currentQuality}</span>
        {levels.length > 0 && (
          <select className="quality-select" onChange={handleQualityChange} defaultValue="auto">
            <option value="auto">Auto</option>
            {levels.map((lvl) => (
              <option key={lvl.index} value={lvl.index}>
                {lvl.height}p
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}