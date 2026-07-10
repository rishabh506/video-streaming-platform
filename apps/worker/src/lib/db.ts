import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function setVideoStatus(videoId: string, status: string) {
  await pool.query(`UPDATE "Video" SET status = $1 WHERE id = $2`, [status, videoId]);
}

export async function markVideoReady(
  videoId: string,
  hlsMasterKey: string,
  durationSec: number,
  thumbnailUrl: string
) {
  await pool.query(
    `UPDATE "Video" SET status = 'READY', "hlsMasterKey" = $1, "durationSec" = $2, "thumbnailUrl" = $3 WHERE id = $4`,
    [hlsMasterKey, durationSec, thumbnailUrl, videoId]
  );
}

export async function markVideoFailed(videoId: string) {
  await pool.query(`UPDATE "Video" SET status = 'FAILED' WHERE id = $1`, [videoId]);
}
