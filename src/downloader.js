import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal mengambil playlist: ${res.status}`);
  return res.text();
}

function resolveUrl(baseUrl, seg) {
  return new URL(seg, baseUrl).href;
}

/**
 * Unduh video HLS (.m3u8) dan remux jadi mp4 dengan ffmpeg (copy codec).
 * Mengembalikan path file mp4 sementara — pemanggil bertanggung jawab menghapus.
 */
export async function downloadHlsToMp4(m3u8Url, concurrency = 6) {
  const dir = await mkdtemp(path.join(tmpdir(), "reelshort-"));
  const outPath = path.join(dir, "video.mp4");

  try {
    let playlist = await fetchText(m3u8Url);
    let lines = playlist.split("\n").map((l) => l.trim());

    // Jika playlist master, pilih variant pertama (kualitas tertinggi urutan awal)
    const streamLines = lines.filter((l) => l && !l.startsWith("#"));
    const isMaster = lines.some((l) => l.startsWith("#EXT-X-STREAM-INF"));
    if (isMaster) {
      m3u8Url = resolveUrl(m3u8Url, streamLines[0]);
      playlist = await fetchText(m3u8Url);
      lines = playlist.split("\n").map((l) => l.trim());
    }

    const segments = lines.filter((l) => l && !l.startsWith("#"));
    if (!segments.length) throw new Error("Playlist tanpa segmen");

    const tsPath = path.join(dir, "all.ts");
    const writeStream = createWriteStream(tsPath);
    // tulis berurutan walau unduh paralel
    const results = new Array(segments.length);

    let cursor = 0;
    async function worker() {
      while (cursor < segments.length) {
        const i = cursor++;
        const buf = Buffer.from(
          await (await fetch(resolveUrl(m3u8Url, segments[i]))).arrayBuffer(),
        );
        results[i] = buf;
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, segments.length) }, worker),
    );

    for (const buf of results) writeStream.write(buf);
    await new Promise((resolve) => writeStream.end(resolve));

    // Remux TS -> MP4 (tanpa re-encode)
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-loglevel", "error",
        "-i", tsPath,
        "-c", "copy",
        "-bsf:a", "aac_adtstoasc",
        "-movflags", "+faststart",
        outPath,
      ]);
      ffmpeg.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)),
      );
      ffmpeg.on("error", reject);
    });

    await rm(tsPath, { force: true });
    return outPath;
  } catch (err) {
    await rm(dir, { recursive: true, force: true });
    throw err;
  }
}
