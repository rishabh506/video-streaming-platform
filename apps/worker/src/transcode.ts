import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

// Returns video duration in whole seconds.
export function getDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return reject(err);
      resolve(Math.round(data.format.duration || 0));
    });
  });
}

// Extracts a single frame at 3 seconds in as a JPEG thumbnail.
export function generateThumbnail(inputPath: string, outputDir: string): Promise<string> {
  const outputPath = path.join(outputDir, "thumbnail.jpg");
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .screenshots({
        timestamps: ["3"],
        filename: "thumbnail.jpg",
        folder: outputDir,
        size: "640x360",
      });
  });
}

// Transcodes input video into a 3-rendition adaptive HLS bundle (360p / 720p / 1080p).
// Produces: outputDir/master.m3u8, outputDir/360p/*, outputDir/720p/*, outputDir/1080p/*
export function transcodeToHls(inputPath: string, outputDir: string): Promise<void> {
  const renditions = [
    { name: "360p", width: 640, height: 360, videoBitrate: "800k", audioBitrate: "96k" },
    { name: "720p", width: 1280, height: 720, videoBitrate: "2800k", audioBitrate: "128k" },
    { name: "1080p", width: 1920, height: 1080, videoBitrate: "5000k", audioBitrate: "128k" },
  ];

  for (const r of renditions) {
    fs.mkdirSync(path.join(outputDir, r.name), { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath);

    // Build one output stream per rendition, each its own HLS playlist.
    renditions.forEach((r) => {
      command
        .output(path.join(outputDir, r.name, "prog.m3u8"))
        .videoCodec("libx264")
        .audioCodec("aac")
        .size(`${r.width}x${r.height}`)
        .videoBitrate(r.videoBitrate)
        .audioBitrate(r.audioBitrate)
        .outputOptions([
          "-preset veryfast",
          "-hls_time 6",
          "-hls_playlist_type vod",
          `-hls_segment_filename ${path.join(outputDir, r.name, "segment_%03d.ts")}`,
        ]);
    });

    command
      .on("error", (err) => reject(err))
      .on("end", () => {
        writeMasterPlaylist(outputDir, renditions);
        resolve();
      })
      .run();
  });
}

// Writes the top-level master.m3u8 that references each rendition's playlist.
function writeMasterPlaylist(
  outputDir: string,
  renditions: { name: string; width: number; height: number; videoBitrate: string }[]
) {
  const bandwidthMap: Record<string, number> = { "360p": 800000, "720p": 2800000, "1080p": 5000000 };

  let content = "#EXTM3U\n#EXT-X-VERSION:3\n";
  for (const r of renditions) {
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidthMap[r.name]},RESOLUTION=${r.width}x${r.height}\n`;
    content += `${r.name}/prog.m3u8\n`;
  }

  fs.writeFileSync(path.join(outputDir, "master.m3u8"), content);
}
