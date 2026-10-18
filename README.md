# Telegram Video Mini App

Katalog video untuk channel Telegram milik Anda. Aplikasi ini mencatat **postingan video baru** yang diterima bot dan menampilkan tombol ke postingan asli Telegram. Penonton dapat menonton atau mengunduh melalui aplikasi Telegram sesuai akses dan fitur yang tersedia pada postingan.

## Batasan penting

- Telegram Bot API tidak menyediakan endpoint untuk membaca seluruh riwayat channel. Karena itu aplikasi ini **tidak otomatis mengimpor video lama**. Tambahkan bot dan aktifkan webhook terlebih dahulu; video yang diposting setelahnya akan masuk katalog.
- Untuk channel privat, penonton harus menjadi anggota channel.
- Tombol Nonton dan Download membuka postingan sumber Telegram. Ini menghindari proxy file besar dan batas `getFile` Bot API (20 MB). Tombol Download bukan unduhan langsung dari situs Mini App; unduhan dilakukan dari postingan Telegram.
- Simpan `data.json` pada disk persisten/VPS. Hosting dengan filesystem sementara dapat menghapus katalog saat redeploy.
- Gunakan hanya video yang Anda miliki atau berhak Anda bagikan.

## 1. Buat bot

1. Buka Telegram dan cari `@BotFather`.
2. Kirim `/newbot`, ikuti petunjuk, lalu salin token bot.
3. Catat username bot tanpa tanda `@`.

## 2. Siapkan channel

1. Buka channel milik Anda.
2. Tambahkan bot sebagai **administrator** agar bot menerima update postingan channel.
3. Untuk channel publik, catat username channel dan isi `CHANNEL_ID` sebagai `@UsernameChannel`.
4. Untuk channel privat, gunakan ID numerik channel berformat `-100...`. Anda bisa memperoleh ID lewat alat/admin yang tepercaya; jangan memberikan token bot ke situs pihak ketiga.

## 3. Jalankan di server HTTPS

Diperlukan Node.js 20+ dan URL HTTPS publik. Untuk uji lokal, gunakan layanan tunnel HTTPS tepercaya atau deploy ke VPS/platform hosting yang mendukung Node.js.

```bash
npm install
cp .env.example .env
```

Edit `.env`:
- `BOT_TOKEN`: token dari BotFather
- `BOT_USERNAME`: username bot, tanpa `@`
- `WEB_APP_URL`: URL HTTPS publik aplikasi, tanpa garis miring di akhir
- `CHANNEL_ID`: `@username` channel publik atau ID numerik channel privat
- `WEBHOOK_SECRET`: string acak 16–256 karakter yang hanya berisi huruf, angka, `_`, `-`

Jangan bagikan file `.env`, jangan unggah ke Git, dan jangan masukkan token ke `public/index.html`.

Jalankan:

```bash
npm start
```

Pastikan `https://URL-ANDA/health` mengembalikan `{"ok":true}`.

## 4. Daftarkan webhook Telegram

Setelah server aktif dan URL HTTPS dapat diakses, buka terminal pada folder proyek lalu jalankan:

```bash
node setup-webhook.js
```

Script membaca konfigurasi dari `.env`, membuat kunci setup secara lokal, lalu meminta server mendaftarkan webhook. Token bot tidak dikirim ke browser dan tidak perlu ditempel ke situs lain. Simpan `.env` dengan aman.

Jika berhasil, hasilnya berisi `{"ok":true,...}`.

## 5. Hubungkan Mini App ke bot

1. Buka `@BotFather`, pilih bot Anda lalu **Bot Settings → Configure Mini App** (nama menu dapat berubah).
2. Atur URL Mini App menjadi `WEB_APP_URL`.
3. Buka bot Anda, tekan `/start`, lalu klik **Buka Mini App Video**.
4. Posting video baru di channel. Setelah beberapa saat, video akan muncul pada katalog.

## Troubleshooting

- **Video tidak muncul:** pastikan bot menjadi admin, `CHANNEL_ID` cocok, webhook sudah aktif, server tetap berjalan, dan postingan dibuat setelah webhook dipasang.
- **Aplikasi tidak bisa dibuka:** pastikan URL HTTPS benar dan dapat diakses publik.
- **Video privat tidak terbuka:** penonton harus bergabung dengan channel sumber.
- **Video lama:** Bot API tidak dapat mengambil riwayat lama. Posting ulang video yang berhak Anda bagikan, atau bangun proses impor terpisah menggunakan akun pemilik melalui MTProto dengan memperhatikan keamanan akun.
