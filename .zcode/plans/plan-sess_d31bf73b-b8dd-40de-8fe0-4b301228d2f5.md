# Rencana: Telegram Mini App untuk Bot Drama (Dramabox + ReelShort)

## Ikhtisar
Mengganti UI pencarian inline di chat dengan **Telegram Mini App** modern: web app yang dilayani dari proses bot yang sama (Express, VPS, HTTPS). Pencarian & browse drama di mini app; saat episode diklik, mini app kirim data ke bot via `Telegram.WebApp.sendData()` → bot langsung reply video di chat. UI chat lama (SearchHandler/VipHandler/PopularHandler/LatestHandler/DubbedHandler/DetailHandler inline) dihapus.

## 1. Setup server web (baru)
- Tambah `express` (+ serve static) ke `package.json`.
- `src/server.js`: Express app di `PORT` (default 3000, via `.env`):
  - `GET /` → serve mini app (`public/index.html`, `public/app.js`, `public/style.css`)
  - `GET /api/:source/search?keyword=&page=` → proxy ke API (source = `dramabox` | `reelshort`)
  - `GET /api/:source/detail?bookId=`
  - `GET /api/:source/episodes?bookId=&page=` (dramabox) / `GET /api/:source/episode?bookId=&episode=` (reelshort)
  - `GET /api/:source/browse?type=foryou|homepage|vip|popular|latest|dubbed&page=`
  - Semua request API internal diverifikasi `telegram.initData` (validasi hash HMAC pakai BOT_TOKEN) supaya hanya mini app yang bisa akses; API key bagah tetap di server.
- `src/bot.js` menjalankan bot (long polling, tetap) + server Express dalam satu proses.

## 2. Abstraction sumber drama
- `src/api/DramaBoxAPI.js` tetap, ditambah normalisasi output ke bentuk umum: `{ id, title, cover, description, totalEpisodes, chapters[] }`.
- `src/api/ReelShortAPI.js` (baru): base `https://api.bagahproject.com/api/reelshort`, header `x-api-key`. Endpoint: `search`, `detail`, `episode`, `foryou`, `homepage`. `isLocked` diabaikan (tetap ambil URL video). Field-nya dinormalisasi ke bentuk yang sama dengan dramabox — mapping field final dikonfirmasi dengan curl test saat implementasi.
- `src/api/index.js`: registry `{ dramabox, reelshort }` dipakai server & bot.

## 3. Mini App frontend (`public/`)
- Single-page vanilla JS + Telegram `WebApp.js`, dark theme, mengikuti Telegram theme params, layout mobile-first, modern: header dengan tab source (Dramabox / ReelShort), search bar sticky, grid poster kartu (cover, judul, badge), skeleton loading, pull-infinite scroll/pagination.
- Halaman detail: cover besar, judul, deskripsi, daftar episode (grid/list nomor, scroll atau paging), tombol play per episode (pilihan kualitas jika ada).
- Klik episode → `Telegram.WebApp.sendData(JSON.stringify({source, bookId, episode, quality}))` → mini app bisa ditutup otomatis (`close()`).

## 4. Sisi bot (web_app_data)
- Hapus handler lama (Search/Vip/Popular/Latest/Dubbed/Detail) dan keyboard terkait; MenuHandler baru: `/start` reply dengan tombol **WebApp** (`Keyboard.WebApp`) + set **Menu Button** bot ke URL mini app (`bot.api.setChatMenuButton`).
- Handler `message::web_app_data`: parse `{source, bookId, episode, quality}`, ambil link video via API yang sesuai, `replyWithVideo(InputFile({url}))` + caption judul & episode (pola sama dengan `DetailHandler.#sendVideo` lama, termasuk fallback kualitas). Kirim "memproses..." dulu karena unduhan video butuh waktu.

## 5. Config
- `.env` baru: `PORT`, `PUBLIC_URL` (domain HTTPS mini app, untuk menu button), `REELSHORT_API_KEY`, `REELSHORT_API_BASE`. Update `.env.example` & README (cara setup HTTPS via reverse proxy nginx/caddy di VPS, set menu button via BotFather jika perlu).

## 6. Testing
- Jalankan server lokal, buka mini app via Telegram (atau browser dengan initData dev bypass `DEV=1`), verifikasi: search kedua source, detail, klik episode → bot kirim video, validasi initData.

## Catatan
- Long polling bot tidak berubah, tidak perlu webhook public untuk bot — hanya web server yang perlu HTTPS.
- `bookCache` lama tidak diperlukan lagi di mini app flow (server fetch langsung per request).