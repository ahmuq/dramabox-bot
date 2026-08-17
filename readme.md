# 🎬 DramaHub Telegram Bot + Mini App

Telegram bot pencarian drama **DramaBox** & **ReelShort** dengan **Mini App** modern — pencarian dan browse drama dilakukan lewat web app di dalam Telegram, dan saat episode dipilih, bot langsung mengirim videonya ke chat.

Dibangun menggunakan [grammY](https://grammy.dev/) + [Express](https://expressjs.com/), JavaScript ES Modules.

## Fitur

- 📱 **Mini App modern** — dark theme, grid poster, skeleton loading, infinite scroll
- 🔀 **Dua sumber drama** — tab DramaBox & ReelShort
- 🔍 **Pencarian realtime** dengan debounce
- 🔥 **Trending / For You** feed
- ▶️ **Kirim video ke chat** — klik episode di mini app → bot reply video langsung
- 🎞️ **Dukungan HLS** — video ReelShort (.m3u8) otomatis diunduh & diremux ke MP4 via ffmpeg
- 🔐 **API key tetap di server** — mini app tidak pernah mengakses Bagah API langsung, request diverifikasi dengan `initData` Telegram

## Struktur Proyek

```
dramabox-bot/
├── public/                    # Frontend Mini App
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── bot.js                 # Entry point (bot + web server)
│   ├── config.js              # Konfigurasi environment
│   ├── server.js              # Express: static files + API proxy + validasi initData
│   ├── downloader.js          # Unduh HLS (.m3u8) → remux MP4 via ffmpeg
│   ├── api/
│   │   ├── DramaBoxAPI.js     # Wrapper API DramaBox
│   │   ├── ReelShortAPI.js    # Wrapper API ReelShort
│   │   └── sources.js         # Registry & normalisasi kedua sumber
│   └── handlers/
│       ├── MenuHandler.js     # /start, /menu, menu button
│       └── VideoHandler.js    # web_app_data → kirim video
├── setup_vps.sh               # Setup ffmpeg + local Bot API server
└── .env.example
```

## Prasyarat

- **Node.js** v18+ (disarankan v20+)
- **ffmpeg** — wajib untuk video ReelShort (HLS → MP4)
- **Bagah API key** — [api.bagahproject.com](https://api.bagahproject.com/)
- **Bot Token** dari [@BotFather](https://t.me/BotFather)
- **Domain + HTTPS** untuk hosting Mini App (wajib untuk tombol WebApp)

## Instalasi

1. **Clone & install**

   ```bash
   git clone https://github.com/ahmuq/dramabox-bot
   cd dramabox-bot
   npm install
   ```

2. **Konfigurasi environment**

   ```bash
   cp .env.example .env
   ```

   ```env
   BOT_TOKEN=123456:ABC-DEF...
   TELEGRAM_API_URL=http://localhost:8081
   DRAMABOX_API_KEY=your_key
   REELSHORT_API_KEY=your_key
   PORT=3000
   PUBLIC_URL=https://drama.yourdomain.com
   DEV=0
   ```

3. **Jalankan**

   ```bash
   npm start        # production
   npm run dev      # development (auto-reload)
   ```

## Deploy Mini App (VPS)

Langkah lengkap (contoh pakai domain `drama.yourdomain.com` di VPS Ubuntu):

1. **Prasyarat di VPS** — Node.js 20+, ffmpeg, nginx, dan (opsional tapi disarankan) local Bot API server dari `setup_vps.sh`:

   ```bash
   apt update && apt install -y ffmpeg nginx certbot python3-certbot-nginx
   ./setup_vps.sh   # ffmpeg + docker local Bot API server di port 8081
   ```

   > ffmpeg dari apt Ubuntu **sudah termasuk libass**, jadi fitur hardsub langsung jalan.

2. **Ambil kode & install**:

   ```bash
   git clone https://github.com/ahmuq/dramabox-bot && cd dramabox-bot
   npm install
   cp .env.example .env && nano .env
   ```

   Isi penting di `.env` untuk production:

   ```env
   BOT_TOKEN=...
   TELEGRAM_API_URL=http://localhost:8081     # local Bot API server (upload >50MB)
   DRAMABOX_API_KEY=...
   REELSHORT_API_KEY=...
   PORT=3000
   PUBLIC_URL=https://drama.yourdomain.com    # wajib HTTPS
   DEV=0                                      # validasi initData AKTIF
   ```

3. **HTTPS + reverse proxy** — salin `deploy/nginx.conf.example` ke `/etc/nginx/sites-available/dramabox-bot`, sesuaikan domainnya, lalu:

   ```bash
   sudo ln -s /etc/nginx/sites-available/dramabox-bot /etc/nginx/sites-enabled/
   sudo certbot --nginx -d drama.yourdomain.com
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. **Jalankan sebagai service** — salin `deploy/dramabox-bot.service` ke `/etc/systemd/system/`, sesuaikan `WorkingDirectory`/`User`, lalu:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now dramabox-bot
   journalctl -u dramabox-bot -f    # pantau log
   ```

5. **Cek** — buka `https://drama.yourdomain.com` (harus tampil mini app), lalu `/start` di bot; menu button dan tombol WebApp otomatis diarahkan ke `PUBLIC_URL`.

> Tanpa domain? Mini app tetap bisa diuji lewat tunnel (mis. `cloudflared tunnel --url http://localhost:3000`) dan isi `PUBLIC_URL` dengan URL tunnel — tapi tunnel cepat/quick-load (`trycloudflare.com`) tidak stabil untuk jangka panjang.


## Local Telegram Bot API Server

Upload video >50 MB butuh local Bot API server. `setup_vps.sh` menginstall **ffmpeg** dan menjalankan `aiogram/telegram-bot-api` (Docker) di port **8081**:

```bash
chmod +x setup_vps.sh
./setup_vps.sh
```

> Jika tidak memakainya, set `TELEGRAM_API_URL=https://api.telegram.org` (limit 50 MB).

## Cara Kerja

1. User buka Mini App (menu button / tombol `/start`).
2. Mini app memanggil `/api/:source/*` di server yang sama — server memvalidasi `initData` (HMAC bot token), lalu mem-proxy ke Bagah API (API key tidak terekspos).
3. User memilih episode + kualitas → `Telegram.WebApp.sendData()`.
4. Bot menerima `web_app_data`:
   - **DramaBox**: URL MP4 langsung diupload ke Telegram.
   - **ReelShort**: playlist HLS diunduh per segmen, diremux ke MP4 (ffmpeg, tanpa re-encode), dikirim, lalu file temp dihapus.

## Perintah Bot

| Perintah | Deskripsi                       |
| -------- | ------------------------------- |
| `/start` | Pesan selamat datang + tombol Mini App |
| `/menu`  | Sama dengan `/start`            |

## Tech Stack

- **[grammY](https://grammy.dev/)** — framework bot
- **[Express](https://expressjs.com/)** — web server Mini App
- **[Axios](https://axios-http.com/)** — HTTP client
- **Telegram WebApp API** — frontend mini app
- **ffmpeg** — remux HLS → MP4
