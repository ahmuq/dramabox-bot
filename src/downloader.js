import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { tmpdir } from "node:os";
import path from "node:path";

// ffmpeg utama; build alternatif dengan libass dipakai untuk hardsub
function ffmpegBin() {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH))
    return process.env.FFMPEG_PATH;
  const withLibass = path.join(homedir(), ".local/bin/ffmpeg-libass");
  return existsSync(withLibass) ? withLibass : "ffmpeg";
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal mengambil playlist: ${res.status}`);
  return res.text();
}

function resolveUrl(baseUrl, seg) {
  return new URL(seg, baseUrl).href;
}

/**
 * Unduh MP4 + file subtitle .srt lalu bakar subtitle ke video (hardsub)
 * dengan ffmpeg. Mengembalikan path file hasil — pemanggil bertanggung
 * jawab menghapus.
 */
export async function burnSubtitleToMp4(mp4Url, srtUrl) {
  const dir = await mkdtemp(path.join(tmpdir(), "subsync-"));
  const inMp4 = path.join(dir, "in.mp4");
  const srt = path.join(dir, "sub.srt");
  const outMp4 = path.join(dir, "out.mp4");

  try {
    const [videoRes, srtRes] = await Promise.all([
      fetch(mp4Url),
      fetch(srtUrl),
    ]);
    if (!videoRes.ok || !srtRes.ok) throw new Error("Gagal mengunduh video/subtitle");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(inMp4, Buffer.from(await videoRes.arrayBuffer()));
    await writeFile(srt, Buffer.from(await srtRes.arrayBuffer()));

    // jalankan ffmpeg dari dalam dir agar path filter subtitle sederhana
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(
        ffmpegBin(),
        [
          "-y",
          "-loglevel", "error",
          "-i", "in.mp4",
          "-vf", "subtitles=sub.srt",
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-crf", "23",
          "-c:a", "copy",
          "-movflags", "+faststart",
          "out.mp4",
        ],
        { cwd: dir },
      );
      ffmpeg.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)),
      );
      ffmpeg.on("error", reject);
    });

    await Promise.all([rm(inMp4, { force: true }), rm(srt, { force: true })]);
    return outMp4;
  } catch (err) {
    await rm(dir, { recursive: true, force: true });
    throw err;
  }
}

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
